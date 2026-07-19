import type { Request, Response } from "express";
import pool from "../db.js";
import { validate } from "../validation/validation.js";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
} from "../validation/schemas.js";

/**
 * Menampilkan daftar kategori pengguna yang diurutkan untuk tampilan.
 *
 * Mengembalikan kategori pemasukan dan pengeluaran yang diurutkan berdasarkan
 * tipe lalu nama, agar klien dapat mengelompokkannya tanpa pengurutan lanjutan.
 * Dibatasi secara ketat oleh `user_id`.
 *
 * @param req - Request Express. Membutuhkan `req.userId` dari middleware auth.
 * @param res - Response Express.
 * @returns 201 beserta baris kategori, atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM categories WHERE user_id = $1 ORDER BY type, name`,
      [req.userId],
    );

    res.status(201).json(result.rows);
  } catch (error) {
    console.error("Get categories error: ", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

/**
 * Membuat kategori kustom (bukan default) untuk pengguna.
 *
 * Constraint unik (user_id, name, type) memblokir nama duplikat dengan tipe yang
 * sama; error 23505 yang ditangkap disajikan sebagai 400. `is_default` selalu false
 * di sini karena default yang ditanam dibuat di tempat lain (saat registrasi).
 *
 * @param req - Request Express. Body harus memenuhi `categoryCreateSchema`.
 * @param res - Response Express.
 * @returns 201 beserta kategori yang dibuat, 400 saat duplikat, atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, type, icon, color } = validate(
      categoryCreateSchema,
      req.body,
    );

    const result = await pool.query(
      `INSERT INTO categories (user_id, name, type, icon, color, is_default) 
        VALUES ($1, $2, $3, $4, $5, false)
        RETURNING *`,
      [req.userId, name, type, icon || null, color || null],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if ((error as any).code === "23505") {
      return res
        .status(400)
        .json({ message: "Kategori dengan nama ini sudah ada" });
    }
    console.error("Create categories error: ", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

/**
 * Memperbarui nama, ikon, atau warna kategori.
 *
 * Menggunakan `COALESCE` per field agar pemanggil dapat menambal sebagian atribut
 * tanpa mengosongkan yang lain. Kepemilikan ditegakkan melalui klausa `user_id`.
 *
 * @param req - Request Express. Parameter path `id`; body harus memenuhi `categoryUpdateSchema`.
 * @param res - Response Express.
 * @returns 200 beserta kategori yang diperbarui, 404 jika tidak ditemukan, atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, icon, color } = validate(categoryUpdateSchema, req.body);

    const result = await pool.query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           icon = COALESCE($2, icon),
           color = COALESCE($3, color)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name, icon, color, id, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Create categories error: ", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

/**
 * Menghapus kategori milik pengguna.
 *
 * Transaksi yang merujuk kategori ini dipertahankan (`category_id`-nya diatur ke
 * NULL melalui FK `ON DELETE SET NULL`), memelihara riwayat sekaligus menghapus
 * kategori dari pilihan aktif.
 *
 * @param req - Request Express. Parameter path `id`.
 * @param res - Response Express.
 * @returns 200 saat berhasil, 404 jika tidak ditemukan, atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM categories WHERE id = $1 and user_id = $2 RETURNING id`,
      [id, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }

    res.status(200).json({ message: "Kategori berhasil dihapus" });
  } catch (error) {
    console.error("Delete categories error: ", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};
