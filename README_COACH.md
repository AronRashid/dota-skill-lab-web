# Coaching layer

The existing visual style and analytical modules are retained. Overview is now the answer; other sections hold the evidence.

## Architecture audit

`app.js` owns role inference/overrides, role-duration Performance, baselines, mistakes, chronological holdout patterns, sessions, hero-role profiles, training and progress. Previously Overview repeated the same conclusions in the cockpit, focus, quick compare, route, eight KPIs, DNA and charts. These existing elements, IDs, computations and event handlers now remain in a collapsed supporting-analytics block in Coach. Overview contains one brief, the current training cycle, five recent matches, a small progress snapshot and navigation to evidence.

The adapter in `coach-brief.js` uses the existing calculations. It applies `buildMistakes` to the primary-role sample, instead of treating mixed-role confidence as role-specific evidence. New priorities require at least 20 role matches, mistake confidence >=60 and no more than 30% low-confidence recent roles. Support priorities exclude core farming/damage advice. High confidence additionally requires an existing confirmed holdout pattern. These gates are coaching policy, not new performance metrics.

## Grounding contract

`coach-core.js` is shared by browser and server. Input is bounded to 18,000 characters / a 20 KB request. It includes summaries of the last 3/5/20 and previous 20, at most three role-specific priorities, three reliable hero-role gaps, one significant session finding, current training, five compact match records, missing-data flags and dataset/role revisions. No journal, account identifiers, avatars, credentials, raw players or replay payload is sent to the selected provider. Benchmark data is not included: it is an optional separately loaded comparison and cannot support a claim in this brief.

The model receives a strict JSON schema and selects `priority_id`, `evidence_ids`, `supporting_ids`, `match_ids`. It cannot generate prose, statistics, confidence, targets, URLs, arbitrary actions or unseen match IDs. Runtime validation also checks that evidence and review matches belong to the selected priority. The frontend renders localized verified statements and role-specific practice rules. This deliberately constrained first version trades free-form prose for enforceable grounding; a schema alone cannot prove that unconstrained prose is factual. Future chat should reuse the context and evidence IDs, not raw match dumps.

Patterns are described as associations. Death timings, positioning and vision are explicitly unavailable; suggested positioning rules are labelled exercises, not replay findings. Hero-role gaps are signals to inspect, not proof of causation or automatic reasons to change hero.

## Server and security

`POST /api/coach` uses the existing `api/index.js` route and its signed Steam session. Account ID is derived exclusively from that session. The body accepts only `{context, refresh?}`; account/Steam identifiers are rejected. An Origin check is applied to browser requests. Context is client-calculated, schema-validated analytics for that user's coaching; it is not authoritative server telemetry and is never written into match, profile or training tables.

`lib/coach-service.js` calls the selected provider server-side through `lib/coach-provider.js`, with a 12-second timeout and an output cap (Groq: 1,400 tokens including reasoning; OpenAI: 700). It validates returned selection IDs and falls back on unconfigured AI, insufficient data, unavailable storage, timeout, refusal/malformed output, quota or provider errors. Other analytics do not await AI. A client request timeout and generation guard prevent stale account/language/dataset responses replacing the current view.

The SHA-256 fingerprint covers the session account, entire compact context, language, scope, dataset/role/training revisions, schema version, provider and model. Neon caches only validated selections with an account+fingerprint primary key. Same-instance identical requests coalesce; an atomic persistent per-account budget permits at most 12 model calls per UTC database day, separated by 60 seconds, across instances. Explicit refresh bypasses result cache, not the budget. Cache entries expire after 30 days. AI requires Neon for persistent cost controls; otherwise deterministic summary remains available. This is a per-account abuse/refresh limit. Groq Free Tier limits apply across the provider organization, so multiple users can still reach a shared limit; 429 returns automated analysis without retry loops.

## Training

Active training is not replaced by refresh. After five role-matched games: >=4 passes is MASTERED (exclude that skill from the next suggestion), 2–3 is REPEAT, 0–1 is ADJUST (same skill, ease threshold toward role median). A user explicitly starts the next cycle. Existing Training controls and cloud sync remain supported. Integer death targets are rounded down so the displayed target agrees with the pass check.

