# SmartInterview AI — Company-Based Interview Practice Platform

**Step 3 of the build:** a company-aware round engine (service-based
companies get Aptitude + MCQ, product-based ones skip Aptitude, Group
Discussion only shows up where the company actually runs one, System
Design only for roles that own architecture decisions), a new **Technical
MCQ Round** (15 questions — DBMS, OS, OOP, CN, Programming, Mixed — 5
Easy/6 Medium/4 Hard, 20-minute timer), the Aptitude Round's timer reduced
to 25 minutes, the home page's round order updated to the canonical
8-step sequence, and a rename to **SmartInterview AI**.

## What's actually built vs. scaffolded

| Round                        | Status                                                |
|-------------------------------|--------------------------------------------------------|
| 1. Resume Screening (AI)      | ✅ Built — AI + heuristic fallback resume scoring       |
| 2. Aptitude Round              | ✅ Built — 15 Qs, 25-min timer, time-behavior analysis  |
| 3. Technical MCQ Round        | ✅ Built — 15 Qs, 20-min timer, difficulty breakdown    |
| 4. Group Discussion (GD)      | 🔒 Scaffolded, shown only if the company runs one       |
| 5. Coding Round                | 🔒 Scaffolded ("coming soon")                          |
| 6. Technical Interview Round  | 🔒 Scaffolded ("coming soon")                          |
| 7. System Design Round        | 🔒 Scaffolded, shown only for roles flagged `isAdvanced`|
| 8. Behavioral / HR Round      | 🔒 Scaffolded ("coming soon")                          |

## The flow

```
Login → Dashboard (profile, progress, mode picker)
  │
  ├─ Practice Mode → Select Role → Round map (all applicable rounds for that role)
  │
  └─ Company Mode → Select Company → Select Role → Round map
                                                     (only the rounds THIS company
                                                      actually runs, for THIS role)
                          │
                          ├─ Resume Screening → upload + AI analysis
                          ├─ Aptitude Round   → 15 Qs / 25 min → feedback
                          └─ Technical MCQ    → 15 Qs / 20 min → feedback
```

### Company-aware round logic (`config/companies.js` → `getEffectiveRoundKeys`)

This is the single source of truth for "which rounds apply here" — nothing
else hand-rolls this logic:

- **Resume Screening always applies.**
- **`type: "service-based"`** (TCS, Infosys, Wipro) → Aptitude + Technical
  MCQ are always included, even if not explicitly listed for that company.
- **`type: "product-based"`** (Amazon, Google, Microsoft) → Aptitude is
  always excluded; these companies lean on coding rounds instead.
- **`hasGD: true`** → Group Discussion is included; otherwise it's dropped
  even if a company object happens to list it.
- **System Design** only survives for roles with `isAdvanced: true` in
  `config/roles.js` (SDE, Backend, Full Stack, Data Scientist, DevOps —
  not Frontend, QA, or Data Analyst).

`GET /api/companies/:slug/rounds?role=<roleId>` is what the Rounds Map
screen actually renders from, so the list shown after picking a company
**and** a role is always the real, filtered, correctly-ordered set — not
a generic 8-round list with some grayed out.

## Stack

| Layer      | Choice                                                            |
|------------|--------------------------------------------------------------------|
| Frontend   | React 18 + Vite, React Router, Tailwind CSS, Axios, react-hot-toast |
| Backend    | Node.js + Express, MongoDB + Mongoose, JWT (httpOnly cookie), bcrypt |
| AI         | Groq (llama-3.3-70b-versatile) for resume analysis + question generation, with a fully offline dynamic fallback for both |
| File parsing | multer (upload), pdf-parse (PDF), mammoth (DOCX) |
| Security   | helmet, express-rate-limit, express-validator, CORS with credentials |

## Project structure

