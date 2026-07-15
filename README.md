# Inspire — MVP

A real, working full-stack build of the trimmed MVP: story feed with photo/video
posts, support reactions (instead of likes), anonymous/public posting, and Aria
with a free-tier daily message limit.

**Want to deploy this to inspirerealexperiences.com?** See `DEPLOYMENT.md` for
the exact steps (domain registration, MongoDB Atlas, Render, Vercel, DNS).

**Stack:** React + Vite + Tailwind (frontend) · FastAPI (backend) · MongoDB-ready
data layer that runs in-memory out of the box, no DB setup required to try it.

## What's actually wired up vs. stubbed

| Feature | Status |
|---|---|
| Auth (register/login, JWT) | Real |
| Story feed, categories, filtering | Real |
| Photo/video on posts | Real (stored as data URLs for this MVP — swap for S3/Cloudinary in production, see `StoryCreate.jsx`) |
| Support reactions | Real |
| Anonymous/public toggle | Real |
| Aria chat + daily free-message limit | Real limit logic. Replies are canned/reflective by default — flip `USE_OPENAI=true` + add a real key in `backend/.env` to make Aria call OpenAI live |
| Premium upgrade | Mocked (flips a flag, no real charge) — see comments in `premium_router.py` for how to wire real Stripe Checkout |
| Database | In-memory by default (resets on restart). Flip `USE_MONGO=true` + `MONGO_URI` in `backend/.env` to use real MongoDB — no router code changes needed |
| Calls, DMs | Not built — intentionally cut from this MVP per the trimmed scope |

## Run it locally

**Backend**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8756
```
Check it's alive: `curl http://127.0.0.1:8756/health`

**Frontend** (separate terminal)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Open the URL Vite prints (usually `http://localhost:5173`).

## Going from MVP to production

1. **Real database**: create a free MongoDB Atlas cluster, set `USE_MONGO=true` and `MONGO_URI` in `backend/.env`.
2. **Real Aria**: set `USE_OPENAI=true` and `OPENAI_API_KEY` in `backend/.env`.
3. **Real media storage**: swap the base64 data-URL upload in `StoryCreate.jsx` for a real upload to S3/Cloudinary/similar, storing the resulting URL instead of file bytes.
4. **Real payments**: replace `POST /premium/mock-upgrade` with a Stripe Checkout session + webhook that flips `is_premium` only after a verified payment event (see comments in `premium_router.py`).
5. **Deploy**: backend to Render/Fly.io/Railway, frontend to Vercel/Netlify, point `VITE_API_URL` at the deployed backend URL.
6. **Founder account**: the `is_founder` flag exists on the user model already (for your permanent-Premium "i" badge) — set it manually on your own user record once you have a real DB.
