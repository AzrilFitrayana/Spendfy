import type { Request, Response } from "express";
import pool from "../db.js";

const pctChange = (current: number, previous: number): number => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

// Summary
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
    const balance = incomeThisMonth - expenseThisMonth;
    const savingsRate =
      incomeThisMonth > 0 ? (balance / incomeThisMonth) * 100 : 0;

    res.status(200).json({
      incomeThisMonth,
      expenseThisMonth,
      balance,
      savingsRate,
      incomeDelta: pctChange(incomeThisMonth, incomeLastMonth),
      expenseDelta: pctChange(expenseThisMonth, expenseLastMonth),
    });
  } catch (error) {
    console.error("GetSummary error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get category breakdown
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
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get Monthly Trend
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
    res.status(500).json({ message: "Internal server error" });
  }
};
