import type { Request, Response } from "express";
import pool from "../db.js";
import { validate } from "../validation/validation.js";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
} from "../validation/schemas.js";

/**
 * List a user's categories ordered for display.
 *
 * Returns both income and expense categories ordered by type then name, so the
 * client can group them without further sorting. Scoped strictly by `user_id`.
 *
 * @param req - Express request. Requires `req.userId` from auth middleware.
 * @param res - Express response.
 * @returns 201 with category rows, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
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
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Create a custom (non-default) category for the user.
 *
 * The unique (user_id, name, type) constraint blocks duplicate names of the same
 * type; the caught 23505 error is surfaced as a 400. `is_default` is always false
 * here because seeded defaults are created elsewhere (registration).
 *
 * @param req - Express request. Body must satisfy `categoryCreateSchema`.
 * @param res - Express response.
 * @returns 201 with the created category, 400 on duplicate, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
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
        .json({ message: "Category with this name already exists" });
    }
    console.error("Create categories error: ", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update a category's name, icon, or color.
 *
 * Uses `COALESCE` per field so callers may patch a subset of attributes without
 * nulling the others. Ownership is enforced via the `user_id` clause.
 *
 * @param req - Express request. `id` path param; body must satisfy `categoryUpdateSchema`.
 * @param res - Express response.
 * @returns 200 with the updated category, 404 if not found, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
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
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Create categories error: ", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Delete a category owned by the user.
 *
 * Transactions referencing this category are kept (their `category_id` is set to
 * NULL via the FK `ON DELETE SET NULL`), preserving history while removing the
 * category from active selection.
 *
 * @param req - Express request. `id` path param.
 * @param res - Express response.
 * @returns 200 on success, 404 if not found, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
 */
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM categories WHERE id = $1 and user_id = $2 RETURNING id`,
      [id, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted" });
  } catch (error) {
    console.error("Delete categories error: ", error);
    res.status(500).json({ message: "Server error" });
  }
};
