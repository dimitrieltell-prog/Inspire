# Deploying Inspire to inspirerealexperiences.com

This is the exact path from this codebase to a live site at your domain.
Total cost to start: the domain itself (~$10-15/year). Render's free tier and
Vercel's free tier cover hosting; MongoDB Atlas has a free tier too.

Everything below is done in each provider's dashboard/CLI — I can't click
these buttons for you, but every config file each step needs is already in
this repo.

---

## 0. Push this code to GitHub

Render and Vercel both deploy straight from a GitHub repo — it's the least
friction path for both.

```bash
cd inspire-app
git init
git add .
git commit -m "Inspire MVP"
```
Create a new repo on github.com, then:
```bash
git remote add origin https://github.com/<you>/inspire.git
git push -u origin main
```

## 1. Register the domain

Recommendation: **Cloudflare Registrar** (cloudflare.com/products/registrar) —
sells at wholesale cost with no markup, and gives you free DNS management in
the same dashboard, which makes step 4 simpler. Namecheap or Google Domains'
successor (Squarespace Domains) work fine too if you'd rather use those.

Search `inspirerealexperiences.com`, buy it. Nothing else to configure yet.

## 2. Database — MongoDB Atlas (free tier)

1. Create an account at mongodb.com/cloud/atlas
2. Create a free **M0** cluster (512MB, enough for an early MVP)
3. Database Access → add a user + password
4. Network Access → Add IP Address → **Allow access from anywhere** (0.0.0.0/0)
   — fine for now; tighten later
5. Connect → Drivers → copy the connection string, looks like:
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/`

Keep this string — you'll paste it into Render in step 3.

## 3. Backend — Render

`backend/render.yaml` in this repo is a Render Blueprint — Render reads it
automatically.

1. render.com → New → Blueprint → connect your GitHub repo
2. Render detects `render.yaml` and proposes the `inspire-backend` service
3. Before deploying, fill in the two secrets it will ask for (marked
   `sync: false` in the blueprint, so Render prompts you):
   - `MONGO_URI` → the connection string from step 2
   - `OPENAI_API_KEY` → leave blank for now (Aria works fine without it)
4. Deploy. Render gives you a URL like `https://inspire-backend.onrender.com`
5. Confirm it's alive: `curl https://inspire-backend.onrender.com/health`

**Free tier note**: Render's free web services spin down after 15 minutes of
inactivity and take ~30-50 seconds to wake back up on the next request. Fine
for an early MVP; upgrade to a paid instance ($7/mo) once real users show up
and that cold-start delay would hurt.

**Custom API subdomain (optional, do this after step 5 works)**: in the
Render service → Settings → Custom Domains → add `api.inspirerealexperiences.com`.
Render gives you a CNAME record to add — do that in step 5's DNS panel.

## 4. Frontend — Vercel

1. vercel.com → Add New Project → import the same GitHub repo
2. Set **Root Directory** to `frontend` (Vercel auto-detects Vite)
3. Add one environment variable:
   - `VITE_API_URL` → your Render URL from step 3 (or the `api.` subdomain
     if you set that up)
4. Deploy. Vercel gives you a URL like `https://inspire-xyz.vercel.app` —
   confirm the site loads and you can register/read stories.

## 5. Point the domain at both

In your registrar's DNS settings (or Cloudflare's dashboard if you registered
there):

| Type | Name | Value |
|---|---|---|
| A or ALIAS | `@` | Vercel's IP / ALIAS target (Vercel shows the exact value when you add the domain in step 4b below) |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `api` | the target Render shows you in step 3's custom domain screen |

Then:
- In Vercel: Project → Settings → Domains → add `inspirerealexperiences.com`
  and `www.inspirerealexperiences.com`. Vercel shows you the exact DNS
  records to add if the table above doesn't match what it wants.
- In Render: the custom domain from step 3 becomes live once its CNAME
  resolves.

DNS propagation is usually minutes, occasionally up to 24-48 hours.

## 6. Wire the final pieces

Once the domain is live end to end:

1. **Update CORS**: in Render's env vars, confirm `CORS_ORIGINS` includes
   `https://inspirerealexperiences.com` and `https://www.inspirerealexperiences.com`
   exactly (already set by the blueprint — just double check after DNS is live).
2. **HTTPS**: automatic on both Render and Vercel, nothing to do.
3. **Test the full loop on the real domain**: register an account, post a
   story with a photo, react to it, talk to Aria until you hit the free
   limit, upgrade via the mock Premium button.

## 7. Before you tell real people about it

These were flagged as demo-only in the main README — worth revisiting
before real traffic:
- Swap the mock Premium upgrade for real Stripe Checkout + webhook
- Swap base64 media storage for S3/Cloudinary/R2
- Consider Render's paid tier to avoid the cold-start delay
- Set `USE_OPENAI=true` + a real key once you're ready for Aria to be a real LLM
