================================================================================
  IDSS AI BRAIN — INTELLIGENT DECISION SUPPORT SYSTEM
  Swimming Club Performance & Fatigue Analysis Platform
  Project: PFE Natation | Author: JAMAI RAED | Version: 2.0
  Club: Stade Tunisien
================================================================================

TABLE OF CONTENTS
-----------------
  1. What is the IDSS Brain?
  2. Overall Architecture
  3. Layer 1 — Node.js Rule Engine (Phase 1)
  4. Layer 2 — Python AI Microservice (Phase 2)
  5. MongoDB Data Model
  6. AI Modules Detail
  7. Explainability Layer
  8. API Endpoint Reference
  9. How to Run Everything
 10. Data Flow (End-to-End)
 11. Technologies Used
 12. Advancement Status

================================================================================
1. WHAT IS THE IDSS BRAIN?
================================================================================
The IDSS (Intelligent Decision Support System) is the intelligent core of the swimming club management platform for the Stade Tunisien. It leverages historical and real-time sports data to assist coaches and decision-makers in making objective, data-driven, and explainable decisions regarding swimmer performance, training planning, and competition management.

The system continuously analyzes swimmer performance, training load, attendance, and competition results to detect performance trends, identify potential fatigue risks, and predict future performance evolution. It provides intelligent recommendations such as optimal swimmer selection for competitions, personalized training adjustments, and efficient planning strategies.

Additionally, the IDSS integrates a simulation module that allows users to explore different decision scenarios (e.g., modifying training intensity or schedules) and evaluate their potential impact before implementation. To enhance trust and usability, the system also includes an explainability layer, ensuring that all recommendations and predictions are transparent and understandable.

The entire system operates on locally managed data, ensuring data security, reliability, and full control over the decision-making process without relying on external AI services.

================================================================================
2. OVERALL ARCHITECTURE
================================================================================

  Angular Frontend (port 4200)
       |
       | HTTP + JWT Auth
       v
  Node.js / Express Backend (port 3300)
       |          |
       |          | MongoDB (mongoose)
       |          v
       |    MongoDB :27017/PFE_NATATION
       |
       | HTTP Proxy (axios)
       v
  Python / FastAPI AI Microservice (port 8000)
       |
       | pymongo (direct connection)
       v
  MongoDB :27017/PFE_NATATION (same database, shared data)

