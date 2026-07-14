import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set, AI features will not work");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  topCategories: {
    category: string;
    amount: number;
    transactionCount: number;
  }[];
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

/**
 * Strip surrounding Markdown code fences (```json / ```) from a model response.
 *
 * Gemini occasionally wraps JSON in Markdown fences despite being instructed not
 * to. Removing them before JSON.parse avoids parse failures on otherwise valid
 * output, so callers can rely on receiving clean JSON.
 */
const stripMarkdown = (text: string | undefined) => {
  let cleaned = (text ?? "").trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?$/g, "");
  } else {
    cleaned = cleaned.replace(/```\n?/g, "");
  }
  return cleaned.trim();
};

/**
 * Generate an AI-powered monthly financial insight.
 *
 * Aggregates the user's current-month income/expense, category breakdown, and
 * recent monthly trend into a single prompt and asks the Gemini model to return
 * structured JSON describing financial health, highlights, concerns, and
 * recommendations. Requesting JSON (rather than prose) lets the API persist and
 * render the insight consistently across clients.
 *
 * @param input - Monthly financial context for the insight.
 * @param input.totalIncome - Total income for the current month.
 * @param input.totalExpense - Total expense for the current month.
 * @param input.savingsRate - Calculated savings rate as a percentage.
 * @param input.expenseBreakdown - Per-category expense totals for the month.
 * @param input.previousMonths - Trailing monthly income/expense for trend context.
 * @param input.currency - ISO currency code used to format amounts (defaults to IDR).
 * @returns Parsed JSON with `summary`, `highlights`, `concerns`, `recommendations`,
 *          `topSpendingCategory`, `estimatedMonthlySavings`, and `healthScore`.
 * @throws Error if the Gemini API call fails or returns unparseable JSON.
 */
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

/**
 * Generate a budget alert for a single category.
 *
 * Compares the spent amount against the budget limit and passes the percentage
 * used plus the remaining days in the period to Gemini, which classifies severity
 * and returns an empathetic message. Pre-computing the percentage (instead of
 * asking the model to compute it) keeps the severity thresholds deterministic and
 * aligned with the documented 70% / 100% guide.
 *
 * @param input - Budget alert context.
 * @param input.categoryName - Name of the budgeted category.
 * @param input.budgetAmount - Total budget limit for the period.
 * @param input.spentAmount - Amount already spent in the period.
 * @param input.daysIntoPeriod - Number of days elapsed in the period.
 * @param input.totalPeriodDays - Total length of the period in days.
 * @param input.currency - ISO currency code (defaults to IDR).
 * @returns Parsed JSON with `severity` ("info"|"warning"|"critical"), `title`,
 *          `message`, and a `suggestions` array.
 * @throws Error if the Gemini API call fails or returns unparseable JSON.
 */
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
    Spen so far: ${currency} ${spentAmount.toFixed(2)} (${percentUsed}% used)
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

/**
 * Generate personalized savings tips based on top spending categories.
 *
 * Sends the user's last-30-day income and highest spending categories to Gemini
 * and requests exactly four actionable tips, each tied to a real category with a
 * realistic estimated monthly saving. The fixed tip count keeps the response
 * predictable for UI rendering and prevents the model from over-producing.
 *
 * @param input - Savings tips context.
 * @param input.topCategories - Highest spending categories with amount and count.
 * @param input.monthlyIncome - Total income over the last 30 days.
 * @param input.currency - ISO currency code (defaults to IDR).
 * @returns Parsed JSON with `overallTip` and a `tips` array (category, title,
 *          detail, estimatedSavings).
 * @throws Error if the Gemini API call fails or returns unparseable JSON.
 */
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

/**
 * Analyze a list of transactions and return a concise spending insight.
 *
 * Formats up to the first five transactions into a compact prompt (capping input
 * size keeps latency and token cost low) and asks Gemini for a short analysis plus
 * a one-phrase highlight. Dates are normalized to YYYY-MM-DD so the model sees a
 * consistent format regardless of how the database returns them.
 *
 * @param input - Transaction analysis input.
 * @param input.transactions - Transactions to analyze (only the first 5 are sent).
 * @param input.currency - ISO currency code (defaults to IDR).
 * @returns Parsed JSON with `insight` (free-text analysis) and `highlight`
 *          (short key-takeaway phrase).
 * @throws Error if the Gemini API call fails or returns unparseable JSON.
 */
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
      return `${y}-${m}-${day}`
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

/**
 * Analyze a user's budgets and flag any at risk of being exceeded.
 *
 * Formats each budget with its spent/limit percentage and asks Gemini to classify
 * every budget as "good", "caution", or "concerning" with a friendly message.
 * Pre-computing the percentage ensures severity classification matches the
 * documented thresholds exactly.
 *
 * @param input - Budget analysis input.
 * @param input.budgets - Budgets with id, amount, spent, and category_name.
 * @param input.currency - ISO currency code (defaults to IDR).
 * @returns Parsed JSON with an `analyses` array, each entry containing `budgetId`,
 *          `status`, and `message`.
 * @throws Error if the Gemini API call fails or returns unparseable JSON.
 */
export const analyzeBudgetList = async ({
  budgets,
  currency = "IDR",
}: BudgetListInput) => {
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
