# HCM Lite — AI-assisted Human Capital Management

Saylani Hackathon · 24 Oct 2026 · Built by **Muhammad Ghous Raza**

A web-based HR system for the daily work of an HR team, with an **AI assistant that answers questions from real data**. The system starts **empty** — Admin sets up the company, HR registers employees, and every number comes from what people do in the app.

## Stack

- **Frontend:** Next.js 16 (App Router, JavaScript) + Tailwind CSS
- **Backend:** Next.js API route handlers (server-side role + scope checks on every request)
- **Database & Auth:** Supabase (Postgres + Supabase Auth)
- **AI:** Any OpenAI-compatible LLM API with tool calling (default: Groq `openai/gpt-oss-120b`, free tier) + rule-based fallback

## Quick start (under 10 minutes)

```bash
# 1. Install
npm install

# 2. Create a free Supabase project (supabase.com), then:
#    - SQL Editor -> paste the whole supabase/schema.sql -> Run
#    - Authentication -> Sign In / Providers -> Email -> turn OFF "Confirm email"
#    - Settings -> API -> copy Project URL + anon/publishable key

# 3. Environment (.env.local — see .env.example)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
AI_API_KEY=gsk_...            # optional — free key from console.groq.com
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=openai/gpt-oss-120b

# 4. Run
npm run dev
# open http://localhost:3000 -> First-run Setup creates the Admin account
```

**First Admin:** created by the first-run setup wizard at `/setup` (no seed data, no dummy users).

## Demo accounts (our test run)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@saylani.tech | admin789 |
| HR | hr@saylani.tech | hr789456 |
| Employee | ali@saylani.tech | ali12345 |
| Employee | sana@saylani.tech | Hcm@41ndw11! (temp — change on login) |

> Judges: start from `/setup` on a fresh database — the wizard creates the company + Admin in one screen.

## What's implemented (9 modules)

| Module | Status | Details |
|--------|--------|---------|
| M1 Auth & Access | ✅ | Login/logout, 3 roles, forced temp-password change, middleware-protected routes, server-side role checks on every API |
| M2 Organization Setup | ✅ | Company settings (office 09:00, grace 15 min, weekend picker, office lat/lng/radius), departments, designations, leave types + quotas, public holidays |
| M3 Employees | ✅ | HR registration **creates the employee's login** with temp password, directory with server-side search/filter/paging, Employee 360 profile |
| M4 Attendance | ✅ | Web check-in/out (**server-stamped time**), one record/day (409 on repeat), late after 09:15, half-day < 5h, daily board, own calendar, correction request → HR approve |
| M5 Leave | ✅ | Working-days-only counting (weekends + holidays skipped), quotas annual 14 / sick 8 / casual 10 / unpaid unlimited, overlap + over-balance rejected (422), cancel pending, HR approve/reject with comment |
| M6 Payroll Lite | ✅ | Gross = 1.5 × basic (HRA 40%, medical 10%), per-day deductions (absent + unpaid + 0.5 × half-days), prorated joiners, tax slab on annual gross, monthly draft by HR, **finalize locks the month (Admin only)**, payslip print/PDF |
| M7 Dashboards | ✅ | Admin (headcount, attrition, payroll cost, avg salary, dept split, audit feed), HR (present/late/on-leave today, pending approvals, 7-day trend, top late-comers, leave by type), Employee (check-in widget, hours, balances, last payslip) — all computed server-side |
| M8 AI Assistant | ✅ | Chat with 7 role-scoped tools, live LLM (Groq) with graceful rule-based fallback, dashboard-matching answers, **smart leave** ("I need next Monday and Tuesday off for my sister's wedding" → pre-filled form), policy Q&A, refuses salary questions, 15s timeout, ~20 req/hour limit, ai_logs |
| M9 Comms & Audit | ✅ | Announcements (Admin/HR post, everyone reads, notify all), in-app notifications (leave decisions, payslips, welcome), audit log of create/update/approve/finalize with actor + before/after JSON |

## Business rules (from the brief, in `lib/rules.js`)

- Office 09:00 + 15 min grace → late; < 5 h worked → half day; no record + no approved leave → absent
- One attendance record per employee per day; second check-in → 409
- Leave counts working days only; overlapping/over-balance requests → 422
- Gross = 1.5 × basic; per-day = gross ÷ working days; deduct absent + unpaid + 0.5 × half-days
- Tax slab (illustrative, annual): 0 ≤600k · 5% ≤1.2M · 30k+15% ≤2.4M · 210k+25% ≤3.6M · 510k+35% above
- Payroll finalized by Admin = locked, HR cannot edit

## Security

- Every API route checks role **and** data scope server-side (an Employee only reads their own rows)
- AI key lives only in server env (`AI_API_KEY`) — the browser never calls the provider
- The AI never queries the DB directly: tools reuse the same permission checks as the REST API
- Salary is never exposed to employees via any tool — the assistant refuses
- `.env.local` is git-ignored; only `.env.example` is committed

## Not done / notes

- CSV import/export (M3 optional), camera + geofence attendance (bonus) — not implemented
- Password reset by Admin (deactivate is implemented; reset is not — Supabase service key would be needed)
- Tax is illustrative, as the brief allows

## 5-minute demo script

1. `/setup` → create company + Admin → sign in
2. Admin → Org Setup (add department) → Users & HR → create HR login (temp password shown)
3. HR signs in (changes temp password) → Employees → register 2 employees (logins + temp passwords created)
4. Employee signs in, changes password, **Check In** (status appears live)
5. Employee → Ask AI → *"I need next Monday and Tuesday off for my sister's wedding"* → pre-filled leave form → confirm
6. HR → Leave → Approve (with comment) → Dashboard → Ask AI *"Who is on leave?"*
7. HR → Payroll → Create Draft (current month) → review payslips
8. Admin → Payroll → **Finalize** (locks)
9. Employee → My Payslips → view/print payslip; asks AI *"What is Sana's salary?"* → **refused**
10. Admin → Audit Log → every action recorded

## Deploy (Vercel)

1. Push to GitHub, import the repo on vercel.com
2. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `AI_API_KEY` (+ `AI_BASE_URL`, `AI_MODEL` if not Groq default)
3. Deploy — the app starts from first-run setup, so judges create the company themselves
