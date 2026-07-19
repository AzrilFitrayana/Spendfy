import type { Request, Response } from "express";
import pool from "../db.js";

/**
 * Menghitung persentase perubahan antara dua periode.
 *
 * Mengembalikan 100 saat berpindah dari nol ke nilai非-nol (sinyal "baru" yang
 * bermakna) dan 0 saat keduanya nol, menghindari pembagian dengan nol serta
 * memberi UI dasar yang stabil untuk panah tren.
 *
 * @param current - Nilai periode saat ini.
 * @param previous - Nilai periode sebelumnya.
 * @returns Delta persen (dapat bernilai negatif).
 */
const pctChange = (current: number, previous: number): number => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

/**
 * Mengembalikan ringkasan keuangan pengguna untuk bulan ini dan bulan lalu.
 *
 * Menggunakan satu CTE yang mengelompokkan pemasukan/pengeluaran berdasarkan bulan,
 * lalu memutar bulan saat ini dan sebelumnya ke dalam satu baris via agregasi
 * kondisional. Menghitung kedua bulan dalam satu query (bukan dua kali bolak-balik)
 * menjaga endpoint tetap cepat. Field turunan `netRemaining` dan `savingsRate`
 * dihitung di kode aplikasi dari total mentah agar klien menerima angka siap tampil.
 *
 * @param req - Request Express. Membutuhkan `req.userId` dari middleware auth.
 * @param res - Response Express.
 * @returns 200 beserta total pemasukan/pengeluaran, netRemaining, savingsRate, dan
 *          delta bulan-ke-bulan, atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const getSummary = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `WITH monthly AS (
                SELECT
                    -- menjumlahkan total berdasarkan type dan tanggal 1 bulan tersebut
                    date_trunc('month', transaction_date) AS month, 
                    type,
                    SUM(amount) AS total
                FROM transactions
                WHERE user_id = $1
                    AND transaction_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                GROUP BY 1, 2
            )
            SELECT
                -- Jumlahkan semua total income pada bulan ini. Kalau tidak ada, isi dengan 0.
                COALESCE(SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE) AND type = 'income' THEN total END), 0) AS income_this_month,
                -- Jumlahkan semua total expense pada bulan ini. Kalau tidak ada, isi dengan 0.
                COALESCE(SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE) AND type = 'expense' THEN total END), 0) AS expense_this_month,
                -- Jumlahkan semua total income pada bulan lalu. Kalau tidak ada, isi dengan 0.
                COALESCE(SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND type = 'income' THEN total END), 0) AS income_last_month,
                -- Jumlahkan semua total expense pada bulan lalu. Kalau tidak ada, isi dengan 0.
                COALESCE(SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND type = 'expense' THEN total END), 0) AS expense_last_month
            FROM monthly`,
      [req.userId],
    );

    const row = result.rows[0];
    const incomeThisMonth = parseFloat(row.income_this_month);
    const expenseThisMonth = parseFloat(row.expense_this_month);
    const incomeLastMonth = parseFloat(row.income_last_month);
    const expenseLastMonth = parseFloat(row.expense_last_month);
    const netRemaining = incomeThisMonth - expenseThisMonth;
    const savingsRate =
      incomeThisMonth > 0 ? (netRemaining / incomeThisMonth) * 100 : 0;

    res.status(200).json({
      incomeThisMonth,
      expenseThisMonth,
      netRemaining,
      savingsRate,
      incomeDelta: pctChange(incomeThisMonth, incomeLastMonth),
      expenseDelta: pctChange(expenseThisMonth, expenseLastMonth),
    });
  } catch (error) {
    console.error("GetSummary error: ", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

/**
 * Mengembalikan total pengeluaran per kategori untuk bulan berjalan.
 *
 * Mengagregasi hanya transaksi `expense` sejak awal bulan ini dan menggabungkan
 * metadata kategori untuk tampilan. Mengurutkan berdasarkan total menurun agar
 * klien dapat menampilkan kategori pengeluaran terbesar lebih dulu tanpa pengurutan tambahan.
 *
 * @param req - Request Express. Membutuhkan `req.userId` dari middleware auth.
 * @param res - Response Express.
 * @returns 200 beserta baris per kategori (total, transaction_count, metadata), atau 500.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const getCategoryBreakdown = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
                c.id AS category_id,
                c.name AS category_name,
                c.icon AS category_icon,
                c.color AS category_color,
                SUM(t.amount) AS total,
                COUNT(t.id) AS transaction_count
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = $1
                AND t.type = 'expense'
                AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
            GROUP BY c.id
            ORDER BY total DESC`,
      [req.userId],
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("GetCategoryBreakDown error: ", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};

/**
 * Mengembalikan total pemasukan/pengeluaran bulanan untuk enam bulan terakhir.
 *
 * Memotong setiap tanggal transaksi ke bulannya dan menjumlahkan pemasukan/pengeluaran
 * per bulan, mencakup bulan berjalan plus lima bulan sebelumnya (via INTERVAL '5 month')
 * untuk memberi UI grafik tren lengkap. `to_char` menghasilkan kunci bucket "YYYY-MM" yang stabil.
 *
 * @param req - Request Express. Membutuhkan `req.userId` dari middleware auth.
 * @param res - Response Express.
 * @returns 200 beserta satu baris per bulan (month, income, expense), atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const getMonthlyTrend = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
                -- to_char untuk mengubah format menjadi string "2026-07"
                to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
            FROM transactions
            WHERE user_id = $1
                AND transaction_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 month'
            GROUP BY 1
            ORDER BY 1`,
      [req.userId],
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("GetMonthlyTrend error: ", error);
    res.status(500).json({ message: "Terjadi kesalahan pada server" });
  }
};