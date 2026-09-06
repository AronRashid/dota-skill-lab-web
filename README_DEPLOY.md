# Dota Skill Lab — Web Beta

This branch is the public-web version of Dota Skill Lab. It is designed for Vercel and uses Steam OpenID sign-in.

## What changed

- Users do **not** enter a Steam Web API key.
- `STEAM_API_KEY` is stored only as a server-side environment variable.
- Steam OpenID verifies ownership of the Steam account.
- A signed HttpOnly/Secure cookie keeps the user signed in for 30 days.
- Dota account ID is derived automatically from the verified SteamID64.
- Match history, item images, Hero/Role analytics, Match Coach, Deep Match Lab and benchmark endpoints remain available.
- OpenDota parsing is server-side, so corporate-network blocking on the user's device no longer necessarily blocks Deep Match data.

## Required Vercel environment variable

`STEAM_API_KEY` — 32-character Steam Web API key.

Do not put the real key into source code, `.env.example`, GitHub, browser JavaScript, or chat messages. Add it as a Vercel Project Environment Variable/Secret.

Optional: `SESSION_SECRET` — long random string used to sign the login cookie. If omitted, Web Beta derives the signing key from `STEAM_API_KEY` for the beta.

## First test

1. Deploy the project to Vercel.
2. Open the generated `https://...vercel.app` URL on a phone.
3. Tap **Sign in through Steam**.
4. Steam redirects back to `/api/auth/callback`.
5. Dota Skill Lab loads 50 ranked matches by default.
6. After the first successful load, change the depth to 100/200 if desired.

The Steam account must have **Expose Public Match Data** enabled in Dota 2 for match-history analytics.

## Beta limitations

- Role corrections, manual MMR/rank, journal and training state still use browser `localStorage`, so they are currently device-specific. A database can be added for cross-device persistence later.
- 100/200-match first loads make many Steam requests. The default is intentionally 50 for the mobile beta.
- External Steam benchmark can be slower than the core personal analytics.
