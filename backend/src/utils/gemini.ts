import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set, AI features will not work");
}

interface MonthlyInsightInput {
  totalIncome: number;
  totalExpense: number;
  savingsRate: number;
  expenseBreakdown: { category: string; amount: number }[];
  previousMonths: { month: string; income: number; expense: number }[];
  currency?: string;
}

interface BudgetAlertInput {
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  daysIntoPeriod: number;
  totalPeriodDays: number;
  currency?: string;
}

interface SavingsTipsInput {
  topCategories: { category: string; amount: number; transactionCount: number }[];
  monthlyIncome: number;
  currency?: string;
}

interface TransactionItem {
  transaction_date?: Date | string | null;
  amount: number | string;
  category_name?: string;
  description?: string;
  type: string;
}

interface BudgetItem {
  id: number;
  amount: number | string;
  spent: number | string;
  category_name: string;
}

interface TransactionInput {
  transactions: TransactionItem[];
  currency?: string;
}

interface BudgetListInput {
  budgets: BudgetItem[];
  currency?: string;
}

// helper to clear json from markdown code blocks
const stripMarkdown = (text: string | undefined) => {
  let cleaned = (text ?? "").trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
  } else {
    cleaned = cleaned.replace(/```\n?/g, "");
  }
  return cleaned.trim();
};

export const generateMonthlyInsight = async ({
  totalIncome,
  totalExpense,
  savingsRate,
  expenseBreakdown,
  previousMonths,
  currency = "IDR",
}: MonthlyInsightInput) => {
  const breakdownText =
    expenseBreakdown.length > 0
      ? expenseBreakdown
          .map((c) => `- ${c.category}: ${currency} ${c.amount.toFixed(2)}`)
          .join("\n")
      : "- No expense recorded yet";

  const trendText =
    previousMonths.length > 0
      ? previousMonths
          .map(
            (m) =>
              `- ${m.month}: Income ${currency} ${m.income.toFixed(2)}, Expense ${currency} ${m.expense.toFixed(2)}`,
          )
          .join("\n")
      : "- No monthly data available";

  const prompt = `Analyze this user's monthly financial data and generated actionable insights,
    
    Currency: ${currency}
    Total Income (this month): ${currency} ${totalIncome.toFixed(2)}
    Total Expense (this month): ${currency} ${totalExpense.toFixed(2)}
    Savings Rate: ${savingsRate.toFixed(1)}%
    
    Expense breakdown by category (this month):
    ${breakdownText}

    Previous months trend: 
    ${trendText}

    Return ONLY valid JSON (no markdown, no commentary) in this exact structure:
    {
        "summary": "2-3 sentence summary of the user's financial health this month",
        "highlights": ["Positive observation 1", "Positive observation 2"],
        "concerns": ["Concern 1", "Concern 2"]
        "recommendations": [
            {"title": "Short title", "detail": "Actionable suggestion (1-2 sentences)"}
        ],
        "topSpendingCategory": "Category name or null",
        "estimatedMonthlySavings": number,
        "healthScore": number
    }

    Constraints:
    - "healthScore" must be an integer between 0 and 100
    - Provide 3 recommedations.
    - Reference actual numbers from the data. Tone: friendly but honest.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API error (monthly insight): ", error);
    throw new Error("Failed to generate monthly insight. Please try again");
  }
};

