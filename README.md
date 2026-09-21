# FreelanceHub

A MERN freelance marketplace: clients post projects, freelancers submit proposals, both sides chat, complete work through escrow, and leave reviews.

Repository: [github.com/ShadowAN-AB/Freelance_Marketplace](https://github.com/ShadowAN-AB/Freelance_Marketplace)

## Stack

| Layer | Tech |
| --- | --- |
| Client | React 19, Vite, Tailwind CSS, React Router, TanStack Query, Axios, Socket.IO client, Recharts |
| Server | Node.js, Express, Mongoose, JWT (httpOnly cookies + refresh), bcrypt, Multer, Socket.IO, Zod |
| Database | MongoDB 7 |

Payments, object storage, Redis presence, SMTP, and LLM matching are optional env-based integrations. Simulated escrow and skill-overlap matching still work if they are unset.

Local `npm run dev` is one API process. `docker compose up` splits that process into **auth**, **marketplace**, **realtime**, and a **gateway** on port 5001.

## Vercel

Vercel can host the **React client**, not Express, MongoDB, or Socket.IO. Importing this repo with no Root Directory used to 404 because the app lives in `client/`, not the repo root.

After this repo’s `vercel.json` is on `main`, the Vite app should build. Login and hire still need an API:

1. Put MongoDB on Atlas (or any hosted Mongo).
2. Run the Express app on Railway, Render, or Fly (`cd server && npm start`) with `CLIENT_URL=https://your-app.vercel.app` and `MONGO_URI=...`.
3. In the Vercel project, set `VITE_API_URL` to that API origin (no trailing slash) and redeploy.

Until `VITE_API_URL` is set, the Vercel site can render, but `/api` calls have nowhere to go.

Do not point Vercel at `server/`. Serverless functions will not run this Socket.IO + disk-upload API.

## Local setup

```bash
cp .env.example server/.env
cd server && npm install && npm run seed && npm run dev
cd client && npm install && npm run dev
```

MongoDB must be running at `MONGO_URI` (native `mongod` or `docker compose up -d mongo`).

- App: http://localhost:5178 (also http://127.0.0.1:5178)
- API health: http://localhost:5001/health

`CLIENT_URL` is required. The API will not start without it.

Demo password for every seeded account: `Password123!`

| Role | Email |
| --- | --- |
| Admin | admin@freelancehub.dev |
| Client | priya@freelancehub.dev / arjun@freelancehub.dev |
| Freelancer | aisha@freelancehub.dev / kabir@freelancehub.dev / meera@freelancehub.dev / leo@freelancehub.dev |

## Tests and CI

```bash
cd server && npm test
cd client && npm test
cd client && npm run e2e
```

GitHub Actions runs the server test suite (hire loop, admin, matching, gateway routing), the client build, then seeds `freelancehub_e2e` before the Playwright hire-loop and viva smokes.

## Docker

```bash
JWT_SECRET=replace-with-a-long-random-string docker compose up --build
```

Compose starts Mongo, an API gateway, three workers (auth / marketplace / realtime), and an nginx client on http://localhost:8080. Health: gateway `http://localhost:5001/health` lists backend ok flags. Seed against Mongo, not inside a worker. Do not run `npm run seed` against production.

Local viva still uses the monolith: `cd server && npm run dev` (SERVICE defaults to `all`).

## Domain rules

- One pending proposal per freelancer per project; a withdrawn freelancer can rebid.
- Accepting a proposal rejects other pending bids, creates a contract, and holds escrow.
- Fixed jobs can split into 2–3 milestones that must sum to the max budget; hourly jobs hold `budgetMax` as a cap.
- Either party can cancel an active contract; remaining held escrow is refunded.
- Chat requires a proposal on that project. Socket join is participant-checked.
- Reviews open only after the client completes the contract.
- Talent ranking is skill overlap plus a written rationale. An OpenAI-compatible LLM is optional (`LLM_API_KEY`).

## Viva demo (5 minutes)

Password for every seeded account: `Password123!`

1. Home live stats → Viva demo login → Priya chip → Sign in.
2. Dashboard shows due-soon work and **Ready to release · Scan MVP**.
3. Active work → filter Submitted → Release Scan MVP (₹36,000). Offline sync stays held.
4. Payments → Download CSV for the held/released ledger.
5. Log in as Aisha (`aisha@freelancehub.dev`) to show the pending logistics bid.
6. Active work deep-links the Scan MVP card; download the notes, then Approve 4h on the hourly desk.
7. Message Aisha from the work card. Admin → Audit has hire/submit/report rows. Browse `/projects?pricingType=hourly`.
8. Priya’s proposals inbox: **Suggested talent** shows overlap % and a one-line reason. Compose: curl gateway `/health` to show auth / marketplace / realtime.

## Layout

```
client/   React app
server/   Express API (SERVICE=all locally) + gateway.js for compose
docs/     HTML + PDF project documentation
docker-compose.yml   Mongo + auth + marketplace + realtime + gateway + web
```
