# Putting Breyanna Fitness online (beginner guide)

This walks you through getting a **live web link** for the app that you and your
wife can open on any phone or computer. No coding, no installing anything — just
clicking through a few websites. Budget about 20 minutes the first time.

You'll use two free services:

1. **Neon** — a free online database (where members, classes and bookings live).
2. **Vercel** — free web hosting that runs the app and gives you the link.

Both let you sign in with your GitHub account.

---

## Step 1 — Create the database (Neon)

1. Go to **https://neon.tech** and click **Sign up**. Choose **Continue with
   GitHub** and approve.
2. It will offer to create a project. Give it a name like `breyanna` and click
   **Create project** (the default region/settings are fine).
3. After it's created, you'll see a box labeled **Connection string** (it starts
   with `postgresql://...`). Click the **copy** icon to copy it.
   - Keep this safe for a moment — you'll paste it into Vercel in Step 2.
   - It already includes everything needed (username, password, `sslmode`).

---

## Step 2 — Deploy the app (Vercel)

1. Go to **https://vercel.com** and click **Sign Up** → **Continue with
   GitHub** and approve.
2. Click **Add New… → Project**.
3. Find the repository **`breyannaapp`** in the list and click **Import**.
   (If Vercel asks for permission to see your GitHub repos, approve it.)
4. **Set the production branch** (important): before deploying, open the
   **Git** section / branch selector and choose the branch
   **`claude/wonderful-mccarthy-fWkWb`** as the one to deploy. (If you don't see
   this option now, you can also set it later under **Settings → Git →
   Production Branch**.)
5. Expand **Environment Variables** and add these three (Name → Value):

   | Name           | Value                                                        |
   | -------------- | ------------------------------------------------------------ |
   | `DATABASE_URL` | *paste the Neon connection string from Step 1*               |
   | `AUTH_SECRET`  | *a long random string* (e.g. ask for one, or mash 40+ chars) |
   | `SETUP_KEY`    | *any hard-to-guess word/number you'll remember for one click*|

6. Click **Deploy**. Wait a couple of minutes while it builds. When it's done
   you'll get a link like **`https://breyannaapp.vercel.app`**.

> The first build automatically creates all the database tables for you.

---

## Step 3 — Load the starter data (one click)

The app is live but the database is empty. To fill it with sample classes and
members so you can explore:

1. In your browser, visit this address **once**, replacing the parts in CAPS:

   ```
   https://YOUR-APP.vercel.app/api/setup?key=YOUR_SETUP_KEY
   ```

   - `YOUR-APP.vercel.app` = your Vercel link from Step 2.
   - `YOUR_SETUP_KEY` = the exact `SETUP_KEY` value you set in Step 2.

2. You should see a short message saying the demo data was loaded. Done!

---

## Step 4 — Sign in

Open your Vercel link and sign in:

- **Studio owner (CRM):** `owner@demo.com` / `password`
- **Member view:** `member@demo.com` / `password`

New members can create their own accounts with the **Create an account** link.

---

## Everyday tips

- **Sharing:** just send people your `https://…vercel.app` link. It works on any
  phone browser. On an iPhone you can tap **Share → Add to Home Screen** to make
  it feel like an app icon.
- **Updates:** whenever the app's code is updated, Vercel automatically rebuilds
  and your link updates — you don't have to do anything.
- **Starting fresh for the real studio:** when you're ready to clear the demo
  members and start clean, visit
  `https://YOUR-APP.vercel.app/api/setup?key=YOUR_SETUP_KEY&force=1`. (This wipes
  and reloads sample data. A dedicated "clean studio" setup can be added when you
  go live for real.)

## If something goes wrong

- **Build failed:** double-check the `DATABASE_URL` value is the full Neon string
  and that all three environment variables are spelled exactly as above. In
  Vercel, go to **Settings → Environment Variables**, fix them, then **Redeploy**
  from the **Deployments** tab.
- **`/api/setup` says "Invalid setup key":** the `key=` in the address must match
  your `SETUP_KEY` exactly (case-sensitive).
- **Can't sign in:** make sure you ran Step 3 first.
