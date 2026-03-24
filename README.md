# Expense AI (monorepo)

Lightweight monorepo for an expense-tracking AI project containing a Django backend and a Next.js frontend.

## Repo layout

- `expense-ai-backend/` — Django project (API, server)
- `expense-ai-frontend/` — Next.js app (React + TypeScript)

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Python 3.8+ and pip
- (optional) PostgreSQL or other DB if you don't want the default SQLite

## Backend — quick start

1. Open a terminal and go to the backend folder:

```powershell
cd expense-ai-backend
```

2. Create and activate a virtual environment, then install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

3. Configure environment variables (create `.env` or set in your shell). See `expense-ai-backend/.env.example` if present.

4. Run migrations and start the development server:

```powershell
python manage.py migrate
python manage.py runserver
```

By default Django serves at `http://127.0.0.1:8000`.

## Frontend — quick start

1. Open a terminal and go to the frontend folder:

```powershell
cd expense-ai-frontend
```

2. Install dependencies and run the dev server:

```powershell
npm install
npm run dev
```

The Next.js app runs by default at `http://localhost:3000`.

## Running both locally

Start the backend first (`8000`) then the frontend (`3000`).

The frontend supports both local and remote API endpoints via `expense-ai-frontend/.env.example`:

- `NEXT_PUBLIC_API_URL`: explicit override (highest priority)
- `NEXT_PUBLIC_LOCAL_API_URL`: local backend endpoint (default `http://localhost:8000`)
- `NEXT_PUBLIC_REMOTE_API_URL`: deployed backend endpoint fallback

Behavior:

- If `NEXT_PUBLIC_API_URL` is set, the app always uses it.
- If not set and the app is running on `localhost`/`127.0.0.1`, it uses `NEXT_PUBLIC_LOCAL_API_URL`.
- Otherwise, it uses `NEXT_PUBLIC_REMOTE_API_URL`.

## Production build

- Backend: set production settings, use a production-ready WSGI server (Gunicorn/uvicorn + reverse proxy) and a proper RDBMS.
- Frontend: build with `npm run build` and serve statically or via a Node process.

## Environment files

Keep secrets out of source control. Use `.env` files (already listed in `.gitignore`) or a secrets manager.

## Tests

If tests exist, run them from each app root. Example (backend):

```powershell
cd expense-ai-backend
pytest
```

## Contributing

1. Create an issue describing the change.
2. Open a pull request against `main` with a clear description and testing steps.

## License

Add a license file to the repo (e.g., `LICENSE`) or indicate the project license here.

---

If you want, I can: commit this file, add a `requirements.txt`/`package.json` checks, or expand sections with env examples. Which would you like next?

