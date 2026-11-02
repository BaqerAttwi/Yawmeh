# Project architecture

Daywell uses one package manifest and lockfile for its React frontend and Express backend. This keeps installation and local development simple while separating browser code, server code, and shared business rules.

```text
client/src/
  main.jsx                 React mounting and authentication boundary
  app/App.jsx              Workspace composition, navigation, state, actions
  components/ui.jsx        Reusable display and form primitives
  features/                UI grouped by feature
    assistant/ auth/ daily/ demo/ insights/ planning/
    settings/ tasks/ today/ users/
  lib/                     Browser-side utilities
  styles/                  Global and feature styles
server/
  src/
    index.js               Starts HTTP server and reminder scheduler
    app.js                 Creates Express app, mounts routes and middleware
    database/              Pool, account snapshots, schema contract
    modules/               Auth, AI, daily, insights, planning, reminders, system
    validation/            Server entry point for shared request schemas
  scripts/                 Explicit migration and diagnostic commands
shared/                    Environment-independent calculations and schemas
tests/
  unit/                    Business rules and input validation
  integration/             HTTP authorization and cross-module reliability
  helpers/                 In-memory database test double
database/                  SQL import, instructions, ignored local credentials
docs/                      Architecture, review, screenshots
```

## Dependency boundaries

- Frontend features can import shared rules and client utilities. They must never import server modules or secrets.
- Server modules validate requests, enforce permissions and ownership, and use the database layer. Pure calculations belong in `shared/` so demo and live behavior agree.
- `shared/` must not depend on React, Express, browser APIs, or database connections.
- `server/src/app.js` exports `createApp` for tests without starting listeners or reminder jobs. Runtime startup belongs in `server/src/index.js`.
- Database migration runs explicitly; importing the app does not migrate or seed data.
- Keep reusable components in `components/` only when they serve multiple features. Keep feature-specific UI close to its feature.

Some existing planning and insights components intentionally combine task and money views. `App.jsx` still coordinates workspace actions and the entry dialog; this refactor does not introduce a new state-management framework or split every route into separate controller/service/repository files.

## Commands

Run from the repository root:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch Express and run Vite with the API proxy |
| `npm run build` | Build frontend into root `dist/` |
| `npm start` | Start server and reminder scheduler |
| `npm test` | Run all automated tests |
| `npm run test:unit` | Run business-rule tests |
| `npm run test:integration` | Run HTTP and cross-module tests |
| `npm run db:init` | Create or upgrade configured MySQL schema |
| `npm run check:setup` | Inspect database and service configuration |

Direct Node equivalents for environments with a broken npm shim:

```sh
node server/src/index.js
node server/scripts/migrate.js
node server/scripts/check-setup.js
node --test tests/unit/*.test.js tests/integration/*.test.js
node node_modules/vite/bin/vite.js build --configLoader runner
```

The root `.env`, package lockfile, SQL import path, and database contents remain in place. Static build paths resolve relative to the server source rather than its working directory. Restart an already-running server after this reorganization to load the new entry point. Tests use a database double; they do not establish live MySQL or email readiness.
