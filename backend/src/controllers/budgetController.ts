import type { Request, Response } from "express";
import pool from "../db.js";
import { validate } from "../validation/validation.js";
import {
  budgetCreateSchema,
  budgetUpdateSchema,
} from "../validation/schemas.js";

// Get
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

// Create
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

// Update
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
