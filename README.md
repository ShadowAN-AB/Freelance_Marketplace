# FreelanceHub

A MERN freelance marketplace: clients post projects, freelancers submit proposals, both sides chat, complete work through escrow, and leave reviews.

Repository: [github.com/ShadowAN-AB/Freelance_Marketplace](https://github.com/ShadowAN-AB/Freelance_Marketplace)

## Stack

| Layer | Tech |
| --- | --- |
| Client | React 19, Vite, Tailwind CSS, React Router, TanStack Query, Axios, Socket.IO client, Recharts |
| Server | Node.js, Express, Mongoose, JWT (httpOnly cookies + refresh), bcrypt, Multer, Socket.IO, Zod |
| Database | MongoDB 7 |

Payments, object storage, Redis presence, and SMTP are optional env-based integrations. The demo still uses simulated escrow if they are unset.

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

GitHub Actions runs API tests, the client build, then a Playwright hire-loop smoke.

## Docker

```bash
JWT_SECRET=replace-with-a-long-random-string docker compose up --build
```

Compose starts Mongo, the API, and an nginx client on http://localhost:8080. Do not run `npm run seed` against production.

## Domain rules

- One pending proposal per freelancer per project; a withdrawn freelancer can rebid.
- Accepting a proposal rejects other pending bids, creates a contract, and holds escrow.
- Fixed jobs can split into 2–3 milestones that must sum to the max budget; hourly jobs hold `budgetMax` as a cap.
- Either party can cancel an active contract; remaining held escrow is refunded.
- Chat requires a proposal on that project. Socket join is participant-checked.
- Reviews open only after the client completes the contract.

## Viva demo (5 minutes)

Password for every seeded account: `Password123!`

1. Home → Viva demo login → Priya chip → Sign in.
2. Dashboard shows due-soon work and **Ready to release · Scan MVP**.
3. Active work → Release Scan MVP (₹36,000). Offline sync stays held.
4. Log in as Aisha (`aisha@freelancehub.dev`) to show the pending logistics bid.
5. Browse `/projects?pricingType=hourly` for the Node pairing listing.

## Layout

```
client/   React app
server/   Express API + Socket.IO
docs/     HTML + PDF project documentation
docker-compose.yml   Mongo + API + web
```
