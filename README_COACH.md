# Coaching layer

The existing visual style and analytical modules are retained. Overview is now the answer; other sections hold the evidence.

## Architecture audit

`app.js` owns role inference/overrides, role-duration Performance, baselines, mistakes, chronological holdout patterns, sessions, hero-role profiles, training and progress. Previously Overview repeated the same conclusions in the cockpit, focus, quick compare, route, eight KPIs, DNA and charts. These existing elements, IDs, computations and event handlers now remain in a collapsed supporting-analytics block in Coach. Overview contains one brief, the current training cycle, five recent matches, a small progress snapshot and navigation to evidence.

The adapter in `coach-brief.js` uses the existing calculations. It applies `buildMistakes` to the primary-role sample, instead of treating mixed-role confidence as role-specific evidence. New priorities require at least 20 role matches, mistake confidence >=60 and no more than 30% low-confidence recent roles. Support priorities exclude core farming/damage advice. High confidence additionally requires an existing confirmed holdout pattern. These gates are coaching policy, not new performance metrics.

## Grounding contract

`coach-core.js` is shared by browser and server. Input is bounded to 18,000 characters / a 20 KB request. It includes summaries of the last 3/5/20 and previous 20, at most three role-specific priorities, three reliable hero-role gaps, one significant session finding, current training, five compact match records, missing-data flags and dataset/role revisions. No journal, account identifiers, avatars, credentials, raw players or replay payload is sent to OpenAI. Benchmark data is not included: it is an optional separately loaded comparison and cannot support a claim in this brief.

The model receives a strict JSON schema and selects `priority_id`, `evidence_ids`, `supporting_ids`, `match_ids`. It cannot generate prose, statistics, confidence, targets, URLs, arbitrary actions or unseen match IDs. Runtime validation also checks that evidence and review matches belong to the selected priority. The frontend renders localized verified statements and role-specific practice rules. This deliberately constrained first version trades free-form prose for enforceable grounding; a schema alone cannot prove that unconstrained prose is factual. Future chat should reuse the context and evidence IDs, not raw match dumps.

Patterns are described as associations. Death timings, positioning and vision are explicitly unavailable; suggested positioning rules are labelled exercises, not replay findings. Hero-role gaps are signals to inspect, not proof of causation or automatic reasons to change hero.

## Server and security

`POST /api/coach` uses the existing `api/index.js` route and its signed Steam session. Account ID is derived exclusively from that session. The body accepts only `{context, refresh?}`; account/Steam identifiers are rejected. An Origin check is applied to browser requests. Context is client-calculated, schema-validated analytics for that user's coaching; it is not authoritative server telemetry and is never written into match, profile or training tables.

`lib/coach-service.js` calls OpenAI server-side, with a 12-second timeout and 700-token output cap. It validates returned selection IDs and falls back on unconfigured AI, insufficient data, unavailable storage, timeout, refusal/malformed output, quota or provider errors. Other analytics do not await AI. A client request timeout and generation guard prevent stale account/language/dataset responses replacing the current view.

The SHA-256 fingerprint covers the session account, entire compact context, language, scope, dataset/role/training revisions, schema version and model. Neon caches only validated selections with an account+fingerprint primary key. Same-instance identical requests coalesce; an atomic persistent per-account budget permits at most 12 paid calls per UTC database day, separated by 60 seconds, across instances. Explicit refresh bypasses result cache, not the budget. Cache entries expire after 30 days. AI requires Neon for persistent cost controls; otherwise deterministic summary remains available. This is a per-account limit; a platform-wide spending limit should also be set in the provider account.

## Training

Active training is not replaced by refresh. After five role-matched games: >=4 passes is MASTERED (exclude that skill from the next suggestion), 2–3 is REPEAT, 0–1 is ADJUST (same skill, ease threshold toward role median). A user explicitly starts the next cycle. Existing Training controls and cloud sync remain supported. Integer death targets are rounded down so the displayed target agrees with the pass check.

## Enable

Set Vercel server environment variables, then redeploy the intended environment:

- `OPENAI_API_KEY`: provider secret, never in client files.
- `COACH_ENABLED=true`: explicit enable switch; unset/false uses automated summary.
- `COACH_MODEL`: structured-output-capable Chat Completions model; default `gpt-4o-mini`.
- Existing `DATABASE_URL` and Steam session configuration remain required.

The two additive tables in `db/schema.sql` are also created lazily on the first enabled request. No existing table or profile schema is modified. Disable with `COACH_ENABLED=false`; the app continues with Automated Coach Summary.

OpenAI structured output contract: https://platform.openai.com/docs/guides/structured-outputs

## Verification

Run `node scripts/test-coach.cjs`. Tests use synthetic fixtures and mocked provider/SQL responses: 72 combinations of sample sizes (0/12/20/50/100/200), RU/EN, Ranked/All and core/support roles; low confidence, role correction, active and completed training, rejection of unsupported evidence/matches/prose, account-specific fingerprint/cache, budget rejection, quota/timeouts, malformed output and the actual authenticated API route with signed test sessions.

Provider-enabled tests are simulated, not a paid live model call. Real Steam sign-in, actual Neon DDL/budget behavior and a live configured provider need deployment verification. The existing Steam OpenID, match cache and cloud profile implementations are unchanged.
