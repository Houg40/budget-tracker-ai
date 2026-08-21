# Budget Tracker AI

A personal budget tracker built to explore how AI can be integrated into everyday
personal finance tools, and to serve as my own real day-to-day budget tracker.
Log transactions, categorize them, view spending broken down by category and
over time, all behind a real login so the data is actually private per user.

## Stack
- **Frontend:** Next.js (App Router, TypeScript, Tailwind CSS), Recharts for data visualization
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL (hosted on Neon), with SQLModel + Alembic for schema and migrations
- **Auth:** Self-rolled JWT authentication (bcrypt password hashing, httpOnly session cookies)
- **AI:** Anthropic API (planned — see Roadmap)

## Features
- **Authentication:** signup/login/logout with bcrypt-hashed passwords and JWT
  sessions stored in httpOnly cookies (not accessible to JavaScript, for
  better protection against XSS token theft)
- **Per-user data isolation:** every account and transaction belongs to a
  single user; the API enforces this at every endpoint, returning a 404
  (never confirming a resource's existence) if you try to touch data that
  isn't yours
- Full CRUD for transactions (create, view, edit category, delete)
- Manual category assignment via dropdown, with corrections tracked separately
  from future AI assignments (`user_corrected` flag)
- Spending dashboard: total spent this month, spending by category (bar chart),
  spending over time (area chart)
- Seeded default categories, with a default account created automatically on signup
- Graceful error handling when the API is unreachable

## Running locally

### Backend
1. `cd backend`
2. Create a virtual environment and activate it:

python -m venv venv
venv\Scripts\activate

3. Install dependencies:

pip install -r requirements.txt

4. Create a `.env` file (see `.env.example`) with your own Neon `DATABASE_URL`
   and a `JWT_SECRET_KEY` (any long random string — e.g. generate one with
   `python -c "import secrets; print(secrets.token_urlsafe(32))"`).
5. Apply database migrations:

alembic upgrade head

6. (Optional) Seed the default categories:

python seed.py

7. Start the API:

uvicorn main:app --reload

   The API is now running at `http://localhost:8000`. Interactive docs are at
   `http://localhost:8000/docs`.

### Frontend
1. `cd frontend`
2. Install dependencies:

npm install

3. Create a `.env.local` file (see `.env.local.example`) with:

NEXT_PUBLIC_API_URL=http://localhost:8000

4. Start the dev server:

npm run dev

   The app is now running at `http://localhost:3000`.

### Creating an account
There's no signup page in the UI yet (see Roadmap). In the meantime, create an
account via the API docs at `http://localhost:8000/docs`: expand
`POST /auth/signup`, provide an email and password (minimum 8 characters), and
execute. A default account is created for you automatically.

## Status
Backend authentication (signup/login/logout, JWT + httpOnly cookies, and
per-user data ownership enforcement across every endpoint) is complete and
tested. Frontend authentication (login/signup pages, session handling) is in
progress.

## Roadmap
Planned next, in order:
1. **Frontend authentication** — login/signup pages, session-aware requests, protected routes
2. **Deployment** — get the app accessible from anywhere, not just localhost
3. **Multiple accounts** — UI for managing more than one account per user (checking, savings, credit card, etc.)
4. **CSV import** — bulk-import transactions from a bank export
5. **Budgets & overspending alerts** — set a monthly budget per category and get flagged when over
6. **Recurring transactions** — auto-log transactions that repeat on a schedule

Further out / backlog:
- **AI-assisted categorization** — the schema (`ai_confidence`, `user_corrected`
  on `Transaction`) was designed from the start to support this without
  rework, but it's deprioritized in favor of the features above, which matter
  more for actually using this as a real budget tracker day to day.