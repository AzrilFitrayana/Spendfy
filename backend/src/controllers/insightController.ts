import {
  generateMonthlyInsight,
  generateWeeklyInsight,
  generateBudgetAlert,
  generateSavingsTips,
} from "../utils/gemini.js";
import pool from "../db.js";
import type { Request, Response } from "express";

interface MonthlyBreakdownRow {
  category: string;
  amount: string;
}

interface MonthlyTrendRow {
  month: string;
  income: string;
  expense: string;
}

interface MonthlyInsightRow {
  income: string | null;
  expense: string | null;
  breakdown: MonthlyBreakdownRow[] | null;
  trend: MonthlyTrendRow[] | null;
}

interface WeeklyBreakdownRow {
  category: string;
  amount: string;
}

interface WeeklyTrendRow {
  week: string;
  income: string;
  expense: string;
}

interface WeeklyInsightRow {
  income: string | null;
  expense: string | null;
  breakdown: WeeklyBreakdownRow[] | null;
  trend: WeeklyTrendRow[] | null;
  period_start: string;
  period_end: string;
}

interface TopCategoryRow {
  category: string;
  amount: string;
  count: string;
}

interface BudgetAlertRow {
  [key: string]: unknown;
  amount: string;
  spent: string;
  category_name: string;
}

/**
 * Mencari mata uang tampilan pengguna yang terautentikasi.
 *
 * Memusatkan penyelesaian mata uang agar semua pembangun insight mengembalikan
 * jumlah dalam kode ISO pilihan pengguna. Fallback ke "IDR" saat tidak diatur
 * agar prompt downstream tetap memformat dengan wajar.
 *
 * @param userId - Id pengguna terautentikasi.
 * @returns Kode mata uang pengguna, atau "IDR" sebagai fallback.
 */
const getUserCurrency = async (userId: string | undefined): Promise<string> => {
  const result = await pool.query("SELECT currency FROM users WHERE id = $1", [
    userId,
  ]);
  return result.rows[0]?.currency || "IDR";
};

/**
 * Menampilkan insight AI yang tersimpan milik pengguna, yang terbaru lebih dulu.
 *
 * Membaca dari `ai_insights` (tabel yang dibuat via migrasi) agar klien dapat
 * menampilkan insight yang pernah dihasilkan tanpa memanggil model ulang. Dibatasi
 * 50 baris untuk membatasi ukuran payload pada tampilan riwayat.
 *
 * @param req - Request Express. Membutuhkan `req.userId` dari middleware auth.
 * @param res - Response Express.
 * @returns 200 beserta baris insight, atau 500 saat error.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const getInsigths = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ai_insights WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.userId],
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching insights:", error);
    res.status(500).json({ message: "Gagal mengambil insight" });
  }
};

/**
 * Membangun payload data untuk insight ringkasan bulanan.
 *
 * Menjalankan tiga CTE dalam satu query (total bulan ini, rincian kategori bulan
 * ini, dan tren tiga bulan sebelumnya), lalu meminta Gemini menghasilkan insight.
 * Mengagregasi di SQL menjaga prompt tetap ringkas; awal/akhir periode diturunkan
 * dari bulan berjalan agar insight yang disimpan dapat dikelompokkan per bulan nanti.
 *
 * @param userId - Id pengguna terautentikasi.
 * @returns Konten insight yang dihasilkan beserta string `periodStart`/`periodEnd`.
 * @throws Error jika tidak ada data bulanan atau pemanggilan model gagal.
 */
const buildMonthlyInsight = async (userId: string | undefined) => {
  const data = await pool.query<MonthlyInsightRow>(
    `
        WITH current_month AS (
            SELECT
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
            FROM transactions
            WHERE user_id = $1
                AND transaction_date >= date_trunc('month', CURRENT_DATE)
        ),
        breakdown AS (
            SELECT c.name AS category, SUM(t.amount) AS amount
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = $1
                AND t.type = 'expense'
                AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
            GROUP BY c.name
            ORDER BY amount DESC
        ),
        trend AS (
            SELECT
                to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
            FROM transactions
            WHERE user_id = $1
                AND transaction_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '3 months'
                AND transaction_date < date_trunc('month', CURRENT_DATE)
            GROUP BY 1
            ORDER BY 1
        )
        SELECT
            (SELECT income FROM current_month) AS income,
            (SELECT expense FROM current_month) AS expense,
            (SELECT json_agg(breakdown) FROM breakdown) AS breakdown,
            (SELECT json_agg(trend) FROM trend) AS trend`,
    [userId],
  );

  const row = data.rows[0];
  if (!row) {
    throw new Error("Tidak ada data insight bulanan yang tersedia");
  }
  const totalIncome = parseFloat(row.income || "0");
  const totalExpense = parseFloat(row.expense || "0");
  const savingsRate =
    totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  const currency = await getUserCurrency(userId);

  const content = await generateMonthlyInsight({
    totalIncome,
    totalExpense,
    savingsRate,
    expenseBreakdown: (row.breakdown || []).map((b) => ({
      category: b.category,
      amount: parseFloat(b.amount),
    })),
    previousMonths: (row.trend || []).map((t) => ({
      month: t.month,
      income: parseFloat(t.income),
      expense: parseFloat(t.expense),
    })),
    currency,
  });

  const now = new Date();
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

  return { content, periodStart, periodEnd };
};


