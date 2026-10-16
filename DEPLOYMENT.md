# Deploying UniBaazar to cPanel

Target: `unibaazar.com`, repo `https://github.com/pitchforgebd/unibaazar.git`, Node.js app on cPanel (Passenger), MySQL database on the same server.

This assumes your cPanel plan has **"Setup Node.js App"** (CloudLinux Node.js Selector) and **Terminal** access — both are standard on cPanel hosts that advertise Node.js support.

---

## 0. Before you start

- Confirm `unibaazar.com` already points at this cPanel account (A record or nameservers), otherwise the site won't be reachable even once everything below is done.
- Confirm your cPanel plan's Node selector offers **Node 20.x** (Next.js 15 needs Node ^18.18 or >=20 — 20 LTS is the safe pick).
- Keep your DB password and any API keys out of chat/screenshots going forward — once this deploy is live, treat `.env` as the only place they live.

---

## 1. Create the MySQL database

cPanel → **MySQL® Databases**.

1. Under "Create New Database", create a database. cPanel will prefix whatever name you type with your cPanel username, e.g. typing `unibaazer_db` as a `pitchfor` account becomes **`pitchfor_unibaazer_db`**. Note the exact prefixed name shown on screen.
2. Under "MySQL Users → Add New User", create `unibaazer_user` with the password `4s8YtpkPb5Ssicn6` (or set a new one — your call). It becomes **`pitchfor_unibaazer_user`** the same way.
3. Under "Add User To Database", add that user to that database with **ALL PRIVILEGES**.

Write down the three _final, prefixed_ values — you need them verbatim in step 5.

---

## 2. Create the Node.js app

cPanel → **Setup Node.js App** → **Create Application**.

| Field                    | Value                                                                   |
| ------------------------ | ----------------------------------------------------------------------- |
| Node.js version          | 20.x (latest available)                                                 |
| Application mode         | Production                                                              |
| Application root         | `unibaazar` (a folder under your home dir, e.g. `/home/USER/unibaazar`) |
| Application URL          | `unibaazar.com`                                                         |
| Application startup file | `server.js`                                                             |

Click **Create**. cPanel creates the (mostly empty) `unibaazar` folder and a **virtual environment** for this app. The page shows a command like:

```bash
source /home/USER/nodevenv/unibaazar/20/bin/activate && cd /home/USER/unibaazar
```

Copy that exact line — you'll run it every time you `npm install`, `npm run build`, or run `npx prisma` commands, because this activates the Node version cPanel picked (plain `node`/`npm` in Terminal may point at a different/no version).

---

## 3. Clone the repo (Terminal)

```bash
source /home/USER/nodevenv/unibaazar/20/bin/activate
cd /home/USER
```

If `unibaazar/` is empty (cPanel just created it):

```bash
git clone https://github.com/pitchforgebd/unibaazar.git unibaazar
cd unibaazar
```

If cPanel put placeholder files in it (non-empty), clone elsewhere and move the contents in instead:

```bash
git clone https://github.com/pitchforgebd/unibaazar.git /home/USER/unibaazar_src
rsync -a /home/USER/unibaazar_src/ /home/USER/unibaazar/
rm -rf /home/USER/unibaazar_src
cd /home/USER/unibaazar
```

---

## 4. Create `.env`

```bash
cp .env.example .env
nano .env
```

Fill in at minimum:

```bash
DATABASE_URL=mysql://pitchfor_unibaazer_user:4s8YtpkPb5Ssicn6@localhost:3306/pitchfor_unibaazer_db
NEXT_PUBLIC_SITE_URL=https://unibaazar.com
AUTH_SECRET=<random 32+ char string>
CRON_SECRET=<random string>
```

Replace the DB name/user with your _actual_ prefixed values from step 1 — `unibaazer_db`/`unibaazer_user` as typed almost certainly aren't the real names once cPanel prefixes them.

Generate strong random values for `AUTH_SECRET` and `CRON_SECRET`:

```bash
openssl rand -hex 32
```

