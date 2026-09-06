# Dota Skill Lab — Web Beta Final

Public web version of Dota Skill Lab for Vercel with Steam OpenID sign-in, multi-user cloud profiles, Neon persistence, and persistent match caching.

## Authentication

- Users do **not** enter a Steam Web API key.
- `STEAM_API_KEY` is stored only as a server-side Vercel environment variable.
- Steam OpenID verifies ownership of the Steam account.
- A signed HttpOnly/Secure cookie keeps the user signed in for 30 days.
- Dota account ID is derived automatically from the verified SteamID64.

## Required Vercel environment variables

`STEAM_API_KEY` — 32-character Steam Web API key used by the backend for all beta users.

`SESSION_SECRET` — long random string used to sign login cookies.

`DATABASE_URL` — Neon PostgreSQL connection string for cross-device profile sync and persistent match cache.

Do not put real secrets into GitHub, browser JavaScript, screenshots, or chat messages.

## Multi-user profile sync

Each authenticated Steam user is stored separately by SteamID64. Neon synchronizes:

- manual role corrections;
- manual Rank/MMR snapshot;
- current 5-game training block;
- personal journal;
- language;
- Ranked/All scope preference;
- history depth preference.

The browser keeps a local fallback. On the first database-enabled login, existing browser settings can migrate into the user's cloud profile when no server profile exists yet.

## Match cache

Steam match details use a two-level cache:

1. in-memory Vercel runtime cache;
2. persistent Neon `dsl_match_cache`;
3. Steam Web API only on cache miss.

Bundle loads use one batched Neon read for the requested match IDs and one batched Neon write for newly fetched matches. This reduces repeated database round trips and Steam API traffic for 50/100/200-match profiles.

## Mobile UX

At tablet/mobile widths the desktop sidebar becomes a sticky horizontal navigation rail. Group labels are hidden, primary destinations are ordered first (Overview, Matches, Heroes, Sessions), and the rail is touch-scrollable. Command Center, profile actions, KPI grids, DNA, filters, modals, hero cards, Training, Progress, and match layouts collapse for narrow screens.

## First test

1. Deploy the project to Vercel.
2. Configure `STEAM_API_KEY`, `SESSION_SECRET`, and `DATABASE_URL`.
3. Open the production URL on a phone or desktop.
4. Tap **Sign in through Steam**.
5. Steam redirects back to `/api/auth/callback`.
6. Dota Skill Lab loads the user's ranked history.
7. Change a manual role, Rank/MMR, journal note, or training block.
8. Sign in with the same Steam account on another device and confirm the setting is restored.
9. Reload analytics and confirm the second load uses persistent cache hits.

The Steam account must have **Expose Public Match Data** enabled in Dota 2 for match-history analytics.

## Current beta limitations

- The first-ever load of uncached matches still requires Steam requests; later loads reuse Neon.
- External Steam benchmark can be slower than the core personal analytics.
- Deep Match depends on OpenDota availability and parsed replay data.
- A dedicated service Steam account/API key is recommended before broader public testing so the product is not tied to a personal Steam account.

Production multi-user + Neon rollout: 2026-09-06.
Final beta backend version: `web-beta-3-final`.