The two backend services share the same MongoDB instance. The Node.js backend
owns the REST API for all user operations; the Python service only reads data
(it never writes, except optionally in the future). The Node.js backend proxies
all /ai/* requests from Angular so the Python port is never exposed directly.

================================================================================
3. LAYER 1 — NODE.JS RULE ENGINE (Phase 1 — Currently Active)
================================================================================

Location: backend/utils/idssRuleEngine.js

This is the immediate, always-on fatigue decision engine. Every time a
performance record is saved (via the performance controller), the rule engine
automatically runs and stores a decision in MongoDB.

11 Rules Implemented:
  Rule 1  — ACWR_CRITICAL        (ACWR > 1.5 → critical overload)
  Rule 2  — ACWR_HIGH            (ACWR > 1.3 → elevated risk)
  Rule 3  — HIGH_RPE             (reported fatigue >= 8/10)
  Rule 4  — MODERATE_RPE         (reported fatigue >= 6/10)
  Rule 5  — CONSECUTIVE_DAYS     (6+ days without rest)
  Rule 6  — CONSECUTIVE_DAYS_WARN(4-5 days, watch closely)
  Rule 7  — WEEKLY_OVERLOAD      (session load > threshold)
  Rule 8  — PERFORMANCE_DROP     (time > personal best + 10%)
  Rule 9  — TREND_DECLINE        (3 consecutive declining results)
  Rule 10 — HIGH_INTENSITY_FREQ  (high intensity + high frequency)
  Rule 11 — LOW_LOAD_WARNING     (sudden training drop — detraining risk)

Scoring: Each triggered rule adds points (0-100 scale)
  - 0-19:  LOW fatigue
  - 20-44: MEDIUM fatigue
  - 45-69: HIGH fatigue
  - 70+:   CRITICAL fatigue

Supporting Utilities:
  backend/utils/idssBaselineUpdater.js — Maintains rolling 7/14/28-day
    training load windows and personal bests for each swimmer. Updated
    automatically every time a performance is saved.

Data Storage:
  Collection: idssdecisions
  Collection: swimmerbaselines
  Model: backend/models/idssDecision.model.js
  Model: backend/models/swimmerBaseline.model.js

================================================================================
4. LAYER 2 — PYTHON AI MICROSERVICE (Phase 2 — Now Running)
================================================================================

Location: ai-service/
Entry Point: ai-service/main.py
Start Command: .\venv\Scripts\python.exe main.py

This is the advanced analytics engine. It reads directly from MongoDB using
pymongo, applies statistical models and machine learning algorithms, and
returns structured JSON. It never needs to know about the Angular session —
it is purely a data analysis service.

Module Structure:
  ai-service/
  ├── main.py               — FastAPI app, route definitions, startup
  ├── config.py             — Reads .env (MONGO_URI, DB_NAME, AI_PORT)
  ├── requirements.txt      — Python dependencies
  ├── .env                  — Local environment (MONGO_URI, AI_PORT=8000)
  ├── db/
  │   └── mongo.py          — MongoDB connection singleton (pymongo)
  ├── modules/
  │   ├── fatigue.py        — Rule-based fatigue scoring + ACWR computation
  │   ├── performance.py    — Trend analysis + Linear Regression prediction
  │   ├── recommendation.py — Weighted multi-factor swimmer ranking
  │   ├── simulation.py     — What-if scenario projection engine
  │   ├── explainability.py — Transparent reasoning for all decisions
  │   └── planning.py       — Personalized training plan generation
  └── utils/
      └── features.py       — Central feature engineering pipeline
                              (transforms raw MongoDB docs → ML features)

================================================================================
5. MONGODB DATA MODEL
================================================================================

Database: PFE_NATATION

Collections Used by IDSS:
  nageurs          — Swimmer profiles (age, sex, weight, specialties)
  users            — User accounts (name, email, role)
  performances     — Race/training results (time, intensity, fatigue, distance)
  entrainements    — Training sessions (date, duration, intensity, attendees)
  idssdecisions    — IDSS fatigue decisions (score, level, rules, recommendation)
  swimmerbaselines — Rolling training load history per swimmer

Key Fields Read by the Python AI Service:
  performances.nageur       → ObjectId linking to nageurs
  performances.temps        → Time string "1:02.34" or "58.5" (seconds)
  performances.intensity    → 1-10 intensity rating
  performances.fatigueLevel → 1-10 fatigue self-report
  performances.sessionLoad  → Computed training load value
  performances.style        → Stroke style (crawl, dos, brasse, papillon)
  entrainements.nageurs     → Array of ObjectIds (swimmers in this session)
  entrainements.duree       → Duration in minutes
  entrainements.intensite   → "Faible" / "Moderee" / "Elevee" / "Maximale"

================================================================================
6. AI MODULES DETAIL
================================================================================

── features.py (Core Pipeline) ──────────────────────────────────────────────
  Input:  swimmer_id (MongoDB ObjectId as string)
  Output: Feature dictionary for all other modules

  Features computed:
  - personal_best_sec     — All-time best time in seconds
  - avg_time_last5        — Average of last 5 performances
  - sessions_count        — Total sessions in analysis window
  - trend_slope           — Linear slope of times (negative = improving)
  - consistency_std       — Standard deviation of recent times
  - avg_fatigue_reported  — Mean self-reported fatigue (1-10)
  - avg_intensity         — Mean training intensity
  - sessions_last7d       — Sessions in past 7 days
  - sessions_last14d      — Sessions in past 14 days
  - total_load_7d         — Estimated km in past 7 days
  - total_load_14d        — Estimated km in past 14 days
  - total_load_28d        — Estimated km in past 28 days
  - acwr                  — Acute:Chronic Workload Ratio
  - consecutive_days      — Current training streak (days without rest)
  - avg_training_intensity— Mean intensity score (numeric)
  - attendance_rate       — Ratio of attended sessions

  Time parsing: supports "M:SS.ms" and "SS.ms" formats automatically.

── fatigue.py ────────────────────────────────────────────────────────────────
  Technique: Rule-based scoring (mirrors the Node.js engine but adds Python
             statistical capabilities for more nuanced analysis)

  6 Rules in the Python engine:
    ACWR_CRITICAL          — ACWR > 1.5 → +35 points
    ACWR_HIGH              — ACWR > 1.3 → +20 points
    CONSECUTIVE_DAYS_CRIT  — 6+ days → +30 points
    CONSECUTIVE_DAYS_HIGH  — 4+ days → +15 points
    HIGH_FATIGUE_REPORTED  — avg fatigue >= 8 → +25 points
    MODERATE_FATIGUE       — avg fatigue >= 6 → +10 points
    WEEKLY_OVERLOAD        — total_load_7d > 30km → +15 points
    PERFORMANCE_DECLINING  — slope > 0.5s/session → +10 points
    HIGH_INTENSITY_FREQ    — intensity >= 7 AND sessions >= 5 → +15 points

  Output per swimmer:
    fatigue_level (LOW/MEDIUM/HIGH/CRITICAL)
    fatigue_score (0-100)
    acwr, consecutive_days, avg_fatigue_reported
    recommendation (French text)
    triggered_rules (list of triggered rules with messages)
    confidence ("RULE_BASED")
    explanation (human-readable summary)

── performance.py ────────────────────────────────────────────────────────────
  Function 1: analyze_performance()
    Technique: Descriptive statistics + Linear Regression (numpy.polyfit)
    Purpose:   Analyze trend over a time window (default 90 days)
    Output:    trend (improving/stable/declining), slope, personal best,
               consistency score, improvement %, chart data for Angular

  Function 2: predict_time()
    Technique: Linear Regression (scikit-learn LinearRegression)
    Purpose:   Predict what time the swimmer will achieve at next competition
    Features:  Session index, intensity, session load, fatigue level, duration
    Output:    predicted_time_sec, confidence (HIGH/MEDIUM/LOW), R² score,
               feature importance coefficients, delta from personal best

── recommendation.py ─────────────────────────────────────────────────────────
  Technique: Multi-factor weighted scoring + Min-Max normalization

  Scoring Weights:
    35% — Recent performance (personal best time, lower = better)
    25% — Progression trend (negative slope = improving, higher = better)
    15% — Fatigue inverse (lower ACWR = lower fatigue = better readiness)
    10% — Attendance consistency
    10% — Performance consistency (low std deviation)
     5% — Experience (age as proxy)

  Each factor is normalized to 0-1 scale using Min-Max before weighting.
  Swimmers with insufficient data are excluded automatically.
  Output: Ranked list with score, trend, fatigue level, reasons for selection.

── simulation.py ─────────────────────────────────────────────────────────────
  Technique: Deterministic projection model (rule-based linear extrapolation)
  Purpose:   Answer "what if" questions about training plan changes

  How it works:
    1. Reads current training state (load, intensity, sessions, ACWR)
    2. Applies hypothetical changes (new sessions/week, new intensity, etc.)
    3. Projects ACWR after N simulation weeks (chronic load adapts slowly)
    4. Estimates performance delta (safe zone: +0.3s/10% load increase)
    5. Projects fatigue level based on projected ACWR
    6. Generates warnings for dangerous load increases (> 10%/week rule)

  Output: current vs projected state, warnings, explanation, fatigue change

── planning.py (NEW) ─────────────────────────────────────────────────────────
  Technique: Periodization-based training prescription
  Purpose:   Generate personalized training plans and team-wide recommendations

  How it works:
    1. Analyzes swimmer's current state (fatigue, ACWR, trend, load)
    2. Detects current periodization phase:
       - BASE:     Low intensity, building aerobic foundation (ACWR 0.8-1.0)
       - BUILD:    Progressive overload, increasing intensity (ACWR 1.0-1.3)
       - PEAK:     Competition preparation, high intensity (ACWR 1.2-1.5)
       - RECOVERY: Deload, fatigue reduction (ACWR < 0.8 or fatigue HIGH+)
    3. Prescribes load adjustments (increase/maintain/decrease with %)
    4. Generates weekly plans with intensity distribution
    5. Provides rest day scheduling and weekly focus areas
    6. Enforces safety: max 10% load increase per week

  Output per swimmer:
    detected_phase, adjustments (direction, %, sessions, intensity),
    weekly_plans (4 weeks with load, focus, intensity distribution),
    warnings, explanation

  Team planning:
    Groups swimmers by fatigue level, generates batch recommendations,
    identifies at-risk swimmers needing immediate attention.

================================================================================
7. EXPLAINABILITY LAYER
================================================================================

Location: ai-service/modules/explainability.py

The explainability module wraps around ALL other IDSS modules to provide
transparent, structured reasoning for every decision. This is critical for
building trust with coaches and decision-makers.

For EVERY decision type, the explainability layer provides:
  - summary:             Natural-language explanation in French
  - factor_contributions: Which factors contributed and by how much
  - reasoning_chain:     Step-by-step logic (numbered list)
  - data_quality:        BONNE / MOYENNE / FAIBLE / INSUFFISANTE
  - confidence:          How reliable the decision is
  - method:              The technique used (e.g., "Régression Linéaire")

Supported decision types:
  1. FATIGUE_DETECTION   — Why is this swimmer at risk?
  2. PERFORMANCE_PREDICTION — Why was this time predicted?
  3. COMPETITION_RECOMMENDATION — Why was this swimmer ranked #1?
  4. SCENARIO_SIMULATION — What would happen if we change the plan?

Usage: POST /explain {"decision_type": "fatigue", "swimmer_id": "..."}

================================================================================
8. API ENDPOINT REFERENCE
================================================================================

NODE.JS BACKEND (port 3300) — All require JWT Bearer Token

  IDSS Rule Engine Endpoints:
    POST   /idss/analyze/:performanceId   — Run engine on a performance record
    GET    /idss/decisions                — Get all decisions (filter by nageurId/level)
    GET    /idss/decisions/latest/:id     — Latest decision for one swimmer
    GET    /idss/summary                  — Dashboard summary (at-risk, counts)
    GET    /idss/my-status                — Swimmer's own status (role: nageur)
    GET    /idss/baseline/:nageurId       — Get swimmer's rolling baseline
    PATCH  /idss/baseline/:nageurId       — Update baseline targets
    PATCH  /idss/decisions/:id/acknowledge— Coach acknowledges an alert
    GET    /idss/history/:nageurId        — Full decision history (for charts)

  AI Proxy Endpoints (→ Python port 8000):
    GET    /ai/health                     — Health check (both Node + Python)
    GET    /ai/dashboard                  — Fatigue status for ALL swimmers
    POST   /ai/analyze    {swimmer_id}    — Performance trend analysis
    POST   /ai/predict    {swimmer_id}    — Predict next race time
    POST   /ai/fatigue    {swimmer_ids}   — Fatigue detection (single or batch)
    POST   /ai/recommend  {stroke,dist}   — Rank swimmers for competition
    POST   /ai/simulate   {swimmer_id, changes} — Training scenario simulation
    POST   /ai/explain    {decision_type} — Explainability for any decision
    POST   /ai/plan       {swimmer_id}    — Personalized training plan
    GET    /ai/team-plan                  — Team-wide training planning
    POST   /ai/batch-analyze              — Analyze all swimmers at once

PYTHON AI SERVICE (port 8000) — Internal only, not exposed to Angular directly

  GET  /health         — Service health + MongoDB connectivity status
  GET  /dashboard      — Fatigue batch for all swimmers
  POST /analyze        — Performance trend analysis
  POST /predict        — Time prediction (LinearRegression)
  POST /fatigue        — Fatigue detection
  POST /recommend      — Swimmer ranking
  POST /simulate       — Scenario simulation
  POST /explain        — Explainability layer (transparent reasoning)
  POST /plan           — Personalized training plan
  GET  /team-plan      — Team-wide training planning
  POST /batch-analyze  — All swimmers analysis

  Interactive API docs: http://localhost:8000/docs (Swagger UI)

================================================================================
9. HOW TO RUN EVERYTHING
================================================================================

Step 1 — Start MongoDB
  Make sure MongoDB is running on localhost:27017
  Database: PFE_NATATION

Step 2 — Start the Python AI Service
  cd ai-service
  .\venv\Scripts\python.exe main.py
  -- OR --
  .\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload
  
  Expected output:
    [IDSS AI] Starting on port 8000...
    [OK] MongoDB connected! Database: PFE_NATATION
    INFO: Uvicorn running on http://0.0.0.0:8000

Step 3 — Start the Node.js Backend
  cd backend
  npm start
  
  Expected output:
    Connected to MongoDB
    Server started on port 3300

Step 4 — Start the Angular Frontend
  cd frontend
  ng serve
  
  Access: http://localhost:4200

Health Check (verify all services are running):
  Invoke-WebRequest http://localhost:3300/ai/health
  Expected: {"node":"ok","ai":{"status":"ok","mongodb":"connected"}}

API Docs (Python FastAPI Swagger):
  http://localhost:8000/docs

================================================================================
10. DATA FLOW (END-TO-END)
================================================================================

Scenario: Coach saves a performance result for swimmer "Jamai Raed"

  1. Angular component calls POST /performances (with JWT token)
  2. Node.js performance.Controller.js saves the performance to MongoDB
  3. Controller automatically calls updateBaseline(nageurId):
       - Fetches all trainings in past 7/14/28 days
       - Computes rolling load windows
       - Saves/updates swimmerbaselines collection
  4. Controller calls evaluateRules(performance, baseline):
       - Runs all 11 rules against current data
       - Computes fatigue score and level
       - Generates recommendation text
  5. Decision is saved to idssdecisions collection
  6. Angular dashboard refreshes /idss/summary → shows updated risk counts

Scenario: Coach opens AI Analysis tab on dashboard

  1. Angular calls GET /ai/dashboard (with JWT)
  2. Node.js aiRoutes.js proxies to GET http://localhost:8000/dashboard
  3. Python fatigue.py calls get_all_swimmer_ids() → fetches all nageur IDs
  4. For each swimmer: compute_features() fetches performances + trainings
  5. Feature pipeline computes ACWR, trend slope, fatigue reported, etc.
  6. Rules are applied, fatigue score and level determined
  7. Batch result returned: {total_analyzed, level_distribution, decisions[]}
  8. Angular displays real-time fatigue status cards for each swimmer

Scenario: Coach requests explanation for a fatigue decision

  1. Angular calls POST /ai/explain {"decision_type":"fatigue","swimmer_id":"..."}
  2. Node.js proxies to Python /explain endpoint
  3. Python runs detect_fatigue_single() then wraps result in explainability
  4. Returns: summary, factor_contributions, reasoning_chain, data_quality
  5. Angular displays transparent explanation in the IDSS insight panel

Scenario: Coach generates a personalized training plan

  1. Angular calls POST /ai/plan {"swimmer_id":"...","target_weeks":4}
  2. Node.js proxies to Python /plan endpoint
  3. Python detects periodization phase (BASE/BUILD/PEAK/RECOVERY)
  4. Calculates adjustments based on fatigue, ACWR, and trend
  5. Returns weekly plans with load, intensity distribution, and focus
  6. Angular displays the plan in the coach's training management view

================================================================================
11. TECHNOLOGIES USED
================================================================================

BACKEND (Node.js):
  Runtime:       Node.js v18+
  Framework:     Express.js 4.x
  Database ODM:  Mongoose 8.x
  Auth:          JSON Web Tokens (jsonwebtoken)
  PDF Gen:       PDFKit
  HTTP Client:   Axios (for proxying to Python service)
  File Uploads:  Multer

PYTHON AI SERVICE:
  Runtime:       Python 3.13
  Framework:     FastAPI 0.136+ (async, auto Swagger docs)
  Server:        Uvicorn (ASGI, with hot reload in dev)
  Database:      PyMongo 4.17 (direct MongoDB driver)
  Data Pipeline: Pandas 3.x + NumPy 2.x
  ML Models:     Scikit-Learn 1.8 (LinearRegression, R² scoring)
  Statistics:    SciPy 1.17 (future: advanced statistical tests)
  Validation:    Pydantic 2.x (request/response models)
  Config:        python-dotenv

FRONTEND (Angular):
  Framework:     Angular 17+ (standalone components)
  HTTP:          Angular HttpClient (with JWT interceptor)
  UI:            Custom CSS (dark glassmorphism theme)
  Charts:        Chart.js via ng2-charts

DATABASE:
  Engine:        MongoDB 6+ (Community Edition)
  Connection:    mongodb://localhost:27017/PFE_NATATION
  ODM (Node):    Mongoose schemas with indexes
  Driver (Py):   PyMongo with connection pooling

AI/SPORTS SCIENCE TECHNIQUES:
  ACWR:          Acute:Chronic Workload Ratio (sports science gold standard)
                 Formula: acute_load_7d / (chronic_load_28d / 4)
                 Safe zone: 0.8 - 1.3 | Danger zone: > 1.5
  Trend:         Least-squares linear regression (numpy.polyfit)
  Prediction:    Multivariate Linear Regression (scikit-learn)
                 Features: session index, intensity, load, fatigue, duration
  Ranking:       Min-Max normalization + weighted sum
  Simulation:    Deterministic load projection with chronic adaptation model
  Planning:      Periodization-based prescription (BASE/BUILD/PEAK/RECOVERY)
  Explainability:Factor decomposition + reasoning chains + data quality scoring

================================================================================
12. ADVANCEMENT STATUS
================================================================================

  [X] Rule-based fatigue detection (Node.js — always on, 11 rules)
  [X] Python AI service with FastAPI + MongoDB
  [X] Feature engineering pipeline (ACWR, trend, consistency, load windows)
  [X] Performance trend analysis (linear regression, improving/stable/declining)
  [X] Race time prediction (scikit-learn LinearRegression, R² confidence)
  [X] Swimmer competition ranking (multi-factor weighted scoring, Min-Max)
  [X] Training scenario simulation (what-if projection, ACWR-based)
  [X] Explainability layer (transparent reasoning for ALL decisions)
  [X] Training planning module (periodization, personalized adjustments)
  [X] Team-wide planning recommendations (batch analysis, risk grouping)
  [X] Angular dashboard integration (real data, no fake stats)
  [X] JWT-authenticated proxy chain (Angular → Node → Python)
  [X] All data locally managed — no external AI APIs

================================================================================
END OF IDSS AI BRAIN README
================================================================================
