import { z } from "zod";

// User Registration Schema
export const registerSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email must be at most 255 characters"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(255),
  currency: z
    .string()
    .length(3, "Currency must be exactly 3 characters (e.g. IDR, USD)")
    .default("IDR"),
});

// User Login Schema
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Transaction Creation Schema
export const transactionCreateSchema = z.object({
  categoryId: z.number().int("Category ID must be an integer"),
  amount: z.number().positive("Amount must be a positive number"),
  type: z.enum(["income", "expense"], {
    message: "Type must be income or expense",
  }),
  description: z
    .string()
    .max(255, "Description must be at most 255 characters")
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
  transactionDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Transaction date must be in YYYY-MM-DD format",
    ),
});

// Transaction Update Schema (all fields optional for partial update)
export const transactionUpdateSchema = z.object({
  categoryId: z.number().int("Category ID must be an integer").optional(),
  amount: z.number().positive("Amount must be a positive number").optional(),
  type: z
    .enum(["income", "expense"], {
      message: "Type must be income or expense",
    })
    .optional(),
  description: z
    .string()
    .max(255, "Description must be at most 255 characters")
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
  transactionDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Transaction date must be in YYYY-MM-DD format",
    )
    .optional(),
});

// Budget Creation & Update Schema
export const budgetSchema = z.object({
  category_id: z.number().int("Category ID must be an integer"),
  amount: z.number().positive("Amount must be a positive number"),
  period: z.enum(["monthly", "weekly"]).default("monthly"),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
});

// Category Create Schema
export const categoryCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Category name must be at most 50 characters"),
  type: z.enum(["income", "expense"], {
    message: "Type must be income or expense",
  }),
  icon: z
    .string()
    .max(50, "Icon must be at most 50 characters")
    .optional()
    .nullable(),
  color: z
    .string()
    .max(7, "Color must be at most 7 characters")
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color code (e.g. #FF5733)")
    .optional()
    .nullable(),
});

// Category Update Schema
export const categoryUpdateSchema = categoryCreateSchema.omit({ type: true });

// TypeScript Types inferred from Zod Schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type CategoryInputCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryInputUpdate = z.infer<typeof categoryUpdateSchema>;
