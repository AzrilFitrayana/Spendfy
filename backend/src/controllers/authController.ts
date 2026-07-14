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

/**
 * Register a new user and seed their default categories.
 *
 * Validates the incoming payload, rejects duplicate emails, and creates the user
 * inside a transaction. Seeding `defaultCategories` per user (rather than relying
 * on shared rows) keeps category ownership scoped and enables safe cascade deletes
 * when a user is removed. A JWT is issued on success so the client can authenticate
 * immediately without a separate login.
 *
 * @param req - Express request. Body must satisfy `registerSchema`.
 * @param res - Express response.
 * @returns 201 with the created user and a signed JWT, or 400/500 on failure.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
 */
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

/**
 * Authenticate a user and return a signed JWT.
 *
 * Verifies the email exists and the bcrypt password hash matches, then issues a
 * 7-day JWT. Credentials are intentionally not differentiated ("Invalid
 * credentials" for both cases) to avoid leaking whether an email is registered.
 *
 * @param req - Express request. Body must satisfy `loginSchema`.
 * @param res - Express response.
 * @returns 200 with the user (id, name, email, currency) and a JWT, or 400/500.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
 */
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

/**
 * Fetch the authenticated user's profile.
 *
 * Reads the `userId` attached by the auth middleware (not a path param) so a user
 * can only retrieve their own record. Keeps the response payload minimal by
 * excluding the password hash.
 *
 * @param req - Express request. Requires `req.userId` from auth middleware.
 * @param res - Express response.
 * @returns 200 with the user row, 404 if missing, or 500 on error.
 * @throws Never propagates; errors are caught and mapped to a 500 response.
 */
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
