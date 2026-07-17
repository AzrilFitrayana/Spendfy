import type { Request, Response } from "express";
import pool from "../db.js";

/**
 * Compute percentage change between two periods.
 *
 * Returns 100 when moving from zero to a non-zero value (a meaningful "new"
 * signal) and 0 when both are zero, avoiding divide-by-zero and giving the UI a
 * stable basis for trend arrows.
 *
 * @param current - Current period value.
 * @param previous - Previous period value.
 * @returns Percentage delta (can be negative).
 */
const pctChange = (current: number, previous: number): number => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

/**
 * Return the user's financial summary for the current and previous month.
 *
 * Uses a single CTE that buckets income/expense by month, then pivots the current
 * and prior month into one row via conditional aggregation. Computing both months
 * in one query (rather than two round-trips) keeps the endpoint fast. Derived
 * fields `netRemaining` and `savingsRate` are calculated in app code from the raw
 * totals so the client receives ready-to-render numbers.
 *
 * @param req - Express request. Requires `req.userId` from auth middleware.
 * @param res - Express response.
 * @returns 200 with income/expense totals, netRemaining, savingsRate, and month-over-month
 *          deltas, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
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
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Return expense totals per category for the current month.
 *
 * Aggregates only `expense` transactions since the current month start and joins
 * category metadata for display. Ordering by total descending lets the client
 * render the biggest spend categories first without additional sorting.
 *
 * @param req - Express request. Requires `req.userId` from auth middleware.
 * @param res - Express response.
 * @returns 200 with per-category rows (total, transaction_count, metadata), or 500.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
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
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Return monthly income/expense totals for the last six months.
 *
 * Truncates each transaction date to its month and sums income/expense per month,
 * covering the current month plus the five prior (via INTERVAL '5 month') to give
 * the UI a full trend chart. `to_char` produces stable "YYYY-MM" bucket keys.
 *
 * @param req - Express request. Requires `req.userId` from auth middleware.
 * @param res - Express response.
 * @returns 200 with one row per month (month, income, expense), or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
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
    res.status(500).json({ message: "Internal server error" });
  }
};