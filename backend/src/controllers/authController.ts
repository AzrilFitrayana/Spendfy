import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { defaultCategories } from "../utils/defaultCategories.js";
import type { Request, Response } from "express";
import { loginSchema, registerSchema } from "../validation/schemas.js";
import { validate } from "../validation/validation.js";

const signToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "7d" });
};

/**
 * Mendaftarkan pengguna baru dan membuat kategori default mereka.
 *
 * Memvalidasi payload yang masuk, menolak email yang sudah terdaftar, dan
 * membuat pengguna di dalam sebuah transaksi. Membuat `defaultCategories`
 * per pengguna (daripada mengandalkan baris yang dibagikan) menjaga kepemilikan
 * kategori tetap terbatas serta memungkinkan penghapusan kaskade yang aman
 * saat pengguna dihapus. JWT diterbitkan saat berhasil agar klien dapat
 * melakukan autentikasi langsung tanpa login terpisah.
 *
 * @param req - Request Express. Body harus memenuhi `registerSchema`.
 * @param res - Response Express.
 * @returns 201 beserta pengguna yang dibuat dan JWT yang ditandatangani, atau 400/500 saat gagal.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const register = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const {
      name,
      email,
      password,
      currency = "IDR",
    } = validate(registerSchema, req.body);

    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email sudah digunakan" });
    }

    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `
      INSERT INTO users (name, email, password, currency)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, currency, created_at
      `,
      [name, email, passwordHash, currency],
    );
    const user = userResult.rows[0];

    for (const item of defaultCategories) {
      await client.query(
        `INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES ($1, $2, $3, $4, $5, true)`,
        [user.id, item.name, item.type, item.icon, item.color],
      );
    }
    
    const token = signToken(user.id);

    await client.query("COMMIT");
    res.status(201).json({ user, token });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Registration error:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  } finally {
    client.release();
  }
};

/**
 * Mengautentikasi pengguna dan mengembalikan JWT yang ditandatangani.
 *
 * Memeriksa keberadaan email dan kecocokan hash password bcrypt, lalu menerbitkan
 * JWT 7 hari. Kredensial sengaja tidak dibedakan ("Kredensial tidak valid" untuk
 * kedua kasus) demi menghindari kebocoran apakah sebuah email terdaftar.
 *
 * @param req - Request Express. Body harus memenuhi `loginSchema`.
 * @param res - Response Express.
 * @returns 200 beserta pengguna (id, name, email, currency) dan JWT, atau 400/500.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = validate(loginSchema, req.body);

    const result = await pool.query(
      `SELECT id, name, email, password, currency FROM users WHERE email = $1
            `,
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Kredensial tidak valid" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Kredensial tidak valid" });
    }

    const token = signToken(user.id);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
      },
      token,
    });
  } catch (error) {
    console.error("Login error: ", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

/**
 * Mengambil profil pengguna yang terautentikasi.
 *
 * Membaca `userId` yang dilampirkan oleh middleware auth (bukan parameter path)
 * sehingga pengguna hanya dapat mengambil data dirinya sendiri. Membuat payload
 * response tetap minimal dengan mengecualikan hash password.
 *
 * @param req - Request Express. Membutuhkan `req.userId` dari middleware auth.
 * @param res - Response Express.
 * @returns 200 beserta baris pengguna, 404 jika tidak ditemukan, atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const getUser = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, currency, created_at FROM users WHERE id = $1`,
      [req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan" });
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};