```
interview-platform/
├── backend/
│   ├── config/
│   │   ├── db.js                    # MongoDB connection
│   │   ├── companies.js             # Company catalog + getEffectiveRoundKeys
│   │   ├── roles.js                 # Role catalog (skills + isAdvanced flag)
│   │   ├── rounds.js                # The 8-round map, canonical order, enabled flags
│   │   ├── questionUtils.js         # Shared RNG/option-building helpers
│   │   ├── aptitudeBank.js          # Aptitude question generators (5 cats x 3)
│   │   └── technicalMcqBank.js      # Technical MCQ generators (DBMS/OS/OOP/CN/Prog/Mixed)
│   ├── services/
│   │   ├── groqService.js           # Groq API wrapper — returns null on any failure
│   │   ├── resumeParser.js          # PDF/DOCX/TXT text extraction
│   │   ├── resumeAnalyzer.js        # AI + heuristic fallback resume scoring
│   │   ├── mcqEvaluation.js         # Shared scoring + time-behavior analysis (both MCQ rounds)
│   │   ├── aptitudeService.js       # Aptitude question generation, wraps mcqEvaluation
│   │   ├── technicalMcqService.js   # Technical MCQ generation + per-user repeat avoidance
│   │   └── roundProgress.js         # Attaches a user's attempt status onto round defs
│   ├── controllers/
│   │   ├── authController.js, resumeController.js,
│   │   ├── aptitudeController.js, technicalMcqController.js,
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── authMiddleware.js, upload.js, errorMiddleware.js
│   ├── models/
│   │   ├── User.js                  # auth + profile fields (resume, skills, mode)
│   │   └── Attempt.js               # one doc per round attempt (questions, score, feedback)
│   ├── routes/
│   │   ├── authRoutes.js, companyRoutes.js (incl. /:slug/rounds), roleRoutes.js,
│   │   ├── roundRoutes.js (incl. /for-role), resumeRoutes.js,
│   │   └── aptitudeRoutes.js, technicalMcqRoutes.js, dashboardRoutes.js
│   └── server.js
└── frontend/
    └── src/
        ├── api/
        │   ├── axios.js                  # shared API client (sends auth cookie)
        │   └── practice.js                # roles/rounds/resume/aptitude/mcq/dashboard calls
        ├── context/AuthContext.jsx        # global auth state (register/login/chooseMode)
        ├── components/
        │   ├── AuthLayout.jsx, Logo.jsx, Navbar.jsx, ProtectedRoute.jsx,
        │   └── RoundTrackerCard.jsx (full 8-round homepage preview), RoundStatusBadge.jsx
        └── pages/
            ├── Landing.jsx, Login.jsx, Register.jsx
            ├── Dashboard.jsx        # profile + progress + mode picker (lands here after login)
            ├── CompanySelect.jsx    # company picker for Company-Based Mode
            ├── RoleSelect.jsx       # role picker (both modes) — loads the round map next
            ├── PracticeSetup.jsx    # Resume Screening: upload + AI analysis
            ├── RoundsMap.jsx        # the real, filtered, ordered round list for mode+role(+company)
            ├── AptitudeRound.jsx    # 25-min timed test runner + feedback report
            ├── TechnicalMcqRound.jsx# 20-min timed test runner + feedback report
            └── NotFound.jsx
```

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env     # then fill in MONGO_URI and JWT_SECRET
npm install
npm run dev               # starts on http://localhost:5000
```

You need a running MongoDB instance — either local
(`mongodb://127.0.0.1:27017/interview_platform`) or a free
[MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**AI is optional.** Leave `GROQ_API_KEY` blank in `.env` and resume
analysis, Aptitude questions, and Technical MCQ questions all run on the
built-in dynamic fallback generators (randomized/curated content, no
external call, never repeats a user's last 3 attempts' questions where
avoidable). Set `GROQ_API_KEY` (get one at console.groq.com) to have Groq
generate both question sets instead — the fallback still kicks in
automatically if any AI call fails or returns malformed output.

### 2. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL should point at the backend
npm install
npm run dev                # starts on http://localhost:5173
```

Open `http://localhost:5173`, register an account, and you'll land on
the Dashboard.

## How auth works

- Passwords are hashed with bcrypt (12 salt rounds) before being stored.
- On register/login, the API signs a JWT and sets it as an **httpOnly
  cookie** — unreadable by client-side JS.
- `withCredentials: true` on the Axios instance sends that cookie with
  every request.
- `GET /api/auth/me` silently restores a session on app load, so a
  refresh doesn't log the user out.
- `ProtectedRoute` blocks every post-login route until that check
  resolves with a valid user.

## How the timed MCQ rounds work (Aptitude + Technical MCQ)

Both rounds share the same engine (`services/mcqEvaluation.js`), just with
different question banks, timers, and pass/fail thresholds:

|                        | Aptitude Round             | Technical MCQ Round                          |
|------------------------|------------------------------|-----------------------------------------------|
| Questions               | 15 (5 categories × 3)        | 15 (DBMS×3, OS×3, OOP×2, CN×2, Programming×3, Mixed×2) |
| Difficulty tagging       | —                             | 5 Easy / 6 Medium / 4 Hard, fixed distribution  |
| Timer                    | 25 minutes                   | 20 minutes                                     |
| "Guessed" threshold      | ≤6s + wrong                  | ≤5s + wrong                                    |
| "Slow" threshold         | ≥75s                          | ≥60s                                            |

- `POST /api/aptitude/start` / `POST /api/technical-mcq/start` generate
  the question set (Groq if configured, otherwise the local generator)
  and store it **server-side** on the `Attempt` document, correct answers
  included — the client only ever receives prompt + options, so scoring
  can't be spoofed.
- The frontend timer counts down and tracks time spent per question by
  timestamping whenever the active question changes, accumulating elapsed
  time per question ID (revisiting a question adds to its total rather
  than resetting it). Reaching 0:00 auto-submits.
- **Repetition avoidance:** before generating a fallback Technical MCQ
  set, the service looks up the user's last 3 Technical MCQ attempts and
  passes their question IDs as an exclusion set (`pickFresh` in
  `questionUtils.js`) — the generator prefers bank entries the user
  hasn't seen recently, falling back gracefully once a bank is exhausted.
- On submit, the response includes a category breakdown, a difficulty
  breakdown (Technical MCQ only), the time-analysis summary, and an
  AI-authored or templated feedback object.

## API reference (Step 3 additions)

| Method | Route                              | Access  | Description                                          |
|--------|--------------------------------------|---------|--------------------------------------------------------|
| GET    | `/api/rounds/for-role?role=<id>`    | Private | Practice Mode's applicable rounds + this user's status |
| GET    | `/api/companies/:slug/rounds?role=<id>` | Private | This company's actual rounds for this role + status |
| POST   | `/api/technical-mcq/start`          | Private | Generate a 15-question Technical MCQ attempt            |
| POST   | `/api/technical-mcq/:id/submit`     | Private | Score it, run time-behavior + difficulty analysis        |

## Roadmap (next steps)

1. Group Discussion round — simulated multi-perspective panel on a topic.
2. Coding round: in-browser editor + sandboxed execution against sample
   and hidden test cases.
3. Technical Interview / System Design / Behavioral — conversational
   AI-driven rounds.
4. Attempt-resume-after-refresh for timed rounds (the attempt is already
   persisted server-side mid-test; the UI doesn't reconnect to it yet).
