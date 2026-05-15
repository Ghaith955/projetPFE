/**
 * AI Proxy Routes
 * Proxies requests from Angular (via Node.js) to the Python FastAPI AI service.
 * All endpoints require JWT authentication.
 */
const express = require('express');
const auth    = require('../middleware/auth');
const router  = express.Router();
const { getCoachSwimmerIds } = require('../utils/coachScope');
const { AI_URL, requestWithRetry, AI_TIMEOUT_MS } = require('../utils/aiClient');

/**
 * Generic proxy helper — forwards the request body to the Python service
 * and returns the response. Handles errors gracefully.
 */
const proxyToAI = (path) => async (req, res) => {
  try {
    const { data } = await requestWithRetry({ method: 'post', url: path, data: req.body });
    res.json(data);
  } catch (err) {
    console.error(`[AI Proxy] ${path} error:`, err.code || err.message);
    if (err.response) {
      // Python service returned an error
      res.status(err.response.status).json({
        message: 'AI service error',
        detail: err.response.data?.detail || err.message
      });
    } else {
      // Python service unreachable
      res.status(502).json({
        message: `AI service unavailable — timeout ${AI_TIMEOUT_MS}ms`,
        error: err.message
      });
    }
  }
};

// Health check (no auth needed)
router.get('/health', async (req, res) => {
  try {
    const { data } = await requestWithRetry({ method: 'get', url: '/health', timeout: 5000 });
    res.json({ node: 'ok', ai: data });
  } catch (err) {
    res.json({ node: 'ok', ai: 'unavailable' });
  }
});

// ── Generic GET proxy helper ─────────────────────────────────────
const proxyGetToAI = (path) => async (req, res) => {
  try {
    const { data } = await requestWithRetry({ method: 'get', url: path });
    res.json(data);
  } catch (err) {
    console.error(`[AI Proxy GET] ${path} error:`, err.code || err.message);
    if (err.response) {
      res.status(err.response.status).json({ message: 'AI service error', detail: err.response.data?.detail || err.message });
    } else {
      res.status(502).json({ message: `AI service unavailable — timeout ${AI_TIMEOUT_MS}ms`, error: err.message });
    }
  }
};

const getCoachSwimmerIdSet = async (req) => {
  if (req.user?.role !== 'ENTRAINEUR') return null;
  const swimmerIds = await getCoachSwimmerIds(req.user.userId);
  return new Set(swimmerIds.map((id) => String(id)));
};

const filterDecisionPayload = (data, swimmerIdSet) => {
  const raw = data?.decisions || data?.swimmers || data?.results || [];
  const filtered = raw.filter((item) => swimmerIdSet.has(String(item.swimmer_id || item.swimmerId || item.nageur_id || item.nageurId || item.nageur)));
  const levelCounts = filtered.reduce((acc, item) => {
    const level = item.fatigue_level || item.fatigueLevel || 'LOW';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });
  const atRiskCount = (levelCounts.HIGH || 0) + (levelCounts.CRITICAL || 0);

  return {
    ...data,
    total_analyzed: filtered.length,
    decisions: data?.decisions ? filtered : data?.decisions,
    swimmers: data?.swimmers ? filtered : data?.swimmers,
    results: data?.results ? filtered : data?.results,
    level_distribution: data?.level_distribution ? levelCounts : data?.level_distribution,
    at_risk_count: data?.at_risk_count !== undefined ? atRiskCount : data?.at_risk_count
  };
};

const guardCoachSwimmerId = async (req, res, next) => {
  if (req.user?.role !== 'ENTRAINEUR') return next();
  const swimmerId = req.body?.swimmer_id || req.body?.swimmerId;
  if (!swimmerId) return res.status(403).json({ message: 'Acces interdit.' });
  const swimmerIds = await getCoachSwimmerIds(req.user.userId);
  const allowed = swimmerIds.some((id) => String(id) === String(swimmerId));
  if (!allowed) return res.status(403).json({ message: 'Acces interdit.' });
  return next();
};

const coachFilteredExplain = async (req, res) => {
  try {
    if (req.user?.role === 'ENTRAINEUR') {
      const decisionType = req.body?.decision_type || req.body?.decisionType;
      if (decisionType !== 'recommendation') {
        const swimmerId = req.body?.swimmer_id || req.body?.swimmerId;
        if (!swimmerId) return res.status(403).json({ message: 'Acces interdit.' });
        const swimmerIds = await getCoachSwimmerIds(req.user.userId);
        const allowed = swimmerIds.some((id) => String(id) === String(swimmerId));
        if (!allowed) return res.status(403).json({ message: 'Acces interdit.' });
      }
    }

    const { data } = await requestWithRetry({ method: 'post', url: '/explain', data: req.body });

    const swimmerIdSet = await getCoachSwimmerIdSet(req);
    if (!swimmerIdSet) return res.json(data);

    const explained = Array.isArray(data?.explained_swimmers) ? data.explained_swimmers : [];
    const filtered = explained.filter((s) => swimmerIdSet.has(String(s.swimmer_id || s.swimmerId)));
    return res.json({
      ...data,
      explained_swimmers: filtered,
      total_evaluated: filtered.length
    });
  } catch (err) {
    console.error('[AI Proxy] /explain error:', err.code || err.message);
    if (err.response) {
      return res.status(err.response.status).json({ message: 'AI service error', detail: err.response.data?.detail || err.message });
    }
    return res.status(502).json({ message: `AI service unavailable — timeout ${AI_TIMEOUT_MS}ms`, error: err.message });
  }
};

