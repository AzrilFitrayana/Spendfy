import {
  generateMonthlyInsight,
  generateBudgetAlert,
  generateSavingsTips,
  analyzeTransactionList,
  analyzeBudgetList,
} from "../utils/gemini.js";
import pool from "../db.js";
import type { Request, Response } from "express";

interface MonthlyBreakdownRow {
  category: string;
  amount: string;
}

interface MonthlyTrendRow {
  month: string;
  income: string;
  expense: string;
}

interface MonthlyInsightRow {
  income: string | null;
  expense: string | null;
  breakdown: MonthlyBreakdownRow[] | null;
  trend: MonthlyTrendRow[] | null;
}

interface TopCategoryRow {
  category: string;
  amount: string;
  count: string;
}

interface BudgetAlertRow {
  [key: string]: unknown;
  amount: string;
  spent: string;
  category_name: string;
}

const getUserCurrency = async (userId: string | undefined): Promise<string> => {
  const result = await pool.query("SELECT currency FROM users WHERE id = $1", [
    userId,
  ]);
  return result.rows[0]?.currency || "IDR";
};

export const getInsigths = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ai_insights WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.userId],
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching insights:", error);
    res.status(500).json({ message: "Failed to fetch insights" });
  }
};

const buildMonthlyInsight = async (userId: string | undefined) => {
  const data = await pool.query<MonthlyInsightRow>(
    `
        WITH current_month AS (
            SELECT
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
            FROM transactions
            WHERE user_id = $1
                AND transaction_date >= date_trunc('month', CURRENT_DATE)
        ),
        breakdown AS (
            SELECT c.name AS category, SUM(t.amount) AS amount
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = $1
                AND t.type = 'expense'
                AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
            GROUP BY c.name
            ORDER BY amount DESC
        ),
        trend AS (
            SELECT
                to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
            FROM transactions
            WHERE user_id = $1
                AND transaction_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '3 months'
                AND transaction_date < date_trunc('month', CURRENT_DATE)
            GROUP BY 1
            ORDER BY 1
        )
        SELECT
            (SELECT income FROM current_month) AS income,
            (SELECT expense FROM current_month) AS expense,
            (SELECT json_agg(breakdown) FROM breakdown) AS breakdown,
            (SELECT json_agg(trend) FROM trend) AS trend`,
    [userId],
  );

  const row = data.rows[0];
  if (!row) {
    throw new Error("No monthly insight data available");
  }
  const totalIncome = parseFloat(row.income || "0")
  const totalExpense = parseFloat(row.expense || "0")
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
  const currency = await getUserCurrency(userId)

  const content = await generateMonthlyInsight({
    totalIncome,
    totalExpense,
    savingsRate,
    expenseBreakdown: (row.breakdown || []).map((b) => ({
        category: b.category,
        amount: parseFloat(b.amount)
    })),
    previousMonths: (row.trend || []).map((t) => ({
        month: t.month,
        income: parseFloat(t.income),
        expense: parseFloat(t.expense)
    })),
    currency,
  })

  const now = new Date();
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`

  return { content, periodStart, periodEnd }
}

const buildSavingsTips = async (userId: string | undefined) => {
    const top = await pool.query<TopCategoryRow>(
        `SELECT c.name AS category, SUM(t.amount) AS amount, COUNT(t.id) AS count
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = $1
            AND t.type = 'expense'
            AND t.transaction_date >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY c.name
         ORDER BY amount DESC
         LIMIT 5
         `,
        [userId],
    )

    const incomeResult = await pool.query<{ income: string }>(
        `SELECT COALESCE(SUM(amount), 0) AS income
         FROM transactions
         WHERE user_id = $1
            AND type = 'income'
            AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'`,
        [userId]
    )

    const currency = await getUserCurrency(userId)

    const content = await generateSavingsTips({
        topCategories: top.rows.map((r) => ({
            category: r.category,
            amount: parseFloat(r.amount),
            transactionCount: parseInt(r.count, 10)
        })),
        monthlyIncome: parseFloat(incomeResult.rows[0]?.income ?? "0"),
        currency
    })

    return { content, periodStart: null, periodEnd: null }
}

const buildBudgetAlert = async (userId: string | undefined, categoryId: string | undefined) => {
    if (!categoryId) {
        throw new Error('Category ID is required');
    }

    const budgetRow = await pool.query<BudgetAlertRow>(
        `SELECT b.*, c.name AS category_name
            COALESCE((
                SELECT SUM(amount) FROM transactions
                WHERE user_id = b.user_id
                    AND category_id = b.category_id
                    AND type = 'expense'
                    AND transaction_date >= date_trunc('month', CURRENT_DATE)
                ), 0) AS spent
        FROM budgets b
        JOIN categories c ON c.id = b.category_id
        WHERE b.user_id = $1 AND b.category_id = $2`,
        [userId, categoryId]
    )

    if (budgetRow.rows.length === 0) {
        throw new Error('Budget not found for category')
    }

    const b = budgetRow.rows[0];
    if (!b) {
        throw new Error("Budget not found for category");
    }
    const now = new Date()
    const daysIntoPeriod = now.getDate()
    const totalPeriodDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const currency = await getUserCurrency(userId)
    
    const content = await generateBudgetAlert({
        categoryName: b.category_name,
        budgetAmount: parseFloat(b.amount),
        spentAmount: parseFloat(b.spent),
        daysIntoPeriod,
        totalPeriodDays,
        currency
    })
    
    return { content, periodStart: null, periodEnd: null }
}

export const generateInsight = async (req: Request, res: Response) => {
    const {type, categoryId} = req.body;

    if (!type) {
        return res.status(400).json({message: 'Insight type is required'})
    }

    try {
        let result;
        
        if (type === 'monthly_summary'){
            result = await buildMonthlyInsight(req.userId)
        } else if (type === 'savings_tips') {
            result = await buildSavingsTips(req.userId)
        } else if (type === 'budget_alert') {
            result = await buildBudgetAlert(req.userId, categoryId)
        } else {
            return res.status(400).json({message: 'Unknown insight type'})
        }

        const inserted = await pool.query(
            `INSERT INTO ai_insights (user_id, insight_type, period_start, period_end, content_json)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
             [req.userId, type, result.periodStart, result.periodEnd, result.content]
        )

        res.status(201).json(inserted.rows[0])
    } catch (error) {
        console.error("Error generating insight:", error);
        res.status(500).json({ message: "Failed to generate insight" });
    }
}