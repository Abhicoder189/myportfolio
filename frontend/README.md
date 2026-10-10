# Sentimental Terminal — Abhinav.exe

A responsive, retro-pixel/cyberpunk portfolio concept built with React + Vite. Includes a terminal-style chat UI, browser voice input, spoken responses, animated bot states, suggested prompts, and profile links.

## Run it

```bash
npm install
cp .env.example .env
npm run dev
```

Open the localhost URL printed by Vite. Voice input uses the browser Speech Recognition API; Chrome/Edge on localhost or HTTPS is recommended. Spoken replies use the browser Speech Synthesis API.

## Connect your existing backend

Edit `.env`:

```env
VITE_CHAT_API_URL=http://localhost:8000/your-chat-endpoint
VITE_CHAT_API_METHOD=POST
VITE_CHAT_API_TOKEN=
```

The default request body sends all three common text keys so the starter is easy to adapt:

```json
{"message":"...", "query":"...", "question":"..."}
```

The response parser looks for a string response in `response`, `answer`, `message`, `reply`, `output`, `result.response`, or `choices[0].message.content`.

**You must match this to your real API contract.** In `src/main.jsx`, edit the `fetch` body and the `answer` mapping inside `sendMessage()` to match your FastAPI route. If your backend requires authentication, add the token to `VITE_CHAT_API_TOKEN` (or implement your existing auth flow). Configure CORS on the backend to allow the Vite dev origin.

## Personalize before publishing

- Replace the GitHub and LinkedIn placeholder URLs in `src/main.jsx`.
- Put your real resume at `public/resume.pdf` (create `public/` first).
- Replace `hello@example.com` with your email.
- Update the profile text, quick prompts, and assistant intro.

## Voice notes

- The mic requests browser permission and transcribes speech into the chat.
- Voice responses can be toggled from the top-right control.
- Speech APIs vary by browser and operating system; typed chat remains available.
- Do not put secret API keys in `VITE_*` variables. These are exposed to the browser. Use a public frontend endpoint or your own backend session/auth mechanism.
