# FreelanceHub

A MERN freelance marketplace: clients post projects, freelancers submit proposals, both sides chat, complete work through simulated escrow, and leave reviews.

Repository: [github.com/ShadowAN-AB/Freelance_Marketplace](https://github.com/ShadowAN-AB/Freelance_Marketplace)

## Stack

| Layer | Tech |
| --- | --- |
| Client | React 19, Vite, Tailwind CSS, React Router, TanStack Query, Axios, Socket.IO client, Recharts |
| Server | Node.js, Express, Mongoose, JWT, bcrypt, Multer, Socket.IO, Zod |
| Database | MongoDB 7 (Docker Compose) |

## Local setup

```bash
docker compose up -d
cp .env.example server/.env
cd server && npm install && npm run seed && npm run dev
cd client && npm install && npm run dev
```

- App: http://localhost:5178
- API health: http://localhost:5001/health

Demo password for every seeded account: `Password123!`

| Role | Email |
| --- | --- |
| Admin | admin@freelancehub.dev |
| Client | priya@freelancehub.dev / arjun@freelancehub.dev |
| Freelancer | aisha@freelancehub.dev / kabir@freelancehub.dev / meera@freelancehub.dev / leo@freelancehub.dev |

## Demo walkthrough (about 10 minutes)

1. Log in as **Priya**. Open **My projects** → React dashboard → **Proposals**. Accept Aisha or wait and post a new project.
2. Log in as **Aisha**. Open **Active work**, submit work on the inventory app. Switch back to Priya and release escrow, then leave a review.
3. Open **Messages** on both accounts — the inventory thread is already seeded.
4. Log in as **admin@freelancehub.dev** to see users, reports, and analytics.

## Domain rules

- One proposal per freelancer per project.
- Accepting a proposal rejects other pending bids, creates a contract, and holds simulated escrow.
- Chat requires a proposal on that project.
- Reviews open only after the client completes the contract.

## Layout

```
client/   React app
server/   Express API + Socket.IO
docker-compose.yml   MongoDB
```