Everything else in `.env.example` (payment gateways, SMS, SMTP, social/pixel IDs) can stay blank for now — all of those are also settable from the admin panel (Settings → Integrations/Social/Tracking) after launch, and the app runs fine without them (those features just no-op until configured). `STEADFAST_API_KEY`/`STEADFAST_SECRET_KEY` likewise — Settings → Integrations now reads the DB-saved Steadfast key first and only falls back to these env vars.

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X` in nano).

---

## 5. Install, generate, migrate, build

Still inside the activated venv, in `/home/USER/unibaazar`:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

- `npm install` needs the full `node_modules` (including devDependencies) because `next build` compiles TypeScript — don't use `--omit=dev`.
- `npx prisma migrate deploy` applies the committed migrations non-interactively. Never use `prisma migrate dev` on the server — that's the local/interactive command.
- If you want the seeded staff roles + sample catalog on a brand-new database: `npm run db:seed` (run it _before_ `npm run build`, order doesn't actually matter, but do it once, not on every deploy — it's meant for an empty DB, not a live one with real orders).
- If `npm run build` dies (OOM) on a memory-constrained plan: retry with `NODE_OPTIONS=--max-old-space-size=2048 npm run build`.

---

## 6. Start the app

cPanel → **Setup Node.js App** → find the `unibaazar` app → **Restart**.

cPanel manages the process (via Passenger) — you don't run `node server.js` yourself in a terminal session that would die when you disconnect. `server.js` already reads `PORT`/`NODE_ENV` from the environment, which Passenger sets automatically.

Give it 10–20 seconds after a restart before testing — a fresh Next.js process takes a moment to boot.

---

## 7. SSL

cPanel → **SSL/TLS Status** → run **AutoSSL** for `unibaazar.com` if it isn't already issued. Next.js doesn't need any code change for this — cPanel/Apache terminates TLS in front of the Node app.

---

## 8. Cron jobs

cPanel → **Cron Jobs** → add these three (replace `YOUR_CRON_SECRET` with the real `CRON_SECRET` from `.env`):

```bash
# Cancel unpaid non-COD orders stuck in PENDING for over 24h — hourly
0 * * * * curl -fsS -X POST "https://unibaazar.com/api/v1/cron/cancel-unpaid-orders?secret=YOUR_CRON_SECRET"

# Catch any variant that drifted below its low-stock threshold — every 30 min
*/30 * * * * curl -fsS -X POST "https://unibaazar.com/api/v1/cron/low-stock-sweep?secret=YOUR_CRON_SECRET"

# Daily database backup at 2am
0 2 * * * cd /home/USER/unibaazar && /bin/sh scripts/backup-db.sh
```

`mysqldump` must be on the server `PATH` for the backup job — it is by default on cPanel. Backups land in `unibaazar/backups/` (gitignored, not deleted by a redeploy).

---

## 9. First login and smoke test

Visit `https://unibaazar.com`.

Admin login: phone `01700000000`, password `pass1234` — **this is a seeded default password, change it immediately** (Users → your account → change password, or the password-reset flow) once you've confirmed login works.

Walk through:

- Homepage loads, images render, add a product to cart.
- Place one real test order end to end.
- `/admin` dashboard loads, shows the test order.
- Settings → Integrations shows the Steadfast webhook Callback URL as `https://unibaazar.com/api/webhooks/steadfast` (confirms `NEXT_PUBLIC_SITE_URL` is set correctly) — paste that plus a generated Auth token into your real Steadfast merchant panel's webhook settings when you're ready to go live with courier booking.
- Settings → General → upload the real logo/favicon.

---

## 10. Redeploying later

Every time you push new code to `main`:

```bash
source /home/USER/nodevenv/unibaazar/20/bin/activate
cd /home/USER/unibaazar
git pull origin main
npm install
npx prisma migrate deploy
npm run build
```

Then cPanel → Setup Node.js App → **Restart**.

(`npx prisma migrate deploy` is a no-op if there's nothing new to apply — always safe to run.)

---

## Troubleshooting

| Symptom                                                    | Likely cause                                                                                                                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blank/500 page right after restart                         | Give it 10–20s; Passenger is still booting the process                                                                                                                     |
| "Module not found" after a pull                            | Forgot `npm install` (new dependency)                                                                                                                                      |
| Prisma client errors after a pull                          | Forgot `npx prisma generate` or `npx prisma migrate deploy` (schema changed)                                                                                               |
| `npm`/`node` not found, or wrong version                   | You didn't `source .../activate` first in this Terminal session                                                                                                            |
| `npm run build` killed / OOM                               | Retry with `NODE_OPTIONS=--max-old-space-size=2048 npm run build`, or build locally and upload `.next/`                                                                    |
| Uploaded product/banner images missing after a fresh clone | Expected — `public/uploads/` is gitignored on purpose (user-uploaded, not source code); it's only empty on the very first deploy and persists across `git pull` after that |
| Logs                                                       | cPanel → Setup Node.js App → the app → log file path shown on that page                                                                                                    |
