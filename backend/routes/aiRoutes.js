/**
 * AI Proxy Routes
 * Proxies requests from Angular (via Node.js) to the Python FastAPI AI service.
 * All endpoints require JWT authentication.
 */
const express = require('express');
const axios   = require('axios');
const auth    = require('../middleware/auth');
const router  = express.Router();

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Generic proxy helper — forwards the request body to the Python service
 * and returns the response. Handles errors gracefully.
 */
const proxyToAI = (path) => async (req, res) => {
  try {
    const { data } = await axios.post(`${AI_URL}${path}`, req.body, {
      timeout: 30000, // 30s timeout for ML computation
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(data);
  } catch (err) {
    console.error(`[AI Proxy] ${path} error:`, err.message);
    if (err.response) {
      // Python service returned an error
      res.status(err.response.status).json({
        message: 'AI service error',
        detail: err.response.data?.detail || err.message
      });
    } else {
      // Python service unreachable
      res.status(502).json({
        message: 'AI service unavailable — is the Python service running on port 8000?',
        error: err.message
      });
    }
  }
};

// Health check (no auth needed)
router.get('/health', async (req, res) => {
  try {
    const { data } = await axios.get(`${AI_URL}/health`, { timeout: 5000 });
    res.json({ node: 'ok', ai: data });
  } catch (err) {
    res.json({ node: 'ok', ai: 'unavailable' });
  }
});

// ── Generic GET proxy helper ─────────────────────────────────────
const proxyGetToAI = (path) => async (req, res) => {
  try {
    const { data } = await axios.get(`${AI_URL}${path}`, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });
    res.json(data);
  } catch (err) {
    console.error(`[AI Proxy GET] ${path} error:`, err.message);
    if (err.response) {
      res.status(err.response.status).json({ message: 'AI service error', detail: err.response.data?.detail || err.message });
    } else {
      res.status(502).json({ message: 'AI service unavailable', error: err.message });
    }
  }
};

// AI endpoints (all require JWT auth)
router.post('/analyze',       auth, proxyToAI('/analyze'));
router.post('/predict',       auth, proxyToAI('/predict'));
router.post('/fatigue',       auth, proxyToAI('/fatigue'));
router.post('/recommend',     auth, proxyToAI('/recommend'));
router.post('/simulate',      auth, proxyToAI('/simulate'));
router.post('/explain',       auth, proxyToAI('/explain'));
router.post('/plan',          auth, proxyToAI('/plan'));
router.post('/batch-analyze', auth, proxyToAI('/batch-analyze'));
router.get('/dashboard',      auth, proxyGetToAI('/dashboard'));
router.get('/team-plan',      auth, proxyGetToAI('/team-plan'));

// Training & Decision Logging (admin only)
router.post('/train',            auth, proxyToAI('/train'));
router.post('/decision-history', auth, proxyToAI('/decision-history'));
router.get('/decision-stats',    auth, proxyGetToAI('/decision-stats'));
router.get('/validate',          auth, proxyGetToAI('/validate'));

module.exports = router;
