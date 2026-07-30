const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/summary', async (req, res) => {
  const { period, from, to } = req.query;
  let dateFilter = '';
  const params = [req.user.id];
  if (period === 'custom') {
    if (from && to) {
      params.push(from, to);
      dateFilter = `AND occurred_at >= $2 AND occurred_at <= $3`;
    }
  } else {
    const truncMap = { day: 'day', week: 'week', month: 'month' };
    const trunc = truncMap[period] || 'month';
    dateFilter = `AND date_trunc('${trunc}', occurred_at) = date_trunc('${trunc}', now())`;
  }
  try {
    const summary = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as total_income,
         COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as total_expense
       FROM transactions WHERE user_id=$1 ${dateFilter}`,
      params
    );
    const byCategory = await pool.query(
      `SELECT category, SUM(amount) as amount, type
       FROM transactions WHERE user_id=$1 ${dateFilter} AND category IS NOT NULL
       GROUP BY category, type`,
      params
    );
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM transactions WHERE user_id=$1 ${dateFilter}`,
      params
    );
    const row = summary.rows[0];
    res.json({
      total_income: Number(row.total_income),
      total_expense: Number(row.total_expense),
      balance: Number(row.total_income) - Number(row.total_expense),
      by_category: byCategory.rows,
      count: Number(countRes.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/daily', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });
  try {
    const result = await pool.query(
      `SELECT date_trunc('day', occurred_at) as date,
              COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) as income,
              COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) as expense
       FROM transactions
       WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at <= $3
       GROUP BY date_trunc('day', occurred_at)
       ORDER BY date`,
      [req.user.id, from, to]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
