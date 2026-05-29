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


## Desktop Production Runbook (Windows)

Use this when you want the app to run locally on your desktop as the production host.

### 1. One-time setup

```powershell
npm install
npm install -g pm2
```

Make sure services are running:

- MySQL
- Redis

### 2. Environment file

Create either `.env` or `env` in the repository root (both are supported).

Required minimum values:

- `NODE_ENV=production`
- `SERVER_PORT=8080` (or your chosen port)
- `ALLOWED_ORIGINS=https://your-domain.com`
- `JWT_SECRET=...`
- `SESSION_SECRET=...`
- `CHECKSUM_SECRET_KEY=...`
- `DB_*` and/or `PRODUCTION_DB_*`
- `REDIS_*`
- `PLATFORM_WALLET_SECRET_KEY=[...]`
- `AIRDROP_WALLET_SECRET_KEY=[...]`

### 3. Prepare database

```powershell
npm run migrate:prod
```

Optional (first deployment only):

```powershell
npm run seed:prod
```

### 4. Build frontend assets

```powershell
npm run build:prod
```

### 5. Start backend in production mode with PM2

```powershell
npm run pm2:start
npm run pm2:save
```

Useful PM2 commands:

```powershell
npm run pm2:logs
npm run pm2:restart
npm run pm2:stop
```

### 6. Verify before live push

1. Open `http://localhost:8080` and confirm the frontend loads.
2. Confirm API calls succeed from the UI.
3. Confirm logs are being written in `logs/`.
4. Run `npm run migrate:status:prod` and ensure all migrations are up.
5. Confirm wallet-dependent actions work in a safe test flow.

### 7. Optional: auto-start PM2 on Windows boot

Run once in elevated PowerShell:

```powershell
pm2 startup
pm2 save
```

### 8. Auto-update + auto-redeploy (for scheduler)

If you already have a scheduler script for your Discord bots, use the same pattern and run this command:

```powershell
npm run deploy:auto
```

What this script does:

1. `git fetch --prune origin`
2. Detects if there is a new upstream commit
3. Runs `git pull --ff-only` (safe fast-forward only)
4. Runs `npm install --ignore-scripts` only when `package.json` or `package-lock.json` changed
5. Runs production migrations
6. Runs production build
7. Restarts PM2 app (`foxclub-raffle`) or starts it if missing
8. Saves PM2 process list

Safety rules built in:

- If working tree has local changes, deploy is skipped
- If branch diverges from upstream (local commits ahead), deploy is skipped
- If no new commit exists, deploy is skipped

Example with Windows Task Scheduler (every 5 minutes):

- Program/script: `powershell.exe`
- Add arguments:
  `-ExecutionPolicy Bypass -NoProfile -File "C:\Users\joh_h\The-Fox-Club-Raffle-Platform\scripts\auto-deploy.ps1"`
- Start in:
  `C:\Users\joh_h\The-Fox-Club-Raffle-Platform`

If you need to skip frontend build during maintenance:

```powershell
npm run deploy:auto:skip-build
```

If your scheduler is already running a .bat script for multiple projects, add this section to that same .bat file:

```bat
REM =========================
REM Fox Club Raffle Platform
REM =========================

cd /d C:\Users\joh_h\The-Fox-Club-Raffle-Platform

git fetch origin

for /f %%i in ('git rev-parse HEAD') do set LOCAL_FOX=%%i
for /f %%i in ('git rev-parse @{u}') do set REMOTE_FOX=%%i

echo FoxClub Local: %LOCAL_FOX% >> C:\Users\joh_h\new-projects\scheduler-log.txt
echo FoxClub Remote: %REMOTE_FOX% >> C:\Users\joh_h\new-projects\scheduler-log.txt

if NOT "%LOCAL_FOX%"=="%REMOTE_FOX%" (
echo Updating Fox Club... >> C:\Users\joh_h\new-projects\scheduler-log.txt
call C:\Users\joh_h\The-Fox-Club-Raffle-Platform\scripts\auto-deploy.bat
) else (
echo No updates for Fox Club >> C:\Users\joh_h\new-projects\scheduler-log.txt
)
```

Notes:

- Keep your existing scheduler interval (for example every 5 minutes)
- `auto-deploy.ps1` already handles migrations, build, PM2 restart/start, and safe skip rules
- For manual testing, run `npm run deploy:auto:bat`

### 9. Live domain checklist (step-by-step)

1. Set production values in `.env`/`env`:

- `NODE_ENV=production`
- `VITE_MODE=production`
- `VITE_CLIENT_URL=https://your-domain.com` (no trailing slash)
- `ALLOWED_ORIGINS=https://your-domain.com` (no trailing slash)

2. Run full preflight:

```powershell
npm run live:preflight
```

Optional DNS check in same script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\go-live-preflight.ps1 -Domain your-domain.com
```

3. Ensure MariaDB survives reboot:

- Preferred (admin required): install MariaDB as a Windows service.
- Non-admin fallback:

```powershell
npm run live:db:autostart
```

This creates a Startup launcher for the current user.

4. Generate Caddy config for reverse proxy + TLS:

```powershell
npm run live:caddy:config -- -Domain your-domain.com
```

This writes `C:\caddy\Caddyfile` from `deploy/Caddyfile.template`.

5. Start app process and save PM2 state:

```powershell
npm run pm2:start
npm run pm2:save
```

6. Start Caddy (admin shell recommended for service setup):

```powershell
caddy run --config C:\caddy\Caddyfile
```

7. Final smoke test:

- `http://localhost:8080/api/raffle/live` should return 200.
- `https://your-domain.com` should load frontend.
- `https://your-domain.com/api/raffle/live` should return 200.


## Project Structure

```
foxclub-raffle-site/
├── server/                  # Backend (Node.js + Express)
│   ├── config/               # Config files (auth, db, redis, etc.)
│   ├── controllers/          # Request handlers
│   ├── helpers/
│   │   ├── cache/            # Cache for faster loading 
│   │   └── solana/           # Solana utilities & wallets
│   ├── middlewares/          # Express middlewares
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
