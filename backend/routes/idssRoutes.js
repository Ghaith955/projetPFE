const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const role    = require('../middleware/rbac');
const c       = require('../controllers/idss.Controller');

// ── Analysis ───────────────────────────────────────────────────────────────
// Trigger IDSS analysis for a specific performance record
router.post('/analyze/:performanceId',  auth, role('RESPONSABLE', 'ENTRAINEUR'), c.analyzePerformance);

// ── Dashboard summary (Admin / Coach) ─────────────────────────────────────
router.get('/summary',                  auth, role('RESPONSABLE', 'ENTRAINEUR'), c.getSummary);

// ── All decisions (Admin / Coach) ─────────────────────────────────────────
router.get('/decisions',                auth, role('RESPONSABLE', 'ENTRAINEUR'), c.getDecisions);

// ── Latest decision for a specific swimmer ────────────────────────────────
router.get('/decisions/latest/:nageurId', auth, role('RESPONSABLE', 'ENTRAINEUR'), c.getLatestDecision);

// ── Acknowledge / dismiss an alert ────────────────────────────────────────
router.patch('/decisions/:id/acknowledge', auth, role('RESPONSABLE', 'ENTRAINEUR'), c.acknowledgeDecision);

// ── Swimmer's own status ──────────────────────────────────────────────────
router.get('/my-status',                auth, role('NAGEUR'), c.getMyStatus);

// ── Swimmer history (for trend chart) ────────────────────────────────────
router.get('/history/:nageurId',        auth, role('RESPONSABLE', 'ENTRAINEUR', 'NAGEUR'), c.getHistory);

// ── Baselines ─────────────────────────────────────────────────────────────
router.get('/baseline/:nageurId',       auth, role('RESPONSABLE', 'ENTRAINEUR'), c.getBaseline);
router.patch('/baseline/:nageurId',     auth, role('RESPONSABLE', 'ENTRAINEUR'), c.updateBaseline);

module.exports = router;
