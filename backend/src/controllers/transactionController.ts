import type { Request, Response } from "express";
import pool from "../db.js";
import { validate } from "../validation/validation.js";
import {
  transactionCreateSchema,
  transactionUpdateSchema,
} from "../validation/schemas.js";
import { analyzeTransactionList } from "../utils/gemini.js";

/**
 * List a user's transactions with filtering, search, and pagination.
 *
 * Builds the WHERE clause dynamically from the provided query params (date range,
 * category, type, free-text search across description/notes) so a single endpoint
 * powers list, filter, and search views. Parameter indexes are shifted as filters
 * are appended, and `limit`/`offset` are always bound last for safe pagination.
 * Transactions are joined to their category for display metadata.
 *
 * @param req - Express request. Query may include startDate, endDate, categoryId,
 *              type, search, limit, offset.
 * @param res - Express response.
 * @returns 200 with matching transaction rows, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
 */
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

/**
 * Create a transaction for the authenticated user.
 *
 * Validates the payload via `transactionCreateSchema` before insert; amounts and
 * types are enforced there so the DB only ever receives well-formed rows.
 *
 * @param req - Express request. Body must satisfy `transactionCreateSchema`.
 * @param res - Express response.
 * @returns 201 with the created transaction, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
 */
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

/**
 * Fetch a single transaction by id, including category metadata.
 *
 * Ownership is enforced by matching both `id` and `user_id`, so one user cannot
 * read another's transaction even with a guessed id.
 *
 * @param req - Express request. `id` path param.
 * @param res - Express response.
 * @returns 200 with the transaction, 404 if not found, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
 */
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

/**
 * Patch a transaction's fields.
 *
 * Validation runs first (and rejects unknown/empty bodies), then only the supplied
 * fields are added to the SET list via `COALESCE`, so partial updates never blank
 * unsent values. Ownership is enforced by the `user_id` clause.
 *
 * @param req - Express request. `id` path param; body must satisfy `transactionUpdateSchema`.
 * @param res - Express response.
 * @returns 200 with the updated transaction, 400 on empty update, 404 if not found,
 *          or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
 */
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

/**
 * Delete a transaction owned by the user.
 *
 * Uses `RETURNING id` and checks `rowCount` so a missing or non-owned row yields a
 * clean 404 instead of a false success.
 *
 * @param req - Express request. `id` path param.
 * @param res - Express response.
 * @returns 200 on success, 404 if not found, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
 */
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

/**
 * Analyze a subset of the user's transactions via AI.
 *
 * Validates that `transactionIds` is a non-empty array, caps it at 50 to bound
 * model cost, loads the matching transactions (joined to category), and forwards
 * them to `analyzeTransactionList`. Using `ANY($2::int[])` fetches all rows in one
 * query and keeps the lookup ownership-scoped by `user_id`.
 *
 * @param req - Express request. Body: `{ transactionIds: number[] }`.
 * @param res - Express response.
 * @returns 200 with the analysis, 400 on invalid input or no matching rows,
 *          or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
 */
export const analyzeTransactions = async (req: Request, res: Response) => {
  const { transactionIds } = req.body;

  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res
      .status(400)
      .json({ message: "transactionIds array is required" });
  }

  const ids = transactionIds.slice(0, 50);

  try {
    const result = await pool.query(
      `SELECT t.id, t.amount, t.type, t.description, t.transaction_date,
              c.name AS category_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1 AND t.id = ANY($2::int[])
       ORDER BY t.transaction_date DESC
      `,
      [req.userId, ids],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({message: "No transactions found for analysis"})
    }

    const userRes = await pool.query('SELECT currency FROM users WHERE id = $1', [req.userId])
    const currency = userRes.rows[0]?.currency || 'IDR'

    const analysis = await analyzeTransactionList({
      transactions: result.rows,
      currency,
    })

    res.status(200).json(analysis);
  } catch (error) {
    console.error("Analyze transactions error:", error);
    res.status(500).json({ error: "Failed to analyze transactions" });
  }
};