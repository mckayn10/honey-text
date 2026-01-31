# Deploying HoneyText API to Render

Deploy the API to Render so you have a public URL for the Twilio webhook and for the weekly-questions cron.

## 1. Push your repo

Ensure your code is pushed to GitHub (or GitLab). Render will deploy from this repo.

## 2. Create the service from the Blueprint

1. Go to [Render Dashboard](https://dashboard.render.com).
2. **New** → **Blueprint**.
3. Connect your Git provider and select the `honey-text` repo.
4. Render will detect `render.yaml` and show one service: **honey-text-api**.
5. For each env var marked **sync: false**, you’ll be prompted to enter a value. Use the same values as in `api/.env`:
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `TWILIO_ACCOUNT_SID`
    - `TWILIO_AUTH_TOKEN`
    - `TWILIO_PHONE_NUMBER` (E.164, e.g. `+15551234567`)
    - `CRON_SECRET` (pick a long random string; you’ll use it to call the cron endpoint)
    - `CORS_ORIGIN` (your frontend URL, e.g. `https://your-app.vercel.app` or `http://localhost:5173` for local dev)
6. Click **Apply** and wait for the first deploy.

## 3. Get your API URL

After the deploy succeeds, the API will be at:

- **`https://<service-name>.onrender.com`**

(e.g. `https://honey-text-api.onrender.com`). You can also add a custom domain under the service’s **Settings** → **Custom Domains**.

Use this base URL in the next two steps.

## 4. Twilio Conversations webhook

Tell Twilio where to send inbound conversation events (replies to the group thread):

1. [Twilio Console](https://console.twilio.com) → **Messaging** → **Try it out** → **Send an SMS** (or **Conversations** if you use it from there).
2. Or: **Phone Numbers** → **Manage** → **Active numbers** → your number → **Messaging Configuration**.
3. Set the **Webhook URL** for incoming messages / conversation events to:
    - **`https://<your-api-url>/twilio/conversations/webhook`**
    - Example: `https://honey-text-api.onrender.com/twilio/conversations/webhook`
4. Method: **POST**. Save.

(Exact menu names can vary; the goal is to set the webhook that receives Twilio Conversation message events so replies are logged to `group_messages`.)

### Twilio Conversations: Addresses (if Group MMS doesn’t deliver)

If the cron runs and your API sends the question, but **no one receives the text**, Twilio may require your number to be registered in **Conversations**:

1. In Twilio Console go to **Conversations** → **Configuration** → **Addresses** (or **Manage** → **Addresses**).
2. **Add address** (or **Create**): choose **SMS**, enter your Twilio number in E.164 (e.g. `+15551234567`).
3. Optionally set **Auto-creation** to use your webhook URL so inbound messages to this number are tied to Conversations; your number-level “A message comes in” webhook may already handle that.
4. Save. Then trigger the cron again and check delivery.

**Global webhooks** (Conversations → Global webhooks) are for receiving Conversation events (e.g. `onMessageAdded`). If you already receive inbound replies at your webhook from the number config, you don’t need to duplicate that here unless you want service-level logging.

## 5. Cron: weekly questions

Something must call your API on a schedule (e.g. every hour) so questions are sent when a group’s schedule matches.

**Option A – Render Cron Job**

1. In Render: **New** → **Cron Job**.
2. Connect the same repo, set **Root Directory** to `api` (or leave root and use a build/start that runs a single HTTP request).
3. **Schedule**: e.g. `0 * * * *` (every hour on the hour).
4. **Build Command**: `npm install` (or `true` if you only need curl).
5. **Start Command**:  
   `curl -X POST "https://<your-api-url>/cron/send-weekly-questions" -H "Authorization: Bearer <CRON_SECRET>"`  
   Use the same `CRON_SECRET` you set on the API.
6. Create the cron job. Render will run this on the schedule.

**Option B – External scheduler (e.g. cron-job.org)**

1. Sign up at [cron-job.org](https://cron-job.org) (or use another HTTP cron).
2. Create a job:
    - **URL**: `https://<your-api-url>/cron/send-weekly-questions`
    - **Method**: POST
    - **Headers**: `Authorization: Bearer <CRON_SECRET>` (or `X-Cron-Secret: <CRON_SECRET>`)
    - **Schedule**: e.g. every hour.
3. Save. The job will POST to your API on the schedule.

The API only sends questions for groups whose `schedule_day` and `schedule_time` (in their timezone) fall within the current hour.

## 6. Point the frontend at the API

In your frontend env (e.g. Vite `.env`), set the API base URL to your Render URL:

- **`VITE_API_URL=https://<your-api-url>`**

Restart the dev server or redeploy the frontend so it uses this URL.

---

**Summary**

| Use            | URL / value                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| API base       | `https://<service-name>.onrender.com`                                                                            |
| Twilio webhook | `https://<service-name>.onrender.com/twilio/conversations/webhook`                                               |
| Cron endpoint  | `POST https://<service-name>.onrender.com/cron/send-weekly-questions` with `Authorization: Bearer <CRON_SECRET>` |
