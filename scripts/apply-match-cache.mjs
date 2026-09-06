import fs from 'node:fs';

const path='api/index.js';
let s=fs.readFileSync(path,'utf8');

function mustReplace(from,to,label){
  if(!s.includes(from)) throw new Error(`Patch target not found: ${label}`);
  s=s.replace(from,to);
}

if(!s.includes("import { neon } from '@neondatabase/serverless';")){
  mustReplace("import crypto from 'node:crypto';","import crypto from 'node:crypto';\nimport { neon } from '@neondatabase/serverless';",'neon import');
}

if(!s.includes('db: null,')){
  mustReplace("  benchmark: new Map()\n};","  benchmark: new Map(),\n  db: null\n};",'global db cache');
}

if(!s.includes('async function readPersistentMatchCache(')){
  const helpers=[
    "function database(){",
    "  const url=String(process.env.DATABASE_URL||'').trim();",
    "  if(!url)return null;",
    "  if(!globalCache.db)globalCache.db=neon(url);",
    "  return globalCache.db;",
    "}",
    "async function readPersistentMatchCache(accountId,matchId){",
    "  const sql=database();if(!sql)return null;",
    "  try{",
    "    const rows=await sql`SELECT payload,fetched_at FROM dsl_match_cache WHERE account_id=${String(accountId)} AND match_id=${String(matchId)} LIMIT 1`;",
    "    const row=rows?.[0];if(!row?.payload)return null;",
    "    return {match:row.payload,fetched_at:row.fetched_at||null};",
    "  }catch(e){console.warn('Neon match cache read failed:',e?.message||e);return null;}",
    "}",
    "async function writePersistentMatchCache(accountId,match){",
    "  const sql=database();if(!sql||!match?.match_id)return false;",
    "  try{",
    "    const matchId=String(match.match_id),seq=String(match.match_seq_num||'');",
    "    await sql`INSERT INTO dsl_match_cache (account_id,match_id,match_seq_num,payload,fetched_at) VALUES (${String(accountId)},${matchId},${seq||null},${JSON.stringify(match)}::jsonb,NOW()) ON CONFLICT (account_id,match_id) DO UPDATE SET match_seq_num=EXCLUDED.match_seq_num,payload=EXCLUDED.payload,fetched_at=NOW()`;",
    "    return true;",
    "  }catch(e){console.warn('Neon match cache write failed:',e?.message||e);return false;}",
    "}",
    ""
  ].join('\n');
  mustReplace("async function steam(path,params={}){",helpers+"async function steam(path,params={}){",'persistent cache helpers');
}

const oldMatchFn=`async function matchBySequence(historyMatch){
  const id=String(historyMatch.match_id);const cached=globalCache.matches.get(id);if(cached&&Date.now()-cached.at<24*60*60*1000)return cached.match;
  const seq=String(historyMatch.match_seq_num||'');if(!/^\\d+$/.test(seq))throw new Error('match_seq_num missing');
  const raw=await steam('IDOTA2Match_570/GetMatchHistoryBySequenceNum/v1/',{start_at_match_seq_num:seq,matches_requested:1});const r=(raw?.result?.matches||[]).find(x=>String(x.match_id)===id);if(!r)throw new Error('Steam sequence endpoint did not return requested match');globalCache.matches.set(id,{at:Date.now(),match:r,seq});return r;
}`;
const newMatchFn=`async function matchBySequence(historyMatch,accountId=null,stats=null){
  const id=String(historyMatch.match_id),mem=globalCache.matches.get(id);
  if(mem&&Date.now()-mem.at<24*60*60*1000){if(stats)stats.memory=(stats.memory||0)+1;return mem.match;}
  if(accountId){
    const persisted=await readPersistentMatchCache(accountId,id);
    if(persisted?.match){globalCache.matches.set(id,{at:Date.now(),match:persisted.match,seq:String(persisted.match.match_seq_num||historyMatch.match_seq_num||'')});if(stats)stats.neon=(stats.neon||0)+1;return persisted.match;}
  }
  const seq=String(historyMatch.match_seq_num||'');if(!/^\\d+$/.test(seq))throw new Error('match_seq_num missing');
  const raw=await steam('IDOTA2Match_570/GetMatchHistoryBySequenceNum/v1/',{start_at_match_seq_num:seq,matches_requested:1});const r=(raw?.result?.matches||[]).find(x=>String(x.match_id)===id);if(!r)throw new Error('Steam sequence endpoint did not return requested match');
  globalCache.matches.set(id,{at:Date.now(),match:r,seq});if(stats)stats.steam=(stats.steam||0)+1;if(accountId)await writePersistentMatchCache(accountId,r);return r;
}`;
if(s.includes(oldMatchFn))s=s.replace(oldMatchFn,newMatchFn);
else if(!s.includes('async function matchBySequence(historyMatch,accountId=null,stats=null)'))throw new Error('Patch target not found: matchBySequence');