## Beta provider configuration

Official Groq documentation checked on 2026-09-08:

- Endpoint: https://api.groq.com/openai/v1/chat/completions
- Recommended Beta model: `openai/gpt-oss-20b`. It is available on the Free Plan and supports constrained decoding with `strict: true`; the documented approximate speed is 1,000 tokens/second. No paid plan is required within the Free Plan limits.
- Documented Free Plan limits: 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute and 200,000 tokens/day. Limits are organization-wide, may change, and the account limits page is authoritative.
- Request uses `response_format: {type: 'json_schema', json_schema: {name, strict: true, schema}}`. Every object has `additionalProperties: false` and every field is required. The schema uses objects, arrays, strings, enums and maxItems bounds; empty candidate lists require empty arrays. Streaming and tools are not used because Groq Structured Outputs does not support them.
- The Groq adapter omits OpenAI's `store` parameter and uses `max_completion_tokens`; GPT-OSS uses `reasoning_effort: 'low'`. The shared runtime validator still rejects unsupported selections even if they satisfy the schema.

Recommended **Preview** variables:

```text
COACH_ENABLED=true
COACH_PROVIDER=groq
COACH_MODEL=openai/gpt-oss-20b
GROQ_API_KEY=<server secret>
```

Keep existing `DATABASE_URL`, `STEAM_API_KEY` and `SESSION_SECRET` available for Preview. Secrets belong only in Vercel's server environment, never source control, browser code, client responses or logs. Do not send API keys in chat.

Optional OpenAI provider: set `COACH_PROVIDER=openai`, `OPENAI_API_KEY` and a suitable `COACH_MODEL` (default `gpt-4o-mini`). When switching providers, change or remove an explicit old model override as well. There is no automatic cross-provider failover: a missing key, unknown provider, quota, 5xx, timeout, network error or invalid response produces Automated Coach Summary. The UI does not expose provider names or technical failure details. Server logs contain only fixed failure categories and the allowlisted provider name, never secrets or provider response bodies.

Groq is the default when `COACH_PROVIDER` is unset. AI still requires `COACH_ENABLED=true` and the selected provider's key. Disable with `COACH_ENABLED=false`. Provider/model are in the fingerprint, so no cache migration or new SQL columns are needed. Existing tables are created lazily as before. Production environment and PR merge are separate actions and are not part of this migration.

Sources: [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs), [API reference](https://console.groq.com/docs/api-reference), [Free Plan limits](https://console.groq.com/docs/rate-limits), [GPT-OSS 20B](https://console.groq.com/docs/model/openai/gpt-oss-20b).

## Verification

Run `node scripts/test-coach.cjs`. Tests use synthetic fixtures and mocked provider/SQL responses: 72 combinations of sample sizes (0/12/20/50/100/200), RU/EN, Ranked/All and core/support roles; low confidence, role correction, active and completed training, rejection of unsupported evidence/matches/prose, account-specific fingerprint/cache, budget rejection, quota/timeouts, malformed output and the actual authenticated API route with signed test sessions.

Provider-enabled tests are simulated, not a live provider call. Additional cases verify the real adapter request shape, default Groq configuration, missing key, 200/429/500, timeout/network/malformed output/invalid IDs, disabled AI, unavailable DB, OpenAI selection, provider-specific fingerprints and new-match invalidation. Real Steam sign-in, actual Neon DDL/budget behavior and a live configured provider need deployment verification. The existing Steam OpenID, match cache and cloud profile implementations are unchanged.

## Preview verification — 2026-09-08

Confirmed GROQ_API_KEY in Preview and deployed the PR branch with a separate Neon preview-ai-coach-pr2 database branch. Steam OpenID sign-in and profile loading succeeded. Live Groq output initially failed selection validation; explicit selection rules and schema array bounds resolved the observed failure while retaining strict runtime validation. The UI then displayed AI Coach Brief and Neon contained one cached result. A page reload retained AI Coach Brief with the cache count unchanged at 1 and the daily request counter unchanged at 6, confirming cache reuse without another provider call. Browser console had no captured JavaScript errors. This is a live single-account check; cross-account and failure combinations remain covered by mocked tests. Production was not changed and PR #2 remains unmerged.