// Generate Bugdet Alert
export const generateBudgetAlert = async ({
  categoryName,
  budgetAmount,
  spentAmount,
  daysIntoPeriod,
  totalPeriodDays,
  currency = "IDR",
}: BudgetAlertInput) => {
  const percentUsed = ((spentAmount / budgetAmount) * 100).toFixed(1);
  const daysLeft = totalPeriodDays - daysIntoPeriod;

  const prompt = `A user is tracking budget. Generate a helpful alert.
    
    Category: ${categoryName}
    Budget: ${currency} ${budgetAmount.toFixed(2)}
    Spen so far: ${currency} ${spentAmount.toFixed(2)}
    Days into period: ${daysIntoPeriod} of ${totalPeriodDays} (${daysLeft} days remaining)

    Return ONLY valid JSON (no markdown)
    {
        "severity": "info|warning|critical",
        "title": "Short alert title",
        "message": "1-2 sentence empathetic message referencing actual numbers",
        "suggestions": ["Specific action 1", "Specific action 2", "Specific action 3"]
    }

    Severity guide:
    - info: under 70% spent
    - warning: 70-100% spent
    - critical: over 100% spent
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API error (budget alert): ", error);
    throw new Error("Failed to generate budget alert.");
  }
};

// Saving Tips
export const generateSavingsTips = async ({
  topCategories,
  monthlyIncome,
  currency = "IDR",
}: SavingsTipsInput) => {
  const categoryText =
    topCategories.length > 0
      ? topCategories
          .map(
            (c) =>
              `- ${c.category}: ${currency} ${c.amount.toFixed(2)} across ${c.transactionCount} `,
          )
          .join("\n")
      : "- No spending data available";

  const prompt = `Generate personalized savings tips for a user.
    
    Monthly Income (last 30 days): ${currency} ${monthlyIncome.toFixed(2)}
    Top spending categories (last 30 days):
    ${categoryText}

    Return ONLY valid JSON (no markdown):
    {
        "overallTip": "Top-level 1-sentence advice",
        "tips": [
            {
                "category": "Category this targets",
                "title": "Short tip title",
                "detail": "2-3 sentence actionable suggestion",
                "estimatedSavings": number
            }
        ]
    }

    Provide exactly 4 tips. Each tip should reference an actual category from the data and include a realistic monthly amount.
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API error (saving tips): ", error);
    throw new Error("Failed to generate savings tips. Please try again");
  }
};

// Analyze transaction
export const analyzeTransactionList = async ({
  transactions,
  currency = "IDR",
}: TransactionInput) => {
  const formatDate = (d: Date | string | null | undefined) => {
    if (!d) return "";
    if (d instanceof Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
    }
    return String(d).split("T")[0];
  };

  const lines = transactions
    .slice(0, 5)
    .map((t) => {
      const date = formatDate(t.transaction_date);
      const amt = parseFloat(String(t.amount)).toFixed(2);
      const cat = t.category_name || "uncategorized";
      const desc = t.description ? ` | ${t.description}` : "";
      return `- ${date}: ${t.type} ${currency} ${amt} | ${cat}${desc}`;
    })
    .join("\n");

  const prompt = `Analyze these ${transactions.length} transactions and provide a concise, helpful spending insight, Focus on pattern, do not recommend investments or financial products.
  
  Transactions:
  ${lines}

  Return ONLY valid JSON (no markdown):
  {
    "insight": "2-4 sentence analysis with specific numbers from the data. Tone: friendly, helpful.",
    "highlight": "Single short phrase capturing the key takeaway (e.g., 'Heavy on dining', 'Stable income', 'Dining Spike')"
  }`;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API error (transaction analysis): ", error);
    throw new Error("Failed to analyze transactions. Please try again");
  }
};

// Analyze budget
export const analyzeBudgetList = async ({ budgets, currency = "IDR" }: BudgetListInput) => {
  const lines = budgets
    .map((b) => {
      const spent = parseFloat(String(b.spent));
      const total = parseFloat(String(b.amount));
      const pct = total > 0 ? ((spent / total) * 100).toFixed(1) : "0";

      return `Budget ID ${b.id} | Category: ${b.category_name} | Limit ${currency} ${total.toFixed(2)} | Spent: ${currency} ${spent.toFixed(2)} (${pct}%)`;
    })
    .join("\n");

  const prompt = `You're a personal finance assistant. Analyze each budget below and provide a one-sentence warning if any are at risk.

    Today: ${new Date().toISOString().split("T")[0]}

    Budgets: 
    ${lines}

    For each budget, return:
    - status: 'good' (well-paced, under target), 'caution' (approaching limit or above 70%), or 'concerning' (over 100%)
    - message: A Specific, friendly 1-sentence assessment with actionable feedback or encouragement.

    Return ONLY valid JSON (no markdown):
    {
        "analyses": [
            {
                "budgetId": number,
                "status": "good"|"caution"|"concerning",
                "message": "string"
            }
        ]
    }
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API error (budget analysis): ", error);
    throw new Error("Failed to analyze budgets. Please try again");
  }
};

export default {
  generateMonthlyInsight,
  generateBudgetAlert,
  generateSavingsTips,
  analyzeTransactionList,
  analyzeBudgetList,
};
