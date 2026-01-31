# Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Twilio account

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Go to SQL Editor and run the migration files in order:
    - `api/supabase/migrations/001_initial_schema.sql`
    - `api/supabase/migrations/002_seed_data.sql`
3. Get your Supabase URL and keys from Project Settings > API:
    - Project URL
    - `anon` key (for frontend)
    - `service_role` key (for backend - keep this secret!)

## 3. Set Up Twilio

1. Create a Twilio account at https://www.twilio.com
2. Get a phone number from Twilio
3. Get your Account SID and Auth Token from the Twilio Console

## 4. Configure Environment Variables

### Frontend (`app/.env`)

Copy `app/.env.example` to `app/.env` and fill in:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3001
```

### Backend (`api/.env`)

Copy `api/.env.example` to `api/.env` and fill in:

```
PORT=3001
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
CRON_SECRET=generate_a_random_secret_key_here
CORS_ORIGIN=http://localhost:3000
```

**Important:** Generate a strong random secret for `CRON_SECRET` (e.g., use `openssl rand -hex 32`)

## 5. Run Development Servers

```bash
npm run dev
```

This will start:

- Frontend on http://localhost:3000
- API on http://localhost:3001

## 6. Set Up Cron Job (for Production)

For the weekly question sending to work, you need to set up a cron job that calls:

```
POST https://your-api-domain.com/cron/send-weekly-questions
```

With header:

```
Authorization: Bearer YOUR_CRON_SECRET
```

Or:

```
x-cron-secret: YOUR_CRON_SECRET
```

**Options:**

- Use a free cron service like cron-job.org
- Use platform cron if deploying to Vercel/Railway/etc.
- Set up a cron job to run every hour (the API will check which groups are due)

## Testing the Flow

1. Sign up for an account
2. Create a group
3. Add an invite (name + phone number)
4. Copy the invite link
5. Open the invite link in an incognito window
6. Accept the invite
7. The member should now receive weekly text messages at the scheduled time

## Troubleshooting

- **Database errors:** Make sure you ran both migration files in order
- **Auth errors:** Verify your Supabase keys are correct
- **SMS not sending:** Check Twilio credentials and phone number format (must be E.164 format, e.g., +1234567890)
- **CORS errors:** Make sure `CORS_ORIGIN` in API matches your frontend URL
