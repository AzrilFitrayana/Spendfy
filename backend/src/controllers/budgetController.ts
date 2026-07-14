import type { Request, Response } from "express";
import pool from "../db.js";
import { validate } from "../validation/validation.js";
import {
  budgetCreateSchema,
  budgetUpdateSchema,
} from "../validation/schemas.js";
import { analyzeBudgetList } from "../utils/gemini.js";

/**
 * List a user's budgets with live spent totals and category metadata.
 *
 * Joins each budget to its category and aggregates matching expense transactions
 * within the current period window (month-to-date or week-to-date, depending on
 * `period`). Filtering the transaction join by period in SQL (rather than in
 * application code) avoids loading every transaction and keeps the response
 * accurate as time advances.
 *
 * @param req - Express request. Requires `req.userId` from auth middleware.
 * @param res - Express response.
 * @returns 200 with budget rows (including `spent`, category name/icon/color),
 *          or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
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
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Create a budget for a category.
 *
 * Defaults the start date to the first of the current month when not supplied, so
 * month-scoped budgets align with the period window used for spent calculations.
 * The unique constraint on (user_id, category_id, period) prevents duplicate
 * budgets for the same category/period; the caught 23505 error is surfaced as a
 * friendly 400.
 *
 * @param req - Express request. Body must satisfy `budgetCreateSchema`.
 * @param res - Express response.
 * @returns 201 with the created budget, 400 on duplicate, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
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
      return res.status(400).json({ message: "Budget already exists" });
    }
    console.error("Create budget error: ", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update a budget's amount and/or period.
 *
 * Uses `COALESCE($1, amount)` so callers may update a single field without
 * clearing the other; only provided values are applied. Ownership is enforced via
 * the `user_id` clause.
 *
 * @param req - Express request. `id` path param; body must satisfy `budgetUpdateSchema`.
 * @param res - Express response.
 * @returns 200 with the updated budget, 404 if not found, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
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
      return res.status(404).json({ message: "Budget not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Update budget error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Delete a budget owned by the user.
 *
 * @param req - Express request. `id` path param.
 * @param res - Express response.
 * @returns 200 on success, 404 if the budget doesn't exist or isn't owned by the
 *          user, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
 */
export const deleteBudget = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM budgets WHERE id = $1 AND user_id = $2`,
      [id, req.userId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Budget not found" });
    }

    res.status(200).json({ message: "Budget deleted successfully" });
  } catch (error) {
    console.error("Delete budget error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Generate AI analyses for all of a user's budgets.
 *
 * Reuses the same spent/period aggregation as `getBudgets`, then forwards the
 * result to `analyzeBudgetList`, which classifies each budget's health. Returning
 * an empty `analyses` array (instead of an error) when no budgets exist keeps the
 * client render path simple.
 *
 * @param req - Express request. Requires `req.userId` from auth middleware.
 * @param res - Express response.
 * @returns 200 with `{ analyses: [...] }`, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
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
    res.status(500).json({ message: "Server error" });
  }
};
