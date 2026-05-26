# Chaien Shipus – Claude Code Instructions

## Stack
- **Backend**: Node.js + Express + SQLite (`node:sqlite` / DatabaseSync)
- **Frontend**: React 18 + Vite + Tailwind CSS, built to `client/dist/`
- **Uploads**: `uploads/cccd/`, `uploads/logo/`

## Dev workflow
```bash
npm run dev        # Express on :5000, Vite on :5173
npm --prefix client run build   # production build
```

## After every fix

1. Commit changes to the feature branch with a clear message.
2. Push to `origin`.
3. If a PR exists, mark it **ready for review** (un-draft), then **merge it into `main` immediately** — do not wait for manual approval.
4. If no PR exists, create one (non-draft) and merge it right away.
5. The platform auto-deploys on merge to `main` — no extra step needed.

> **Do not leave PRs as drafts.** Merge as soon as the fix is complete and the build passes.

## Deployment
The app runs via Docker (`Dockerfile`). The hosting platform rebuilds and redeploys automatically whenever `main` is updated. There is no separate deploy command to run.

## Database migrations
Add idempotent `ALTER TABLE … ADD COLUMN` statements inside a `try/catch` block in `db.js` (see existing examples). They run automatically on server start.

## Key files
| File | Purpose |
|------|---------|
| `server.js` | Express entry point, mounts all route files |
| `db.js` | SQLite init + schema + migrations |
| `routes/customers.js` | Customer CRUD + bulk import |
| `routes/settings.js` | Rates, warehouses, bank accounts, company info |
| `client/src/pages/Settings.jsx` | Cài đặt page (rates, import, company…) |
| `client/src/pages/Customers.jsx` | Customer list |
