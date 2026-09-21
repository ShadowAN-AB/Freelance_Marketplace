# FreelanceHub

MERN freelance marketplace where clients post projects, freelancers submit proposals, and both sides chat, complete work, and leave reviews.

## Stack

- React + Vite + Tailwind CSS
- Node.js + Express
- MongoDB + Mongoose
- JWT auth, Socket.IO chat, simulated escrow

## Local setup

```bash
docker compose up -d
cp .env.example server/.env
cd server && npm install && npm run dev
cd client && npm install && npm run dev
```

Client: http://localhost:5173  
API health: http://localhost:5000/health
