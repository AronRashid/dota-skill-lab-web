# Dota Skill Lab — Web Beta

Public-web version of Dota Skill Lab for Vercel with Steam OpenID sign-in and multi-user profiles.

## Authentication

- Users do **not** enter a Steam Web API key.
- `STEAM_API_KEY` is stored only as a server-side Vercel environment variable.
- Steam OpenID verifies ownership of the Steam account.
- A signed HttpOnly/Secure cookie keeps the user signed in for 30 days.
- Dota account ID is derived automatically from the verified SteamID64.

## Required Vercel environment variables

`STEAM_API_KEY` — 32-character Steam Web API key used by the backend for all beta users.

`SESSION_SECRET` — long random string used to sign login cookies. Recommended for production/beta.

`DATABASE_URL` — Neon PostgreSQL connection string. When configured, authenticated users get cross-device profile sync.

Do not put real secrets into GitHub, browser JavaScript, screenshots, or chat messages.

## Multi-user profile sync

The app stores each authenticated Steam user separately by SteamID64. The database layer currently synchronizes:

- manual role corrections;
- manual Rank/MMR snapshot;
- current 5-game training block;
- personal journal;
- language;
- Ranked/All scope preference;
- history depth preference.

The browser keeps a local fallback. On the first database-enabled login, existing browser settings are migrated into the user's cloud profile when no server profile exists yet.

Database tables are created automatically by `/api/user-state` when `DATABASE_URL` is configured. The reference schema is also in `db/schema.sql`.

## First test

1. Deploy the project to Vercel.
2. Configure `STEAM_API_KEY`, `SESSION_SECRET`, and `DATABASE_URL`.
3. Open the production URL on a phone or desktop.
4. Tap **Sign in through Steam**.
5. Steam redirects back to `/api/auth/callback`.
6. Dota Skill Lab loads the user's ranked history.
7. Change a manual role, Rank/MMR, journal note, or training block.
8. Sign in with the same Steam account on another device and confirm the setting is restored.

The Steam account must have **Expose Public Match Data** enabled in Dota 2 for match-history analytics.

## Current beta limitations

- Match payload caching is still primarily in the serverless runtime. `dsl_match_cache` is reserved in the schema for the next optimization pass.
- 100/200-match first loads make many Steam requests. The mobile beta should start with a smaller bootstrap sample and expand after the dashboard is visible.
- External Steam benchmark can be slower than the core personal analytics.
- A dedicated service Steam account/API key is recommended before broader public testing so the product is not tied to a personal Steam account.

Deployment note: Neon `DATABASE_URL` was enabled for the production multi-user rollout on 2026-09-06.