const guardCoachSwimmerIds = async (req, res, next) => {
  if (req.user?.role !== 'ENTRAINEUR') return next();
  const swimmerIds = await getCoachSwimmerIds(req.user.userId);
  const requested = Array.isArray(req.body?.swimmer_ids) ? req.body.swimmer_ids : [];
  if (!requested.length) {
    req.body.swimmer_ids = swimmerIds;
    return next();
  }
  const allowed = requested.filter((id) => swimmerIds.some((sid) => String(sid) === String(id)));
  if (!allowed.length) return res.status(403).json({ message: 'Acces interdit.' });
  req.body.swimmer_ids = allowed;
  return next();
};

const coachFilteredDashboard = async (req, res) => {
  try {
    const { data } = await requestWithRetry({ method: 'get', url: '/dashboard' });
    const swimmerIdSet = await getCoachSwimmerIdSet(req);
    if (!swimmerIdSet) return res.json(data);
    return res.json(filterDecisionPayload(data, swimmerIdSet));
  } catch (err) {
    console.error('[AI Proxy GET] /dashboard error:', err.code || err.message);
    if (err.response) {
      return res.status(err.response.status).json({ message: 'AI service error', detail: err.response.data?.detail || err.message });
    }
    return res.status(502).json({ message: `AI service unavailable — timeout ${AI_TIMEOUT_MS}ms`, error: err.message });
  }
};

const coachFilteredRecommend = async (req, res) => {
  try {
    const { data } = await requestWithRetry({ method: 'post', url: '/recommend', data: req.body });
    const swimmerIdSet = await getCoachSwimmerIdSet(req);
    if (!swimmerIdSet) return res.json(data);

    const ranked = Array.isArray(data?.ranked_swimmers) ? data.ranked_swimmers : [];
    const filtered = ranked.filter((s) => swimmerIdSet.has(String(s.swimmer_id || s.swimmerId)));
    filtered.forEach((s, idx) => { s.rank = idx + 1; });

    return res.json({
      ...data,
      total_evaluated: filtered.length,
      ranked_swimmers: filtered
    });
  } catch (err) {
    console.error('[AI Proxy] /recommend error:', err.code || err.message);
    if (err.response) {
      return res.status(err.response.status).json({ message: 'AI service error', detail: err.response.data?.detail || err.message });
    }
    return res.status(502).json({ message: `AI service unavailable — timeout ${AI_TIMEOUT_MS}ms`, error: err.message });
  }
};

const coachFilteredTeamPlan = async (req, res) => {
  try {
    const { data } = await requestWithRetry({ method: 'get', url: '/team-plan' });
    const swimmerIdSet = await getCoachSwimmerIdSet(req);
    if (!swimmerIdSet) return res.json(data);

    const plans = Array.isArray(data?.plans) ? data.plans : [];
    const filtered = plans.filter((p) => swimmerIdSet.has(String(p.swimmer_id || p.swimmerId)));
    const groupSummary = filtered.reduce((acc, p) => {
      const level = p?.current_state?.fatigue_level || 'LOW';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });

    return res.json({
      ...data,
      total_swimmers: filtered.length,
      group_summary: groupSummary,
      plans: filtered
    });
  } catch (err) {
    console.error('[AI Proxy GET] /team-plan error:', err.code || err.message);
    if (err.response) {
      return res.status(err.response.status).json({ message: 'AI service error', detail: err.response.data?.detail || err.message });
    }
    return res.status(502).json({ message: `AI service unavailable — timeout ${AI_TIMEOUT_MS}ms`, error: err.message });
  }
};

// AI endpoints (all require JWT auth)
router.post('/analyze',       auth, guardCoachSwimmerId, proxyToAI('/analyze'));
router.post('/predict',       auth, guardCoachSwimmerId, proxyToAI('/predict'));
router.post('/fatigue',       auth, guardCoachSwimmerIds, proxyToAI('/fatigue'));
router.post('/recommend',     auth, coachFilteredRecommend);
router.post('/simulate',      auth, guardCoachSwimmerId, proxyToAI('/simulate'));
router.post('/explain',       auth, coachFilteredExplain);
router.post('/plan',          auth, guardCoachSwimmerId, proxyToAI('/plan'));
router.post('/batch-analyze', auth, guardCoachSwimmerIds, proxyToAI('/batch-analyze'));
router.get('/dashboard',      auth, coachFilteredDashboard);
router.get('/team-plan',      auth, coachFilteredTeamPlan);

// Training & Decision Logging (admin only)
router.post('/train',            auth, proxyToAI('/train'));
router.post('/decision-history', auth, proxyToAI('/decision-history'));
router.get('/decision-stats',    auth, proxyGetToAI('/decision-stats'));
router.get('/validate',          auth, proxyGetToAI('/validate'));

module.exports = router;
