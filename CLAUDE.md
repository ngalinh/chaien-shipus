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
GitHub Actions (`.github/workflows/deploy.yml`) auto-deploys on every push to `main`:
- SSH vào VPS → `git reset --hard origin/main` → `npm install` → build frontend → `pm2 restart chaien-shipus`
- Secrets cần thiết: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `SSH_PORT`, `DEPLOY_PATH`

> **Quan trọng — vị trí deploy:** Chaien là một app trong nền tảng BASSO (`ai.basso.vn`). `DEPLOY_PATH` trỏ vào **đúng thư mục BASSO serve app**: `/opt/dashboard-bot/data/bots/e5f5323bdc7532ac` (cả frontend lẫn backend + `shipus.db` nằm chung ở đây, giống các app khác trong dashboard). Backend chạy pm2 `chaien-shipus` trên `:5000`; nginx route `/api/*` của `ai.basso.vn` tới `:5000`, còn frontend tĩnh do BASSO platform serve từ chính thư mục này. **Không** deploy ra `/var/www` (đã bỏ).

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

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
