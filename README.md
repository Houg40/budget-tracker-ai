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
- **Authentication:** signup and login pages, backed by bcrypt-hashed passwords
  and JWT sessions stored in httpOnly cookies (not accessible to JavaScript,
  for better protection against XSS token theft)
- **Per-user data isolation:** every account and transaction belongs to a
  single user; the API enforces this at every endpoint, returning a 404
  (never confirming a resource's existence) if you try to touch data that
  isn't yours. Verified with a second test account that cross-user
  reads/writes/deletes all correctly fail.
- Full CRUD for transactions (create, view, edit category, delete)
- Manual category assignment via dropdown, with corrections tracked separately
  from future AI assignments (`user_corrected` flag)
- Spending dashboard: total spent this month, spending by category (bar chart),
  spending over time (area chart)
- Seeded default categories, with a default account created automatically on signup
- Graceful error handling when the API is unreachable or a request fails

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
Visit `http://localhost:3000/signup`, enter an email and a password (minimum
8 characters), and submit. A default account is created for you automatically
and you're taken straight to the transactions page, logged in.

## Status
Authentication is complete end to end — backend (signup/login/logout, JWT +
httpOnly cookies, per-user data ownership enforcement) and frontend
(login/signup pages, session-aware requests, protected-route redirects) are
both built and tested.

## Roadmap
Planned next, in order:
1. **Deployment** — get the app accessible from anywhere, not just localhost
2. **Multiple accounts** — UI for managing more than one account per user (checking, savings, credit card, etc.)
3. **CSV import** — bulk-import transactions from a bank export
4. **Budgets & overspending alerts** — set a monthly budget per category and get flagged when over
5. **Recurring transactions** — auto-log transactions that repeat on a schedule

Further out / backlog:
- **AI-assisted categorization** — the schema (`ai_confidence`, `user_corrected`
  on `Transaction`) was designed from the start to support this without
  rework, but it's deprioritized in favor of the features above, which matter
  more for actually using this as a real budget tracker day to day.