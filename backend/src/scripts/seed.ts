import bcrypt from 'bcrypt';
import pool from '../db.js';
import { defaultCategories } from '../utils/defaultCategories.js'

const USER = {
    name: 'Admin',
    email: 'admin@test.com',
    password: 'test123',
    currency: 'USD'
}

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const today = new Date();
const dayThisMonth = (day: number) => fmt(new Date(today.getFullYear(), today.getMonth(), day));
const dayLastMonth = (day: number) => fmt(new Date(today.getFullYear(), today.getMonth() - 1, day));
const dayTwoMonthsAgo = (day: number) => fmt(new Date(today.getFullYear(), today.getMonth() - 2, day));
const monthStart = fmt(new Date(today.getFullYear(), today.getMonth(), 1));

const SAMPLE_TRANSACTIONS = [
    { category: 'Gaji', type: 'income', amount: 5000, description: 'Monthly salary', notes: null, date: dayThisMonth(1) },
    { category: 'Freelance', type: 'income', amount: 850, description: 'Side project', notes: null, date: dayThisMonth(5) },
    { category: 'Makan & Minum', type: 'expense', amount: 45.5, description: 'Lunch', notes: null, date: dayThisMonth(3) },
    { category: 'Transportasi', type: 'expense', amount: 30, description: 'Ride share', notes: null, date: dayThisMonth(4) },
    { category: 'Belanja', type: 'expense', amount: 120, description: 'Groceries', notes: null, date: dayThisMonth(8) },
    { category: 'Tagihan', type: 'expense', amount: 80, description: 'Electricity', notes: null, date: dayThisMonth(10) },
    { category: 'Hiburan', type: 'expense', amount: 60, description: 'Movie night', notes: null, date: dayThisMonth(12) },

    { category: 'Gaji', type: 'income', amount: 5000, description: 'Monthly salary', notes: null, date: dayLastMonth(1) },
    { category: 'Freelance', type: 'income', amount: 600, description: 'Side project', notes: null, date: dayLastMonth(15) },
    { category: 'Makan & Minum', type: 'expense', amount: 210, description: 'Groceries', notes: null, date: dayLastMonth(6) },
    { category: 'Transportasi', type: 'expense', amount: 95, description: 'Fuel', notes: null, date: dayLastMonth(9) },
    { category: 'Belanja', type: 'expense', amount: 310, description: 'Clothes', notes: null, date: dayLastMonth(18) },
    { category: 'Tagihan', type: 'expense', amount: 80, description: 'Internet', notes: null, date: dayLastMonth(11) },
    { category: 'Hiburan', type: 'expense', amount: 140, description: 'Concert', notes: null, date: dayLastMonth(22) },

    { category: 'Gaji', type: 'income', amount: 5000, description: 'Monthly salary', notes: null, date: dayTwoMonthsAgo(1) },
    { category: 'Makan & Minum', type: 'expense', amount: 350, description: 'Dining out', notes: null, date: dayTwoMonthsAgo(7) },
    { category: 'Transportasi', type: 'expense', amount: 110, description: 'Fuel', notes: null, date: dayTwoMonthsAgo(14) },
    { category: 'Belanja', type: 'expense', amount: 260, description: 'Groceries', notes: null, date: dayTwoMonthsAgo(20) },
    { category: 'Tagihan', type: 'expense', amount: 80, description: 'Water', notes: null, date: dayTwoMonthsAgo(12) },
];

const SAMPLE_BUDGETS = [
    { category: 'Makan & Minum', amount: 400, period: 'monthly' },
    { category: 'Transportasi', amount: 150, period: 'monthly' },
    { category: 'Belanja', amount: 300, period: 'monthly' },
    { category: 'Tagihan', amount: 100, period: 'monthly' },
];

