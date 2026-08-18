# Budget Tracker AI

A personal budget tracker built to explore how AI can be integrated into everyday
personal finance tools. Log transactions, categorize them, and view spending
broken down by category and over time.

## Stack
- **Frontend:** Next.js (App Router, TypeScript, Tailwind CSS), Recharts for data visualization
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL (hosted on Neon), with SQLModel + Alembic for schema and migrations
- **AI:** Anthropic API (planned — see Roadmap)

## Features
- Full CRUD for transactions (create, view, edit category, delete)
- Manual category assignment via dropdown, with corrections tracked separately
  from future AI assignments (`user_corrected` flag)
- Spending dashboard: total spent this month, spending by category (bar chart),
  spending over time (area chart)
- Seeded default categories and a placeholder account
- Graceful error handling when the API is unreachable

## Running locally

### Backend