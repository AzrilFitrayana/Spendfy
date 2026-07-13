import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";
import { defaultCategories } from "../utils/defaultCategories.js";
import type { Request, Response } from "express";
import { loginSchema, registerSchema } from "../validation/schemas.js";
import { validate } from "../validation/validation.js";

const signToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "7d" });
};

// Register
export const register = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const {
      name,
      email,
      password,
      currency = "IDR",
    } = validate(registerSchema, req.body);

    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `
      INSERT INTO users (name, email, password, currency)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, currency, created_at
      `,
      [name, email, passwordHash, currency],
    );
    const user = userResult.rows[0];

    for (const item of defaultCategories) {
      await client.query(
        `INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES ($1, $2, $3, $4, $5, true)`,
        [user.id, item.name, item.type, item.icon, item.color],
      );
    }

    await client.query("COMMIT");

    const token = signToken(user.id);
    res.status(201).json({ user, token });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = validate(loginSchema, req.body);

    const result = await pool.query(
      `SELECT id, name, email, password, currency FROM users WHERE email = $1
            `,
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = signToken(user.id);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency,
      },
      token,
    });
  } catch (error) {
    console.error("Login error: ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get Data
export const getUser = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, currency, created_at FROM users WHERE id = $1`,
      [req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
