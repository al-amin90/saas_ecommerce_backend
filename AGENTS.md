# AGENTS.md

## Quick Commands

```bash
npm install          # install deps
npm run dev          # tsx watch ./src/server.ts (hot reload)
npm run build        # tsup -> dist/
npm run start        # node dist/server.js
```

**No test, lint, or typecheck scripts exist in package.json.** ESLint config exists (`eslint.config.mjs`) but there is no npm script to run it. No test framework is installed.

## Stack & Runtime

- **Runtime:** Node 18+, ESM (`"type": "module"`)
- **Language:** TypeScript 6, strict mode, `rootDir: ./src`, `outDir: ./dist`
- **Framework:** Express 5 (not 4) with Mongoose 9
- **Build:** tsup (ESM only, bundled, entry: `src/server.ts`)
- **Dev:** `tsx watch` (not ts-node)
- **Deploy:** Vercel (`vercel.json` serves `dist/server.js`)

## Architecture: Multi-Tenant SaaS

This is a **multi-tenant** e-commerce backend. The tenancy mode is controlled by `TENANCY_TYPE` env var (`single` or `multi`).

**Tenant identification:** Clients must send `x-tenant` header with the subdomain/tenant ID on every request. Without it, tenant-scoped endpoints fail.

**Database connections** are managed by `DBManager` singleton (`src/app/config/db.ts`):
- `single` mode: one shared DB (`SINGLE_DB_URL`)
- `multi` mode: central DB (`CENTRAL_DB_URL`) + per-tenant DBs (`MULTI_DB_URL` with `tenant_<id>` suffix)
- Connection pooling with idle cleanup; max connections configurable via env

**Never import Mongoose models directly.** Always use:
```typescript
import { getTenantModel } from "../utils/getTenantModel";
const Product = await getTenantModel<TProduct>(subdomain, "Product");
```
or
```typescript
import ModelFactory from "../utils/modelFactory";
const conn = await dbManager.getConnection(subdomain);
const Model = ModelFactory.getModel(conn, "ModelName");
```
Models are registered in `src/app/utils/modelFactory.ts` schema registry.

## Module Pattern

Every feature module follows this structure under `src/app/modules/`:
```
module/
  module.interface.ts   # TypeScript types
  module.model.ts       # Mongoose schema
  module.validation.ts  # Zod schemas
  module.service.ts     # Business logic
  module.controller.ts  # Request handlers
  module.route.ts       # Express routes
```

**Tenant modules** live under `src/app/modules/tenant/`. **Central modules** (super-admin) under `src/app/modules/central/`.

Routes are registered in `src/app/routes/index.ts` under `/api/v1`.

## Request/Response Conventions

- **Wrap all controllers** with `catchAsync()` from `src/app/utils/catchAsync.ts` — it catches async errors and cleans up uploaded files on failure
- **Validate with Zod:** `validateRequest(schema)` middleware parses `{ body, cookies }` — schemas must be shaped as `{ body: z.object({...}) }`
- **Standard response** via `sendResponse(res, { statusCode, success, message, data, meta? })`
- **HTTP status codes** use the `http-status` package (e.g., `status.CREATED`, `status.OK`)
- **Errors:** throw `AppError(statusCode, message)` — the `GlobalErrorHandler` formats it

## Auth & Roles

- JWT-based auth middleware in `src/app/middlewares/auth.ts`
- Usage: `auth("admin")` or `auth("admin", "super_admin")` as route middleware
- JWT payload includes: `{ id, email, role, subdomain }`
- `super_admin` role bypasses tenant lookup
- Auth header format: `Authorization: Bearer <token>`

## File Uploads

- Multer middleware at `src/app/middlewares/multer.ts` for file handling
- Uploaded to Cloudinary via `uploadOnCloudinary(path, folder, subdomain)`
- `catchAsync` auto-deletes temp files on error

## Environment

Copy `.env.example` to `.env`. Key variables:
- `TENANCY_TYPE` — `single` or `multi`
- `SINGLE_DB_URL` / `MULTI_DB_URL` / `CENTRAL_DB_URL` — dev DBs
- `*_PRODUCTION_DB_URL` variants — auto-selected when `NODE_ENV=production`
- JWT secrets, Cloudinary URL, Pathao courier credentials

## Gotchas

- Express 5 is used (not 4) — error handling middleware signature differs
- `package.json` has frontend packages (`recharts`, `react-to-print`) as dependencies — ignore them, they are misplaced
- Default subdomain `"bazar"` is hardcoded in single-tenant login (`src/app/modules/auth/auth.service.ts:113`)
- ESLint has `eqeqeq: "off"` and `no-unused-vars: "error"` — be aware of both
- No `@types/express` installed (Express 5 ships its own types)
- `dist/` is gitignored but `dist.zip` is committed — the zip is the Vercel build artifact
