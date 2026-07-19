import type { Request, Response } from "express";
import pool from "../db.js";
import { validate } from "../validation/validation.js";
import {
  budgetCreateSchema,
  budgetUpdateSchema,
} from "../validation/schemas.js";
import { analyzeBudgetList } from "../utils/gemini.js";

/**
 * Menampilkan daftar anggaran pengguna beserta total pengeluaran dan metadata kategori.
 *
 * Menggabungkan setiap anggaran ke kategorinya dan mengagregasi transaksi pengeluaran
 * yang cocok dalam jendela periode saat ini (bulan-ke-tanggal atau minggu-ke-tanggal,
 * tergantung `period`). Menyaring gabungan transaksi berdasarkan periode di SQL
 * (bukan di kode aplikasi) menghindari pemuatan seluruh transaksi dan menjaga
 * response tetap akurat seiring berjalannya waktu.
 *
 * @param req - Request Express. Membutuhkan `req.userId` dari middleware auth.
 * @param res - Response Express.
 * @returns 200 beserta baris anggaran (termasuk `spent`, nama/icon/warna kategori),
 *          atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const getBudgets = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
                b.id,
                b.category_id,
                b.amount,
                b.period,
                b.start_date,
                c.name AS category_name,
                c.icon AS category_icon,
                c.color AS category_color,
                COALESCE(SUM(t.amount), 0) AS spent
            FROM budgets b
            JOIN categories c ON c.id = b.category_id
            LEFT JOIN transactions t
                ON t.category_id = b.category_id
                AND t.user_id = b.user_id
                AND t.type = 'expense'
                AND (
                    (b.period = 'monthly' AND t.transaction_date >= date_trunc('month', CURRENT_DATE))
                    OR (b.period = 'weekly' AND t.transaction_date >= date_trunc('week', CURRENT_DATE))
                )
            WHERE b.user_id = $1
            GROUP BY b.id, c.name, c.icon, c.color
            ORDER BY c.name`,
      [req.userId],
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get budget error: ", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

/**
 * Membuat anggaran untuk sebuah kategori.
 *
 * Mengisi tanggal mulai dengan awal bulan berjalan saat tidak diberikan, agar
 * anggaran berskop bulan selaras dengan jendela periode yang dipakai untuk
 * perhitungan pengeluaran. Constraint unik pada (user_id, category_id, period)
 * mencegah anggaran ganda untuk kategori/periode yang sama; error 23505 yang
 * ditangkap disajikan sebagai 400 yang ramah.
 *
 * @param req - Request Express. Body harus memenuhi `budgetCreateSchema`.
 * @param res - Response Express.
 * @returns 201 beserta anggaran yang dibuat, 400 saat duplikat, atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const createBudget = async (req: Request, res: Response) => {
  try {
    const {
      categoryId,
      amount,
      period = "monthly",
      startDate,
    } = validate(budgetCreateSchema, req.body);

    const today = new Date();
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const effectiveStart = startDate || monthStart;

    const result = await pool.query(
      `INSERT INTO budgets (user_id, category_id, amount, period, start_date)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, category_id, amount, period, start_date`,
      [req.userId, categoryId, amount, period, effectiveStart],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if ((error as any).code === "23505") {
      return res.status(400).json({ message: "Anggaran sudah ada" });
    }
    console.error("Create budget error: ", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

/**
 * Memperbarui jumlah dan/atau periode anggaran.
 *
 * Menggunakan `COALESCE($1, amount)` agar pemanggil dapat memperbarui satu field
 * tanpa menghapus field lainnya; hanya nilai yang diberikan yang diterapkan.
 * Kepemilikan ditegakkan melalui klausa `user_id`.
 *
 * @param req - Request Express. Parameter path `id`; body harus memenuhi `budgetUpdateSchema`.
 * @param res - Response Express.
 * @returns 200 beserta anggaran yang diperbarui, 404 jika tidak ditemukan, atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const updateBudget = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, period } = validate(budgetUpdateSchema, req.body);

    const result = await pool.query(
      `UPDATE budgets
            SET amount = COALESCE($1, amount),
                period = COALESCE($2, period)
            WHERE id = $3 AND user_id = $4
            RETURNING *`,
      [amount, period, id, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Anggaran tidak ditemukan" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Update budget error:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

/**
 * Menghapus anggaran milik pengguna.
 *
 * @param req - Request Express. Parameter path `id`.
 * @param res - Response Express.
 * @returns 200 saat berhasil, 404 jika anggaran tidak ada atau bukan milik
 *          pengguna, atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const deleteBudget = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM budgets WHERE id = $1 AND user_id = $2`,
      [id, req.userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Anggaran tidak ditemukan" });
    }

    res.status(200).json({ message: "Anggaran berhasil dihapus" });
  } catch (error) {
    console.error("Delete budget error:", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

/**
 * Menghasilkan analisis AI untuk seluruh anggaran pengguna.
 *
 * Menggunakan kembali agregasi pengeluaran/periode yang sama seperti `getBudgets`,
 * lalu meneruskan hasilnya ke `analyzeBudgetList` yang mengklasifikasikan kesehatan
 * tiap anggaran. Mengembalikan array `analyses` kosong (bukan error) saat tidak ada
 * anggaran agar jalur render klien tetap sederhana.
 *
 * @param req - Request Express. Membutuhkan `req.userId` dari middleware auth.
 * @param res - Response Express.
 * @returns 200 beserta `{ analyses: [...] }`, atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const analyzeBudgets = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
        b.id,
        b.amount,
        b.period,
        c.name AS category_name,
        COALESCE(SUM(t.amount), 0) AS spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t
        ON t.category_id = b.category_id
        AND t.user_id = b.user_id
        AND t.type = 'expense'
        AND (
          (b.period = 'monthly' AND t.transaction_date >= date_trunc('month', CURRENT_DATE))
          OR (b.period = 'weekly' AND t.transaction_date >= date_trunc('week', CURRENT_DATE))
        )
       WHERE b.user_id = $1
       GROUP BY b.id, c.name`,
      [req.userId],
    );

    if (result.rows.length === 0) {
      return res.json({ analyses: [] });
    }

    const userRes = await pool.query(
      `SELECT currency FROM users WHERE id = $1`,
      [req.userId],
    );
    const currency = userRes.rows[0]?.currency || "IDR";

    const data = await analyzeBudgetList({
      budgets: result.rows,
      currency,
    });

    return res.status(200).json(data);
  } catch (error) {
    console.error("Analyze budgets error: ", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};