/**
 * Membangun payload data untuk insight ringkasan mingguan.
 *
 * Menjalankan tiga CTE dalam satu query (total minggu ini, rincian kategori minggu
 * ini, dan tren empat minggu sebelumnya), lalu meminta Gemini menghasilkan insight.
 * Batas periode (`period_start`, `period_end`) diturunkan langsung di SQL via
 * `date_trunc('week', CURRENT_DATE)` sehingga tidak perlu aritmatika tanggal di JS.
 * Hasil disimpan di `ai_insights` oleh pemanggil (`generateInsight`).
 *
 * @param userId - Id pengguna terautentikasi.
 * @returns Konten insight yang dihasilkan beserta string `periodStart`/`periodEnd`.
 * @throws Error jika tidak ada data mingguan atau pemanggilan Gemini gagal.
 */
export const buildWeeklyInsight = async (userId: string | undefined) => {
  const data = await pool.query<WeeklyInsightRow>(
    `
    WITH current_week AS (
        SELECT
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
        FROM transactions
        WHERE user_id = $1
            AND transaction_date >= date_trunc('week', CURRENT_DATE)
    ),
    breakdown AS (
        SELECT
            c.name AS category,
            SUM(t.amount) AS amount
        FROM transactions t
        JOIN categories c ON c.id = t.category_id
        WHERE t.user_id = $1
            AND t.type = 'expense'
            AND t.transaction_date >= date_trunc('week', CURRENT_DATE)
        GROUP BY c.name
        ORDER BY amount DESC
    ),
    trend AS (
        SELECT
            to_char(date_trunc('week', transaction_date), 'IYYY-IW') AS week,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
        FROM transactions
        WHERE user_id = $1
            AND transaction_date >= date_trunc('week', CURRENT_DATE) - INTERVAL '1 month'
            AND transaction_date < date_trunc('week', CURRENT_DATE)
        GROUP BY 1
        ORDER BY 1
    )
    SELECT
        (SELECT income FROM current_week) AS income,
        (SELECT expense FROM current_week) AS expense,
        COALESCE((SELECT json_agg(breakdown) FROM breakdown), '[]') AS breakdown,
        (SELECT json_agg(trend) FROM trend) AS trend,
        to_char(date_trunc('week', CURRENT_DATE), 'YYYY-MM-DD') AS period_start,
        to_char(date_trunc('week', CURRENT_DATE) + INTERVAL '6 days', 'YYYY-MM-DD') AS period_end
    `,
    [userId],
  );

  const row = data.rows[0];
  if (!row) {
    throw new Error("Tidak ada data insight mingguan yang tersedia");
  }

  const totalIncome = parseFloat(row.income || "0");
  const totalExpense = parseFloat(row.expense || "0");
  const currency = await getUserCurrency(userId);

  const content = await generateWeeklyInsight({
    totalIncome,
    totalExpense,
    expenseBreakdown: (row.breakdown || []).map((b) => ({
      category: b.category,
      amount: parseFloat(b.amount),
    })),
    previousWeeks: (row.trend || []).map((t) => ({
      week: t.week,
      income: parseFloat(t.income),
      expense: parseFloat(t.expense),
    })),
    currency,
  });

  return { content, periodStart: row.period_start, periodEnd: row.period_end };
};

/**
 * Membangun payload data untuk tips menabung.
 *
 * Mencari lima kategori pengeluaran teratas pengguna selama 30 hari terakhir dan
 * pemasukan 30 hari terakhir mereka, lalu meminta Gemini untuk tips. Jendela 30 hari
 * (bukan bulan kalender) membuat tips terasa aktual terlepas dari kapan pengguna bertanya.
 *
 * @param userId - Id pengguna terautentikasi.
 * @returns Konten tips yang dihasilkan beserta batas periode null (selalu terkini).
 * @throws Error jika pemanggilan model gagal.
 */
const buildSavingsTips = async (userId: string | undefined) => {
  const top = await pool.query<TopCategoryRow>(
    `SELECT 
            c.name AS category,
            SUM(t.amount) AS amount,
            COUNT(t.id) AS count
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = $1
            AND t.type = 'expense'
            AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY c.name
         ORDER BY amount DESC
         LIMIT 5
         `,
    [userId],
  );

  const incomeResult = await pool.query<{ income: string }>(
    `SELECT COALESCE(SUM(amount), 0) AS income
         FROM transactions
         WHERE user_id = $1
            AND type = 'income'
            AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'`,
    [userId],
  );

  const currency = await getUserCurrency(userId);

  const content = await generateSavingsTips({
    topCategories: top.rows.map((r) => ({
      category: r.category,
      amount: parseFloat(r.amount),
      transactionCount: parseInt(r.count, 10),
    })),
    monthlyIncome: parseFloat(incomeResult.rows[0]?.income ?? "0"),
    currency,
  });

  return { content, periodStart: null, periodEnd: null };
};

