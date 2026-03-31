# Fox Club Raffle

A closed-source Web3 raffle platform built with React, TypeScript (frontend), and Node.js, Express (backend) with MySQL database and Solana blockchain integration.


## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v24.11.1+ recommended)
- **npm** (v11.6.2+ recommended)
- **MySQL** (v8.0+)
- **Redis** (v7.0+)
- **Git**


## Installation

### 1. Clone Repository

Cloning with SSH is recomemnded.

```bash
git clone <repository-url>
cd foxclub-raffle-site
```

### 2. Install Dependencies

```bash
npm install
```


## Environment Setup

### 1. Create `.env` File

Copy the provided `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your configuration. Ask for other developers who have worked on this repository.


## Database Setup

### 1. Create MySQL Database

Sequelize can create the database for you. Just run:
```bash
npx sequelize-cli db:create
```

### 2. Run Sequelize Migrations

Sequelize ORM will automatically create all tables from migrations:

```bash
npx sequelize-cli db:migrate
```

Double check with the following command to verify the migrations are up.

```bash
npx sequelize-cli db:migrate:status
```

This will execute all migration files in `server/migrations/` in order.

### 3. Seed the Database

Populate the database with initial data:

```bash
npx sequelize-cli db:seed:all
```


## Wallet Setup

This repository requires two Solana wallets for operation:

### 1. Platform Wallet

**Location:** `server/helpers/solana/wallet.json`

This wallet is used as a middle point to recieve raffle prizes and tickets. Create the file with the following structure:

```json
[0,0,...,0,0]
```

**To generate:** Use Solana CLI or your preferred Solana wallet generation tool.

### 2. Airdrop Wallet

**Location:** `server/helpers/solana/airdrop-wallet.json`

This wallet is used as middle point for the airdrops or rewards. Create the file with the same structure:

```json
[0,0,...,0,0]
```


## Running the Application

### Development Mode (Full Stack)

Runs both frontend and backend concurrently:

```bash
npm start
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080

### Frontend Only

```bash
npm run start:client
```

Runs on http://localhost:3000

### Backend Only

```bash
npm run start:server
```

Runs on http://localhost:8080 with auto-reload via Nodemon

### Production Build

```bash
npm run build
```

Creates optimized production build in `build/` directory.


## Project Structure

```
foxclub-raffle-site/
├── server/                  # Backend (Node.js + Express)
│   ├── config/               # Config files (auth, db, redis, etc.)
│   ├── controllers/          # Request handlers
│   ├── helpers/
│   │   ├── cache/            # Cache for faster loading 
│   │   └── solana/           # Solana utilities & wallets
│   ├── middlewares/           # Express middlewares
│   ├── migrations/           # Database migrations
│   ├── models/               # Sequelize ORM models
│   ├── routes/               # API routes
│   ├── seeders/              # Database seeders
│   ├── services/             # Business logic
│   ├── util/                 # Utility files
│   ├── api.js                # Express app setup
│   └── index.js              # Server entry point
│
├── src/                     # Frontend (React + TypeScript)
│   ├── api/                  # Axios api helper
│   ├── components/           # React components
│   ├── config/               # Frontend config
│   ├── helpers/              # Helper functions
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Other library utilities
│   ├── redux/                # Redux state management
│   ├── services/             # API services
│   ├── utils/                # Helper utilities
│   ├── views/                # Page components
│   ├── App.tsx               # Root component
│   └── main.tsx              # Entry point
│
├── public/                  # Static assets
├── build/                   # Production build output
└── logs/                    # Application logs
```


## Database Migration & Seeding

### Create a New Migration

```bash
npx sequelize-cli migration:generate --name create-table-name
```

Edit the generated file in `server/migrations/` and run:

```bash
npx sequelize-cli db:migrate
```

### Undo Migrations

Revert last migration:
```bash
npx sequelize-cli db:migrate:undo
```

Revert all migrations:
```bash
npx sequelize-cli db:migrate:undo:all
```


## Troubleshooting

### MySQL won't connect
- Ensure MySQL is running: `brew services start mysql` (macOS) or `sudo systemctl start mysql` (Linux)
- Double-check `DB_HOST`, `DB_PORT`, `DB_USERNAME`, and `DB_PASSWORD` in your `.env`
- Make sure the database exists — run `npx sequelize-cli db:create` if not

### Redis won't connect
- Ensure Redis is running: `brew services start redis` (macOS) or `sudo systemctl start redis` (Linux)
- Check `REDIS_HOST` and `REDIS_PORT` in your `.env`
- Default Redis runs on `localhost:6379` with no password — confirm this matches your setup

### Wallet file errors
- Confirm both files exist at the correct paths:
  - `server/helpers/solana/wallet.json`
  - `server/helpers/solana/airdrop-wallet.json`
- Both files must be valid Solana keypair arrays — generate them with:
```bash
  solana-keygen new --outfile server/helpers/solana/wallet.json
  solana-keygen new --outfile server/helpers/solana/airdrop-wallet.json
```

### Migrations fail
- Run `npx sequelize-cli db:migrate:status` to see which migration is failing
- Ensure your DB credentials in `.env` are correct and the database has been created
- If you need a clean slate: `npx sequelize-cli db:migrate:undo:all` then re-migrate

### Port already in use
- Frontend (`3000`) or backend (`8080`) may already be occupied
- Find and kill the process


## Security & Confidentiality

> **This is a proprietary, closed-source project.** Do not share, distribute, or reproduce any part of this codebase without explicit written permission.

The following files are gitignored and must **NEVER** be committed:

- `.env` — contains secrets and credentials
- `server/helpers/solana/wallet.json` — platform wallet keypair
- `server/helpers/solana/airdrop-wallet.json` — airdrop wallet keypair
- `logs/` — application logs

For access, environment variables, or onboarding help, reach out to the core development team directly.
