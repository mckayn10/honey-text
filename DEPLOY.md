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
    - **`SEND_WEEKLY_VIA_ONE_TO_ONE_SMS`** (optional) – set to `true` or `1` to send weekly questions via one-to-one SMS (toll-free friendly). Leave unset to use Group MMS once A2P 10DLC is done.
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

### One-to-one SMS replies (relay to group)

When using **one-to-one SMS** (`SEND_WEEKLY_VIA_ONE_TO_ONE_SMS=true`), replies to your Twilio number are not Conversation events—they are standard inbound SMS. The same webhook (`/twilio/conversations/webhook`) handles both. Ensure your **phone number’s** “A message comes in” webhook is set to that URL (Phone Numbers → [your number] → Messaging → “A message comes in” → Webhook). The API will look up the group from the last one-to-one send, log the reply in `group_messages`, and relay it to the other members as `AuthorName: reply text`.

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

### Toll-free / one-to-one SMS vs Group MMS

- **One-to-one SMS** (toll-free friendly): Set `SEND_WEEKLY_VIA_ONE_TO_ONE_SMS=true` (or `1`) in the API env. The cron sends the question via regular SMS to each group member’s phone (one message per member). Use this with a **toll-free** number and [toll-free verification](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account#toll-free-verification-us-and-canada-only) so you can test on a trial account. Recipients must be in **Verified Caller IDs** on trial.
- **Group MMS** (Conversation): Leave `SEND_WEEKLY_VIA_ONE_TO_ONE_SMS` **unset**. The cron sends one message to the Twilio Conversation; Twilio delivers to all participants (group thread). Requires a **US/Canada long code** and **A2P 10DLC** registration for delivery. Once A2P is done, unset or remove `SEND_WEEKLY_VIA_ONE_TO_ONE_SMS` and use your long code to switch back to Group MMS.

## 6. Point the frontend at the API

In your frontend env (e.g. Vite `.env`), set the API base URL to your Render URL:

- **`VITE_API_URL=https://<your-api-url>`**

Restart the dev server or redeploy the frontend so it uses this URL.

---

## Still not receiving the text?

Use this checklist to narrow it down.

### 1. Cron response and API logs

- Trigger the cron again. In the **JSON response**, check the `results` entry for your group: it now includes `message_sid` and `delivery` (e.g. `total`, `sent`, `delivered`, `failed`, `undelivered`). If `delivery.failed` or `delivery.undelivered` is not `"none"`, Twilio is reporting a delivery problem.
- In **Render** → your API service → **Logs**, right after the cron run you should see a line like `[cron] group=... conversation=... message_sid=... delivery={...}`. That shows what Twilio returned for that send.

### 2. Twilio Conversation and participants

- In **Supabase** → `groups` table, copy the `conversation_sid` for your group (e.g. `CH...`).
- In **Twilio Console** → **Messaging** → **Try it out** → **Conversations** (or **Develop** → **Conversations**), open **Conversations** and find that conversation (by SID or name).
    - **Participants**: Is your phone number (+1 801 712 4604) listed as an SMS participant? If not, you’re not in the Conversation and won’t receive messages. Fix by re-saving your phone on the Profile page (or re-adding yourself as a member) so the API adds you to the Conversation again.
    - **Messages**: Do you see the question message there? If yes, note its status (e.g. delivered / failed). Click the message for delivery details per participant.

### 3. Twilio Monitor / Logs

- **Twilio Console** → **Monitor** → **Logs** → **Messaging** (or **Conversations**). Filter by the time you ran the cron. Find the outbound message (by conversation or message SID from step 1).
    - Check **Status** (e.g. delivered, failed, undelivered).
    - If failed/undelivered, open the log entry and check **Error code** and **Error message** (e.g. 30003 = unverified number on trial, 21610 = blocked by carrier, etc.).

### 4. Trial account and Verified Caller IDs

- If the account is **Trial**, SMS is only delivered to **Verified Caller IDs**.
    - **Phone Numbers** → **Manage** → **Verified Caller IDs**: ensure +1 801 712 4604 is verified.
- If you’re sure the number is verified and the message shows “sent” but you still don’t receive it, try **upgrading the account** (even a small balance) to rule out trial-only restrictions.

### 5. A2P 10DLC (US long code)

- US carriers block messages from unregistered long codes. **Error 30034** = “US A2P 10DLC - Message from an Unregistered Number” — delivery will stay undelivered until you register.
    - In **Twilio Console**: **Messaging** → **Regulatory Compliance** → **A2P 10DLC** (or search “A2P” / “10DLC”).
    - **Register a Brand** (business/org details, EIN, address).
    - **Register a Campaign** (use case, volume, sample messages), linked to the Brand.
    - **Associate your Twilio number** with the approved Campaign.
    - See [Twilio A2P 10DLC](https://www.twilio.com/docs/messaging/a2p-10dlc). Brand/campaign approval can take a few days.

### 6. Fallback: one-to-one SMS (no Group MMS)

- If Group MMS keeps failing (carrier/registration/trial), you can temporarily send the question via **one-to-one SMS** (Twilio `messages.create` to each member’s phone) instead of the Conversation. That uses a different path and often works when Group MMS is blocked. Implementing that would be a small change to the cron (loop over members, send SMS per phone) and can be reverted once Group MMS is fixed.

---

**Summary**

| Use            | URL / value                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| API base       | `https://<service-name>.onrender.com`                                                                            |
| Twilio webhook | `https://<service-name>.onrender.com/twilio/conversations/webhook`                                               |
| Cron endpoint  | `POST https://<service-name>.onrender.com/cron/send-weekly-questions` with `Authorization: Bearer <CRON_SECRET>` |