/**
 * Membangun payload data untuk peringatan anggaran kategori tunggal.
 *
 * Memuat anggaran dan pengeluaran bulan-ke-tanggalnya (dihitung di SQL) untuk kategori
 * yang diminta, lalu meminta Gemini untuk peringatan. Mengharuskan `categoryId` agar
 * peringatan tetap terbatas; jika anggaran hilang, error jelas dilemparkan agar
 * pemanggil mengembalikan 500 daripada menyimpan insight rusak.
 *
 * @param userId - Id pengguna terautentikasi.
 * @param categoryId - Kategori yang anggarannya akan diperingatkan.
 * @returns Konten peringatan yang dihasilkan beserta batas periode null.
 * @throws Error jika `categoryId` kosong, anggaran tidak ditemukan, atau pemanggilan
 *         model gagal.
 */
const buildBudgetAlert = async (
  userId: string | undefined,
  categoryId: string | undefined,
) => {
  if (!categoryId) {
    throw new Error("ID kategori wajib diisi");
  }

  const budgetRow = await pool.query<BudgetAlertRow>(
    `SELECT 
            b.*, 
            c.name AS category_name,
            COALESCE((
                SELECT SUM(amount) FROM transactions
                WHERE user_id = b.user_id
                    AND category_id = b.category_id
                    AND type = 'expense'
                    AND transaction_date >= date_trunc('month', CURRENT_DATE)
                ), 0) AS spent
        FROM budgets b
        JOIN categories c ON c.id = b.category_id
        WHERE b.user_id = $1 AND b.category_id = $2`,
    [userId, categoryId],
  );

  if (budgetRow.rows.length === 0) {
    throw new Error("Anggaran tidak ditemukan untuk kategori");
  }

  const b = budgetRow.rows[0];
  if (!b) {
    throw new Error("Anggaran tidak ditemukan untuk kategori");
  }

  const now = new Date();
  const daysIntoPeriod = now.getDate();
  const totalPeriodDays = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  const currency = await getUserCurrency(userId);

  const content = await generateBudgetAlert({
    categoryName: b.category_name,
    budgetAmount: parseFloat(b.amount),
    spentAmount: parseFloat(b.spent),
    daysIntoPeriod,
    totalPeriodDays,
    currency,
  });

  return { content, periodStart: null, periodEnd: null };
};

/**
 * Menghasilkan dan menyimpan insight AI berdasarkan tipe tertentu.
 *
 * Mengarahkan pada field body `type` ke pembangun yang sesuai (`monthly_summary`,
 * `savings_tips`, atau `budget_alert`), meminta model untuk konten, dan menyimpan
 * hasilnya di `ai_insights` agar dapat disajikan ulang tanpa memanggil Gemini lagi.
 * `content_json` yang dihasilkan disimpan apa adanya; menyimpan JSON mentah menghindari
 * penguraian ulang dan memungkinkan klien merender kartu insight terstruktur secara langsung.
 *
 * @param req - Request Express. Body: `{ type, categoryId? }`.
 * @param res - Response Express.
 * @returns 201 beserta baris insight yang disimpan, 400 saat tipe tidak valid/kosong atau
 *          categoryId kosong untuk peringatan anggaran, atau 500 saat error generasi/penyimpanan.
 * @throws Tidak pernah disebarkan; error ditangkap dan dipetakan ke response 500.
 */
export const generateInsight = async (req: Request, res: Response) => {
  const { type, categoryId } = req.body;

  if (!type) {
    return res.status(400).json({ message: "Tipe insight wajib diisi" });
  }

  try {
    let result;

    if (type === "monthly_summary") {
      result = await buildMonthlyInsight(req.userId);
    } else if (type === "savings_tips") {
      result = await buildSavingsTips(req.userId);
    } else if (type === "budget_alert") {
      result = await buildBudgetAlert(req.userId, categoryId);
    } else if(type === 'weekly_summary') {
      result = await buildWeeklyInsight(req.userId);
    } else{
      return res.status(400).json({ message: "Tipe insight tidak dikenal" });
    }

    const inserted = await pool.query(
      `INSERT INTO ai_insights (user_id, insight_type, period_start, period_end, content_json)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
      [req.userId, type, result.periodStart, result.periodEnd, result.content],
    );

    res.status(201).json(inserted.rows[0]);
  } catch (error) {
    console.error("Error generating insight:", error);
    res.status(500).json({ message: "Gagal menghasilkan insight" });
  }
};
