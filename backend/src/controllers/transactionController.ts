import type { Request, Response } from "express";
import pool from "../db.js";
import { validate } from "../validation/validation.js";
import {
  transactionCreateSchema,
  transactionUpdateSchema,
} from "../validation/schemas.js";

// Get
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      categoryId,
      type,
      search,
      limit = 50,
      offset = 0,
    } = req.query;

    const conditions = ["t.user_id = $1"];
    const values = [req.userId];
    let idx = 2;

    if (startDate) {
      conditions.push(`t.transaction_date >= $${idx++}`);
      values.push(startDate as string);
    }
    if (endDate) {
      conditions.push(`t.transaction_date <= $${idx++}`);
      values.push(endDate as string);
    }
    if (categoryId) {
      conditions.push(`t.category_id = $${idx++}`);
      values.push(categoryId as string);
    }
    if (type) {
      conditions.push(`t.type = $${idx++}`);
      values.push(type as string);
    }
    if (search) {
      conditions.push(`(t.description ILIKE $${idx} OR t.notes ILIKE $${idx})`);
      values.push(`%${search as string}%`);
      idx++;
    }

    values.push(limit as string, offset as string);

    const limitIdx = idx++;
    const offsetIdx = idx;
    const result = await pool.query(
      `SELECT t.*,
                c.name AS category_name,
                c.icon AS category_icon,
                c.color AS category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE ${conditions.join(" AND ")}
        ORDER BY t.transaction_date DESC, t.id DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
};

// Create
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { categoryId, amount, type, description, notes, transactionDate } =
      validate(transactionCreateSchema, req.body);

    const result = await pool.query(
      `INSERT INTO transactions (user_id, category_id, amount, type, description, notes, transaction_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
      [
        req.userId,
        categoryId,
        amount,
        type,
        description,
        notes,
        transactionDate,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Create transaction error:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
};

// Get ID
export const getTransactionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT t.*,
                c.name AS category_name,
                c.icon AS category_icon,
                c.color AS category_color
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.id = $1 AND t.user_id = $2`,
      [id, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Get transaction by ID error:", error);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
};

// Update
export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fields = validate(transactionUpdateSchema, req.body);

    const updates: string[] = [];
    const values: unknown[] = [req.userId, id];
    let idx = 3;

    if (fields.categoryId !== undefined) {
      updates.push(`category_id = $${idx++}`);
      values.push(fields.categoryId);
    }
    if (fields.amount !== undefined) {
      updates.push(`amount = $${idx++}`);
      values.push(fields.amount);
    }
    if (fields.type !== undefined) {
      updates.push(`type = $${idx++}`);
      values.push(fields.type);
    }
    if (fields.description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(fields.description);
    }
    if (fields.notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      values.push(fields.notes);
    }
    if (fields.transactionDate !== undefined) {
      updates.push(`transaction_date = $${idx++}`);
      values.push(fields.transactionDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const result = await pool.query(
      `UPDATE transactions
         SET ${updates.join(", ")}
         WHERE user_id = $1 AND id = $2
         RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Update transaction error:", error);
    res.status(500).json({ error: "Failed to update transaction" });
  }
};

// Delete
export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM transactions WHERE id = $1 and user_id = $2 RETURNING id`,
      [id, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.status(200).json({ message: "Transaction deleted" });
  } catch (error) {
    console.error("Delete transaction error: ", error);
    res.status(500).json({ message: "Server error" });
  }
};