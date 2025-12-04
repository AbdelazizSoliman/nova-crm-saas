# Nova CRM SaaS — Installation & Packaging Guide

A launch-ready CRM, invoicing, and billing SaaS built with Ruby on Rails (API) and React + Vite (frontend). Use this guide to run the app locally, prepare a demo environment, and package it for CodeCanyon buyers.

## Requirements
- **Ruby:** 3.2+
- **Node.js:** 18+ with npm or Yarn
- **PostgreSQL:** 13+
- **Redis:** Required if you enable Action Cable/Background jobs
- **Other:** ImageMagick (for logo processing), Git

> PHP is **not** required.

## Repository structure
- `backend/` — Rails API (multi-tenant accounts, billing, notifications)
- `frontend/` — React + Vite single-page app
- `docs/` — Installation & release notes

## Backend setup (Rails API)
1. **Clone the repo**
   ```bash
   git clone <repo-url> nova-crm-saas
   cd nova-crm-saas/backend
   ```
2. **Install gems**
   ```bash
   bundle install
   ```
3. **Configure database**
   - Copy `.env.example` to `.env` (or export environment variables) and set `POSTGRES_*` credentials and `SECRET_KEY_BASE`.
   - Update `config/database.yml` if your local database names differ.
4. **Database setup**
   ```bash
   bin/rails db:create db:migrate db:seed
   ```
   Seeding creates the demo account and sample data.
5. **Environment variables**
   - `DEMO_MODE` (true/false) — enables read-only protections for the demo user.
   - `DEMO_USER_EMAIL` — defaults to `demo@nova-crm.test`.
   - `SECRET_KEY_BASE` — required for JWTs/credentials.
   - `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_ADDRESS`, `SMTP_PORT` — optional mailer settings.
6. **Run the server**
   ```bash
   bin/rails s -p 3000
   ```

## Frontend setup (React + Vite)
1. **Install dependencies**
   ```bash
   cd ../frontend
   npm install
   ```
2. **Configure environment**
   - Copy `.env.example` to `.env`.
   - Set `VITE_API_URL` to your Rails API URL (e.g., `http://localhost:3000/api`).
   - Optionally set `VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD` for the demo login button.
3. **Run the dev server**
   ```bash
   npm run dev -- --host --port 5173
   ```
4. **Build for production**
   ```bash
   npm run build
   npm run preview
   ```

## Default credentials
- **Demo account:** `demo@nova-crm.test` / `password` (read-only for sensitive actions when `DEMO_MODE=true`).
- **Owner account:** Created during registration or seeds (role: owner).

## Features overview
- **Dashboard:** KPIs and recent activity.
- **Clients:** Contacts, addresses, attachments.
- **Products:** Catalog with pricing.
- **Invoices & Payments:** Create, duplicate, email, PDF preview.
- **PDF Templates & Branding:** Logo, brand color, footer text.
- **Billing & Plans:** Plans, subscriptions, cancellation options.
- **Notifications:** In-app notifications and unread counts.
- **Activity Logs:** Track user actions across the workspace.
- **Team & Roles:** Owners/admins/managers/viewers with permissions.
- **Import/Export hooks:** Ready for future integrations.

## Demo mode behavior
- Enable by setting `DEMO_MODE=true` on the API.
- Demo user (default `demo@nova-crm.test`) cannot update billing, team, or account settings, and file uploads are blocked.
- Blocked requests return `{ "error": "Action is disabled in demo mode." }` and are shown in the UI.

## Deployment notes
- Precompile frontend assets separately (`npm run build`) and serve the built files via your preferred reverse proxy or CDN.
- Run Rails behind a reverse proxy (nginx/Apache) with SSL termination.
- Ensure `SECRET_KEY_BASE`, database credentials, and mailer settings are set in production.
- Scale background workers/Redis if you enable real-time features.

## CodeCanyon packaging checklist
- Include: `backend/`, `frontend/`, `docs/`, `README.md`, and `LICENSE/CHANGELOG` if applicable.
- Exclude: `node_modules`, `tmp/`, `log/`, `storage/`, compiled assets, and any `.env` files with secrets.
- Provide `.env.example` files for both backend and frontend without real credentials.

## Screenshot guidance (for the listing)
Capture crisp 1440×900 (or higher) screenshots of:
- Dashboard
- Clients list
- Invoices list and a PDF preview
- Products list
- Billing / Plans
- Activity Log
- Notifications dropdown
- Settings → Branding / Profile
