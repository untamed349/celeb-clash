# Celeb Clash — web version

One small Node.js server hosts the game page **and** runs online matches and the leaderboard.
Anyone with the URL can play. No accounts needed (players get a random name they can rename in the Online screen).

## Option A — Render.com (free, easiest: one service does everything)
1. Create free accounts at github.com and render.com.
2. Create a new GitHub repository and upload everything in this folder
   (`server.js`, `package.json`, `package-lock.json`, `README.md` and the `public` folder).
3. In Render: **New → Web Service** → connect that repository.
   - Runtime: **Node**
   - Build command: `npm install`
   - Start command: `node server.js`
   - Instance type: **Free**
4. Click **Create Web Service**. After a minute or two you get a link like
   `https://celeb-clash.onrender.com`. That is your game: share it.

Notes: free Render services sleep after about 15 minutes without visitors, and the first visit after that
takes up to a minute to wake. The leaderboard is saved in `leaderboard.json`, which a free Render
service loses when it restarts or redeploys. Railway, Fly.io and Glitch work the same way
(build `npm install`, start `node server.js`).

## Keep the leaderboard between deploys (free)
Render's free plan wipes the server's files on every deploy and restart, so the leaderboard
needs a small outside database. Upstash Redis has a free plan that is plenty for this.
1. Sign up at upstash.com and create a **Redis** database (free plan, any region near you).
2. On the database page, open the **REST API** section and copy `UPSTASH_REDIS_REST_URL`
   and `UPSTASH_REDIS_REST_TOKEN`.
3. In Render: open the `celeb-clash` service, then **Environment**, add both variables with
   those values, and save. Render redeploys automatically.
4. The deploy log should say `leaderboard: Upstash`. From then on, scores survive every push.

## Option B — itch.io page + the game server
1. Deploy the server as in Option A and note its address, e.g. `https://celeb-clash.onrender.com`.
2. Edit `public/config.js` and set:
   `window.CC_SERVER='wss://celeb-clash.onrender.com/ws';`
3. Zip the **contents** of the `public` folder (index.html must be at the top level of the zip).
4. On itch.io: **Upload new project** → Kind of project: **HTML** → upload the zip → tick
   "This file will be played in the browser" → viewport 960 × 540 → tick "Fullscreen button". Publish.

## Run it on your own computer
```
npm install
npm start
```
Then open http://localhost:8080 (open two browser windows to try an online match).