const oldDetailed="  const detailed=await mapLimit(history.matches,8,async hm=>normalizeMatch(await matchBySequence(hm),hm,accountId));let failed=0;const matches=[];for(const x of detailed){if(!x||x.__error){failed++;continue;}matches.push(x);}matches.sort((a,b)=>b.start_time-a.start_time);";
const newDetailed="  const cacheStats={memory:0,neon:0,steam:0};const detailed=await mapLimit(history.matches,8,async hm=>normalizeMatch(await matchBySequence(hm,accountId,cacheStats),hm,accountId));let failed=0;const matches=[];for(const x of detailed){if(!x||x.__error){failed++;continue;}matches.push(x);}matches.sort((a,b)=>b.start_time-a.start_time);";
if(s.includes(oldDetailed))s=s.replace(oldDetailed,newDetailed);

const oldBundleFields="cache_hits:0,fetched_matches:matches.length,failed_matches:failed,detail_method:'GetMatchHistoryBySequenceNum'";
const newBundleFields="cache_hits:(cacheStats.memory+cacheStats.neon),memory_cache_hits:cacheStats.memory,persistent_cache_hits:cacheStats.neon,fetched_matches:cacheStats.steam,cache_backend:database()?'neon+memory':'memory',failed_matches:failed,detail_method:'GetMatchHistoryBySequenceNum'";
if(s.includes(oldBundleFields))s=s.replace(oldBundleFields,newBundleFields);
else if(!s.includes('persistent_cache_hits:cacheStats.neon'))throw new Error('Patch target not found: bundle cache fields');

const oldFull="async function fullMatch(accountId,matchId){\n  let r=globalCache.matches.get(String(matchId))?.match;if(!r){const hm=await findHistoryMatch(accountId,matchId);if(!hm)throw Object.assign(new Error('Match was not found in the authenticated player history.'),{statusCode:404});r=await matchBySequence(hm);}";
const newFull="async function fullMatch(accountId,matchId){\n  let r=globalCache.matches.get(String(matchId))?.match;if(!r){const persisted=await readPersistentMatchCache(accountId,matchId);if(persisted?.match){r=persisted.match;globalCache.matches.set(String(matchId),{at:Date.now(),match:r,seq:String(r.match_seq_num||'')});}}if(!r){const hm=await findHistoryMatch(accountId,matchId);if(!hm)throw Object.assign(new Error('Match was not found in the authenticated player history.'),{statusCode:404});r=await matchBySequence(hm,accountId);}";
if(s.includes(oldFull))s=s.replace(oldFull,newFull);
else if(!s.includes('readPersistentMatchCache(accountId,matchId)'))throw new Error('Patch target not found: fullMatch persistent cache');

const oldHealth="if(path==='/api/health'||path==='/health')return json(res,200,{ok:true,service:'Dota Skill Lab Web Beta',version:'web-beta-1',steam_key_configured:/^[A-Fa-f0-9]{32}$/.test(String(process.env.STEAM_API_KEY||'')),auth:'steam-openid'});";
const newHealth="if(path==='/api/health'||path==='/health')return json(res,200,{ok:true,service:'Dota Skill Lab Web Beta',version:'web-beta-2',steam_key_configured:/^[A-Fa-f0-9]{32}$/.test(String(process.env.STEAM_API_KEY||'')),database_configured:!!String(process.env.DATABASE_URL||'').trim(),match_cache:'neon+memory',auth:'steam-openid'});";
if(s.includes(oldHealth))s=s.replace(oldHealth,newHealth);

fs.writeFileSync(path,s,'utf8');
console.log('Applied persistent Neon match cache patch.');
