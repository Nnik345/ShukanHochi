# Party feature — requirements & implementation map

This document ties your **product rules** to **API routes**, **MongoDB**, and the **React app** (`VITE_API_PARTY_*`).

## Product rules (implemented in Lambdas)

| Rule | Implementation |
|------|------------------|
| Search returns **userId** + **nickname** (prefix match) | **`searchUser`** — `GET ?nickname=` → **`UserDetails`**, case-insensitive prefix on `nickname`, max 10 |
| A user may be in **multiple parties** | `parties.memberIds` is an array; `partyListMine` finds `{ memberIds: sub }` |
| **First invite** creates the party; **first inviter = leader** | `partyInvite` with **no** `partyId` inserts `parties` with `leaderId: sub`, `memberIds: [sub]`, then inserts invite |
| **Only the leader** can invite more members | `partyInvite` with `partyId` requires `party.leaderId === sub` |
| **Shared quest** is separate from personal habits (UI) | Stored per party as `parties.sharedQuest` object; returned in `partyListMine`; habits stay on `users` / profile |
| Invites **do not expire** | `partyInvites` has no TTL / expiry field; rows stay until accept, decline, or party dissolve |
| **Leave** (non-leader) | `partyLeave` — `$pull` from `memberIds`; leader gets **403** (must **dissolve** first) |
| **Dissolve** (leader only) | `partyDissolve` — deletes party + all invites for that `partyId` |

## API Gateway routes

Wire **one Lambda per folder** (see `README.md`). Each **`index.js`** inlines the same **`let client`**, **`CORS_HEADERS`**, **`corsJson` / `corsEmpty` / `getHttpMethod` / `getClient`**, and **`mongoClient.db('QuestHabit')`** pattern as your **UserDetails** fetch/update Lambdas (`OPTIONS` → **204**). User documents are read from **`UserDetails`**. Use **Lambda proxy integration** so headers are not stripped.

**HTTP API (one route per Lambda, path = folder name)** — matches `https://<api-id>.execute-api.<region>.amazonaws.com/default/<functionName>`:

| Method | URL path (after stage) | Lambda folder | Request | Response |
|--------|------------------------|---------------|---------|----------|
| GET | `/searchUser` | `searchUser` | Query: `nickname` | `[{ userId, nickname }]` (empty nickname → `[]`) |
| POST | `/partyInvite` | `partyInvite` | `{ toUserId, partyId? }` | `{ partyId, inviteId }` |
| GET | `/partyInvitesIncoming` | `partyInvitesIncoming` | — | `{ invites: [...] }` |
| POST | `/partyInviteAccept` | `partyInviteAccept` | `{ inviteId }` | `{ ok, partyId? }` |
| POST | `/partyInviteDecline` | `partyInviteDecline` | `{ inviteId }` | `{ ok: true }` |
| GET | `/partyListMine` | `partyListMine` | — | `{ parties: [...] }` |
| POST | `/partyLeave` | `partyLeave` | `{ partyId }` | `{ ok: true }` |
| POST | `/partyDissolve` | `partyDissolve` | `{ partyId }` | `{ ok: true }` |

Set **`VITE_API_GATEWAY_URL`** to the base including stage, e.g. `https://37qn47z124.execute-api.ap-south-1.amazonaws.com/default`, or set each **`VITE_API_PARTY_*`** to a full URL. **REST API** can instead use paths like `/party/search` if you map them in API Gateway — then set explicit **`VITE_API_PARTY_*`** URLs in `.env`.

### Troubleshooting `403` / `Forbidden` (REST API)

This is **API Gateway**, not the React app and not the Lambda handler’s search logic. The browser shows Forbidden when **API Gateway’s authorizer or method config** rejects the call **before** Lambda runs.

1. Copy the **same Cognito User Pool authorizer** from your **working** profile/fetch route onto **every** party method (`GET /party/search`, `POST /party/invite`, …). Same **Token source**: `method.request.header.Authorization`.
2. **Token**: The app uses the **ID token** for party calls (same style as profile fetch). Your authorizer must accept that token (audience = app client id).
3. After a successful authorizer run, REST API passes **`requestContext.authorizer.claims.sub`** into Lambda; **`shared/auth.js`** uses that so Lambda can still identify the user.
4. Add **`OPTIONS`** on party resources if the browser sends a CORS preflight.

## MongoDB collections

### `UserDetails` (existing — same collection as profile fetch/update)

- `userId` (Cognito `sub`, unique index)
- `nickname` (indexed for search)
- `username`
- `avatarId` (string; premade id, e.g. `wizard` — must match `src/constants/avatarOptions.js` in the web app)

### `parties`

- `partyId` (string UUID, unique)
- `leaderId` (Cognito `sub`)
- `memberIds` (`string[]` of subs)
- `name` (optional)
- `sharedQuest` (optional object: e.g. `title`, `description`, `completedCount`, `totalCount` — shape is up to you; frontend displays it if present)
- `createdAt`, `updatedAt` (optional)

### `partyInvites`

- `inviteId` (string UUID, unique)
- `partyId`
- `fromUserId`, `toUserId`
- `createdAt` (optional; **no** expiry field)

Unique index on `(partyId, toUserId)` prevents duplicate pending invites.

Run `node scripts/createIndexes.js` (with `MONGO_URI` and `DB_NAME`) once.

## Frontend env vars (already in app)

Set these to your API Gateway invoke URLs:

- `VITE_API_PARTY_SEARCH_URL`
- `VITE_API_PARTY_INVITE_URL`
- `VITE_API_PARTY_INVITES_INCOMING_URL`
- `VITE_API_PARTY_ACCEPT_URL`
- `VITE_API_PARTY_DECLINE_URL`
- `VITE_API_PARTY_PARTIES_ME_URL`
- `VITE_API_PARTY_LEAVE_URL`
- `VITE_API_PARTY_DISSOLVE_URL`

## Lambda environment (every function)

- `MONGO_URI` (required)
- Cognito-related env vars **only** if API Gateway does **not** forward **`sub`** in **`requestContext.authorizer`** and you want Lambda to verify **`Authorization: Bearer …`** itself: `COGNITO_USER_POOL_ID`, `COGNITO_REGION` or `AWS_REGION`, optional `COGNITO_APP_CLIENT_ID` for `aud` / `client_id` checks

## Shared quest (backend note)

The UI treats **shared quest** as party-scoped data. To drive progress from habits you would update `parties.sharedQuest` in a separate job or when members complete actions — not required for the minimal party/invite flow implemented here.
