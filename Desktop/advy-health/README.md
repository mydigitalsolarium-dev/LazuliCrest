# Advy Health — Setup Guide

## Your complete project structure

```
advy-health/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
│       ├── icon-192.png   ← PUT YOUR LOGO HERE
│       └── icon-512.png   ← PUT YOUR LOGO HERE (larger version)
├── src/
│   ├── App.jsx
│   ├── firebase.js
│   └── index.js
├── .github/
│   └── workflows/
│       └── deploy.yml
├── firestore.rules
├── package.json
└── vercel.json
```

---

## Step 1 — Add your logo files

1. Take your logo image (the purple lotus one)
2. Create a folder called `icons` inside the `public` folder
3. Save two copies:
   - `public/icons/icon-192.png` (resize to 192×192 pixels)
   - `public/icons/icon-512.png` (resize to 512×512 pixels)

Free resize tool: https://www.iloveimg.com/resize-image

---

## Step 2 — Update Firestore Rules

1. Go to https://console.firebase.google.com
2. Click your **advyhealth** project
3. Left sidebar → **Firestore Database** → **Rules** tab
4. Delete everything there, paste the contents of `firestore.rules`
5. Click **Publish**

---

## Step 3 — Push to GitHub

If this is a new repo:
```bash
cd advy-health
git init
git add .
git commit -m "Advy Health v2 — full rebuild"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/advy-health.git
git push -u origin main
```

If it's the same repo as before:
```bash
cd advy-health
git add .
git commit -m "v2: body map, diary, share link, AI diet, mobile fix"
git push
```

---

## Step 4 — Deploy on Vercel (easiest method — no GitHub Actions needed)

**Option A: Direct from Vercel (recommended for beginners)**

1. Go to https://vercel.com → sign up with your GitHub account
2. Click **"Add New Project"**
3. Find and import your `advy-health` GitHub repository
4. Vercel auto-detects Create React App
5. Click **Deploy** — done! Your site is live in ~2 minutes
6. Every time you push to GitHub, Vercel auto-redeploys

**Option B: GitHub Actions (automatic on every push)**

Only if you want automated deploys via Actions:
1. Deploy once via Vercel dashboard (Option A)
2. In Vercel: Settings → General → copy your Project ID
3. In Vercel: Account Settings → Tokens → create a token
4. In GitHub repo: Settings → Secrets → add VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID

---

## Step 5 — Update Firebase Auth domain

After deploying to Vercel, add your new domain to Firebase:
1. Firebase Console → Authentication → Settings → Authorized domains
2. Click **Add domain**
3. Add your Vercel URL (e.g. `advy-health.vercel.app`)

---

## What's in this version

- ✅ Body Map — tap any joint/muscle to log pain type and severity
- ✅ Diary — real ruled-paper diary with cursive handwriting fonts
- ✅ Share Link — PIN-protected secure health summary link (7-day expiry)
- ✅ AI Diet Advisor — personalized meal plans via AI
- ✅ AI Advocate fixed — uses your real logo, Imago + Ikigai philosophy
- ✅ Mobile layout — hamburger menu, works perfectly in portrait mode
- ✅ Your real logo used everywhere (no more hand-drawn SVG)
- ✅ Ikigai & Imago references throughout the app