const SAMPLE_INSIGHTS = [
    {
        insightType: 'monthly_summary',
        contentJson: {
            summary: 'Spending is trending up this month, led by shopping. Income is stable from salary and freelance work.',
            highlights: ['Savings rate is positive', 'Shopping is your top expense category'],
            recommendations: ['Set a stricter shopping budget', 'Automate savings from salary'],
        },
    },
    {
        insightType: 'savings_tips',
        contentJson: {
            tips: [
                'Cook at home more often to cut dining costs',
                'Compare ride-share vs public transit for your commute',
            ],
        },
    },
];

const seed = async () => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [USER.email]
        );

        let userId: number;

        if (existing.rows.length > 0) {
            userId = existing.rows[0].id;
            console.log(`User ${USER.email} already exists (id: ${userId})`);
        } else {
            const passwordHash = await bcrypt.hash(USER.password, 10);
            const userResult = await client.query(
                `INSERT INTO users (name, email, password, currency)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [USER.name, USER.email, passwordHash, USER.currency]
            );
            userId = userResult.rows[0].id;
            console.log(`Created user ${USER.email} (id: ${userId})`);
        }

        const catResult = await client.query(
            'SELECT COUNT(*)::int AS count FROM categories WHERE user_id = $1',
            [userId]
        );

        if (catResult.rows[0].count === 0) {
            for (const item of defaultCategories) {
                await client.query(
                    `INSERT INTO categories (user_id, name, type, icon, color, is_default)
                     VALUES ($1, $2, $3, $4, $5, true)`,
                    [userId, item.name, item.type, item.icon, item.color]
                );
            }
            console.log(`Seeded ${defaultCategories.length} categories for user ${userId}`);
        } else {
            console.log(`Categories already exist for user ${userId}`);
        }

        const cats = await client.query(
            'SELECT id, name FROM categories WHERE user_id = $1',
            [userId]
        );
        const catId = (name: string): number => {
            const row = cats.rows.find((r) => r.name === name);
            if (!row) throw new Error(`Category not found: ${name}`);
            return row.id;
        };

        const txnResult = await client.query(
            'SELECT COUNT(*)::int AS count FROM transactions WHERE user_id = $1',
            [userId]
        );

        if (txnResult.rows[0].count === 0) {
            for (const t of SAMPLE_TRANSACTIONS) {
                await client.query(
                    `INSERT INTO transactions (user_id, category_id, amount, type, description, notes, transaction_date)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [userId, catId(t.category), t.amount, t.type, t.description, t.notes, t.date]
                );
            }
            console.log(`Seeded ${SAMPLE_TRANSACTIONS.length} transactions for user ${userId}`);
        } else {
            console.log(`Transactions already exist for user ${userId}`);
        }

        const budgetResult = await client.query(
            'SELECT COUNT(*)::int AS count FROM budgets WHERE user_id = $1',
            [userId]
        );

        if (budgetResult.rows[0].count === 0) {
            for (const b of SAMPLE_BUDGETS) {
                await client.query(
                    `INSERT INTO budgets (user_id, category_id, amount, period, start_date)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [userId, catId(b.category), b.amount, b.period, monthStart]
                );
            }
            console.log(`Seeded ${SAMPLE_BUDGETS.length} budgets for user ${userId}`);
        } else {
            console.log(`Budgets already exist for user ${userId}`);
        }

        const insightResult = await client.query(
            'SELECT COUNT(*)::int AS count FROM ai_insights WHERE user_id = $1',
            [userId]
        );

        if (insightResult.rows[0].count === 0) {
            for (const i of SAMPLE_INSIGHTS) {
                await client.query(
                    `INSERT INTO ai_insights (user_id, insight_type, period_start, period_end, content_json)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [userId, i.insightType, monthStart, null, JSON.stringify(i.contentJson)]
                );
            }
            console.log(`Seeded ${SAMPLE_INSIGHTS.length} AI insights for user ${userId}`);
        } else {
            console.log(`AI insights already exist for user ${userId}`);
        }

        await client.query('COMMIT');
        console.log('Seed completed');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Seed failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
};

seed();
