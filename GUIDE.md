# 🏆 HCM LITE — RAAT KI GUIDE (Roman Urdu)

> **Task:** AI-assisted Human Capital Management system — 3 roles (Admin, HR, Employee), 9 modules, AI assistant jo real data se jawab de.
> **Sab se zaroori:** Judges FRESH INSTALL se shuru karte hain — koi dummy data NAHI. Admin company banayega, HR employees, phir sab numbers unhi se aayenge.

---

## 📋 TONIGHT'S PLAN — Kya bana raha hai (priority order)

| # | Module | Kya hoga | Status |
|---|--------|----------|--------|
| 1 | Auth + Roles | Login, 3 roles (Admin/HR/Employee), first-run setup wizard, server-side guards | 🔨 |
| 2 | Org Setup | Company settings (office 9:00, grace 15 min, weekend), departments, leave types (annual 14, sick 8, casual 10), holidays | 🔨 |
| 3 | Employees | HR registers employee → login banta hai (temp password), directory + search, Employee 360 | 🔨 |
| 4 | Attendance | Web check-in/out (server time), late/half-day/missing-checkout rules, daily board, calendar, corrections | 🔨 |
| 5 | Leave | Apply/cancel, balance, overlap+holiday check, HR approval with comment | 🔨 |
| 6 | Payroll Lite | Salary structure, monthly run, gross = 1.5×basic, tax slab, payslip PDF, Admin finalize (lock) | 🔨 |
| 7 | Dashboards | 3 dashboards (Admin: headcount/attrition/cost · HR: present/late/pending · Employee: own hours/leave) | 🔨 |
| 8 | AI Assistant | Chat panel + tools (headcount, attendance, late-comers, leave balance, payroll) + **smart leave** ("next Monday Tuesday off" → pre-filled form) + dashboard "Summarize" | 🔨 |
| 9 | Comms & Audit | Announcements, notifications, audit log | 🔨 |
| 10 | README + Deploy | Judges ke liye README, Vercel deploy | 🔨 |

**Score strategy (100 pts):** Core flows 25 + Analytics 20 + AI 15 + Code quality 15 + UI 10 + Security 10 + Demo 5. Bonus (camera attendance waghera) — sirf time mile to.

---

## 🤝 KAAM KI TAQSEEM

### 🤖 Mera kaam (ZCode):
- Poora application code — saare pages, API routes, business rules, AI assistant, README, GitHub push

### 🧑‍💻 Aap ka kaam (Ghous) — sirf yeh GUI steps:

#### STEP 1 — Naya SQL run karna (jab main kahoon)
- Purani `demo_tasks` hat jayegi, naye HCM tables banenge (employees, attendance, leave, payroll waghera)
- Supabase → SQL Editor → New query → main jo SQL doon paste → Run → "Success" ka msg mujhe batao

#### STEP 2 — AI API key (10 min, OPTIONAL lekin 15 points ka hai!)
AI assistant ke liye **free LLM API key** chahiye. Sab se easy (free + fast):
1. **[console.groq.com](https://console.groq.com)** kholen → Google/GitHub se sign up (free)
2. Left sidebar → **API Keys** → **Create API Key** → key copy karo
3. Mujhe chat mein de do (ya khud `.env.local` mein last line add karo): `AI_API_KEY=gsk_...`
- Agar key na mile to bhi chalega — main rule-based fallback bana raha hoon (demo crash nahi hoga, lekin real AI key se zyada impression)

#### STEP 3 — Vercel Deploy (judges ke liye HOSTED LINK zaroori — subah/taiyar hone par)
1. Main code GitHub par push karunga (already connected)
2. **[vercel.com](https://vercel.com)** → GitHub se login → **Add New → Project** → `Final_Hackathone` repo select
3. **Environment Variables** mein 3 cheezein add karo (main values dunga):
   - `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `AI_API_KEY`
4. Deploy → live URL milega (wohi submit karna hai LMS par)

#### STEP 4 — Demo practice (5-minute script brief mein hai)
- Fresh setup → Admin company banata hai → HR login → HR 2-3 employees register → employee login → check-in → plain words mein leave ("need Monday Tuesday off") → HR approve → dashboard + Summarize → payroll run → Admin finalize → payslip download → "colleague ki salary?" (AI refuse karega) → audit log

---

## 📁 DATABASE TABLES (mera schema, aap ka SQL run)

`company_settings` · `profiles` (roles) · `departments` · `designations` · `leave_types` · `holidays` · `employees` · `attendance` · `attendance_corrections` · `leave_requests` · `payroll_runs` · `payslips` · `announcements` · `notifications` · `audit_log` · `ai_logs`

---

## 🚨 EMERGENCY TIPS

| Masla | Hal |
|-------|-----|
| Kuch kaam na kare | Mujhe poora error text do — main fix karunga |
| Keys badli? | Dev server restart (Ctrl+C → `npm run dev`) |
| Port busy | `npx next dev -p 3001` |
| AI jawab na de | Fallback rule-based jawab chalega — demo nahi rukega |
| Vercel deploy fail | Local demo bhi chal sakta hai, main help karunga |
| Time kam | Core flows (login→employee→check-in→leave→payroll) pehle — baaki skip |

---

## 🔒 SECURITY (brief ki demands — main implement kar raha hoon)

- Har API request par server-side role + scope check (sirf button chhupana kaafi nahi)
- AI key sirf backend env mein — browser kabhi AI ko directly call nahi karta
- Employee sirf apna data dekh sakta hai; doosre ki salary par AI bhi refuse karega
- Audit log har important action ka

**Good luck — aaj raat poora system banega! 🚀**
