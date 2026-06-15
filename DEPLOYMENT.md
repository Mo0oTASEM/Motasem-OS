# Nova OS Deployment

## Frontend
1. Create a Firebase project.
2. Enable Firebase Auth with Google provider.
3. Enable Firestore and Storage.
4. Copy `.env.example` to `.env` and fill the `VITE_FIREBASE_*` values.
5. Build and deploy:

```bash
npm run build
firebase deploy --only hosting,firestore,storage
```

## Backend
1. Create Google OAuth credentials for a web app.
2. Add the Cloud Run callback URL to OAuth redirect URIs.
3. Copy `server/.env.example` values into Cloud Run environment variables or Secret Manager.
4. Build and deploy the server container:

```bash
gcloud run deploy nova-os-api --source server --region us-central1 --allow-unauthenticated
```

## Required Google APIs
- Google Calendar API
- Google Tasks API
- Google Sheets API
- Google Drive API
- Google Docs API
- Gmail API
- People API
- Vertex AI / Gemini API

## Google Sheets Data Store
Nova OS writes these app datasets to Google Sheets:

- Habits
- Journal
- Finance
- Projects
- Goals

Set `GOOGLE_SHEETS_SPREADSHEET_ID` in `server/.env` to use an existing editable spreadsheet. Leave it empty and the backend will create a `Motasem OS` spreadsheet after Google Workspace OAuth is connected.

Do not use a published `/d/e/.../pubhtml` URL as `GOOGLE_SHEETS_SPREADSHEET_ID`; Google Sheets API needs the editable spreadsheet ID from a normal URL like `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`.

## Telegram Voice Bot
1. Create a bot with BotFather.
2. Put the BotFather token in `server/.env` as `TELEGRAM_BOT_TOKEN`.
3. Set a random shared secret as `TELEGRAM_WEBHOOK_SECRET`.
4. Expose the local backend with a tunnel for testing, then set the webhook:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<PUBLIC_BACKEND_URL>/telegram/webhook/<FIREBASE_USER_ID>?secret=<TELEGRAM_WEBHOOK_SECRET>"
```

Voice messages sent to the bot are downloaded, transcribed with Gemini, and stored in `users/{userId}/memory_items`.

## Security Checklist
- Keep Google refresh tokens server-side only.
- Keep Gemini API keys server-side only.
- Deploy Firestore and Storage rules before real data import.
- Restrict Cloud Run CORS to the Firebase Hosting domain.
- Use Cloud Scheduler for recurring sync and report routes.
