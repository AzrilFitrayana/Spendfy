import type { Request, Response } from "express";
import pool from "../db.js";
import { validate } from "../validation/validation.js";
import {
  categoryCreateSchema,
  categoryUpdateSchema,
} from "../validation/schemas.js";

// Get
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

// Create
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

// Update
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

// Delete
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
