# QuestHabit Lambda — party APIs

Node.js 18+. Source for each endpoint lives under **`searchUser/`**, **`partyInvite/`**, etc. Shared code is **`shared/`**. Each zip matches a typical Node Lambda bundle: **`index.js`**, **`package.json`**, **`package-lock.json`**, **`node_modules/`**, plus **`shared/`** at the root. Handler: **`index.handler`**.

## Who returns `403 Forbidden`?

**Not the React app** (it sends `Authorization: Bearer <token>` like your working profile fetch).

**Usually not the Lambda handler body** — if API Gateway returns **`403` / `message: Forbidden`**, the **authorizer or route settings** rejected the request **before** Lambda ran. For **HTTP API** (`…/default/searchUser`, etc.), attach the **same JWT / Cognito authorizer** as your working profile routes (or leave **`searchUser`** open if you prefer public nickname search). For **REST API**, map **`GET /party/search`** (or equivalent) the same way. Enable **`OPTIONS`** where the browser preflights.

When the authorizer **succeeds**, Lambda receives **`requestContext.authorizer.claims.sub`** (REST) and can run even if `Authorization` is not forwarded — see **`shared/auth.js`**.

## Layout (repo)

```
backend_scripts/
  package.json
  shared/
  searchUser/index.js
  partyInvite/index.js
  …
  scripts/zip-function.sh
  scripts/zip-all.sh
```

## Lambda handler (after zip)

Each uploaded zip contains **`index.js` at the root**. Set the handler to:

**`index.handler`**

(not `searchUser/index.handler`).

| Zip name (example) | Handler |
|--------------------|---------|
| `searchUser.zip` | `index.handler` |
| `partyInvite.zip` | `index.handler` |
| … | `index.handler` |

## CORS

Each **`index.js`** inlines the same pattern as your **UserDetails** fetch/update handlers: module-level **`let client`**, **`CORS_HEADERS`**, **`corsJson` / `corsEmpty` / `getHttpMethod` / `getClient`**, **`mongoClient.db('QuestHabit')`**, **`OPTIONS` → `corsEmpty(204)`**. GET Lambdas use **`GET,OPTIONS`**; POST Lambdas use **`POST,OPTIONS`** and your **`JSON.parse(typeof event.body === 'string' ? …)`** body style. Shared code is only **`auth`**, **`strings`**, **`collections`**, **`users`**. Use **Lambda proxy integration** so headers are returned.

## Zip commands

From **`backend_scripts`**:

```bash
npm install --omit=dev
./scripts/zip-function.sh searchUser
```

**Fish shell:**

```fish
bash ./scripts/zip-function.sh searchUser
```

**All party Lambdas:**

```fish
bash ./scripts/zip-all.sh
```

Artifacts: **`dist/<folder>.zip`**. The script prefers **`7z`**, then **`zip`**, then **Python**.

**Manual zip (same layout):** from `backend_scripts`, after `npm install --omit=dev`, copy `index.js` (with `require('./shared/...')` paths), `shared/`, `node_modules/`, `package.json`, and `package-lock.json` into an empty folder, then zip that folder’s *contents* so `index.js` is at the archive root — not inside a parent directory.

## Environment variables (every party Lambda — identical for all eight)

| Variable | Required | Notes |
|----------|----------|--------|
| `MONGO_URI` | yes | Cluster connection string. |
| `COGNITO_USER_POOL_ID` | **only if** API Gateway does **not** put `sub` in **`requestContext.authorizer`** | Otherwise Lambda never talks to Cognito; the HTTP API **JWT authorizer** (or REST Cognito authorizer) already validated the token and passes claims through. |
| `COGNITO_REGION` or `AWS_REGION` | same as above | Needed only for the in-Lambda Bearer verification fallback. |
| `COGNITO_APP_CLIENT_ID` | optional | Only used when verifying JWT inside Lambda; if set, token **`aud` / `client_id`** must match. |

**Database name:** each party **`index.js`** calls **`mongoClient.db('QuestHabit')`** — there is **no** `DB_NAME` env on these Lambdas. Use a different DB only if you change that line in code.

**`DB_NAME`** is only for **`scripts/createIndexes.js`** (optional; defaults to **`QuestHabit`**).

## MongoDB indexes

```bash
MONGO_URI="..." DB_NAME="..." node scripts/createIndexes.js
```

## Party routes & behavior

See **`PARTY_FEATURE.md`**.
