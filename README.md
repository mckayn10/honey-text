# HoneyText

A web app for sending weekly text message questions to groups (couples, families, friends, etc.).

## Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Database & Auth:** Supabase
- **SMS:** Twilio

## Setup

1. Install dependencies (run once from the **project root**; this installs for both app and api via npm workspaces):

    ```bash
    npm install
    ```

    You’ll see a single `node_modules` at the root—not in `app/` or `api/`. That’s expected.

2. Set up environment variables:
    - Copy `.env.example` files in `app/` and `api/` directories
    - Fill in your Supabase and Twilio credentials

3. Run development servers:
    ```bash
    npm run dev
    ```

## Project Structure

- `app/` - React frontend application
- `api/` - Node.js Express API server
