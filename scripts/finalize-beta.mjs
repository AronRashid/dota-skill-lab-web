import fs from 'node:fs';

const apiPath='api/index.js';
const cssPath='styles.css';
const appPath='app.js';
const htmlPath='index.html';

let api=fs.readFileSync(apiPath,'utf8');
let css=fs.readFileSync(cssPath,'utf8');
let app=fs.readFileSync(appPath,'utf8');
let html=fs.readFileSync(htmlPath,'utf8');

function replaceRequired(source, pattern, replacement, label){
  if(!pattern.test(source)) throw new Error(`Patch target not found: ${label}`);
  return source.replace(pattern,replacement);
}

if(!api.includes('async function readPersistentMatchCacheBatch(')){
  const batchRead=`async function readPersistentMatchCacheBatch(accountId,matchIds){
  const sql=database();if(!sql)return new Map();
  const ids=[...new Set((matchIds||[]).map(String).filter(Boolean))];if(!ids.length)return new Map();
  try{
    const rows=await sql.query('SELECT match_id,payload,fetched_at FROM dsl_match_cache WHERE account_id=$1 AND match_id = ANY($2::text[])',[String(accountId),ids]);
    const out=new Map();for(const row of rows||[]){let payload=row?.payload;try{if(typeof payload==='string')payload=JSON.parse(payload);}catch{}if(payload)out.set(String(row.match_id),{match:payload,fetched_at:row.fetched_at||null});}
    return out;
  }catch(e){console.warn('Neon batch cache read failed:',e?.message||e);return new Map();}
}
`;
  api=api.replace('async function writePersistentMatchCache(accountId,match){',batchRead+'\nasync function writePersistentMatchCache(accountId,match){');
}

if(!api.includes('async function writePersistentMatchCacheBatch(')){
  const batchWrite=`async function writePersistentMatchCacheBatch(accountId,matches){
  const sql=database();if(!sql)return 0;
  const dedup=new Map();for(const match of matches||[]){if(match?.match_id)dedup.set(String(match.match_id),match);}const list=[...dedup.values()];if(!list.length)return 0;
  try{
    const rows=list.map(match=>({match_id:String(match.match_id),match_seq_num:String(match.match_seq_num||''),payload:match}));
    await sql.query(\`INSERT INTO dsl_match_cache (account_id,match_id,match_seq_num,payload,fetched_at)
      SELECT $1,x.match_id,NULLIF(x.match_seq_num,''),x.payload,NOW()
      FROM jsonb_to_recordset($2::jsonb) AS x(match_id text,match_seq_num text,payload jsonb)
      ON CONFLICT (account_id,match_id) DO UPDATE SET match_seq_num=EXCLUDED.match_seq_num,payload=EXCLUDED.payload,fetched_at=NOW()\`,[String(accountId),JSON.stringify(rows)]);
    return list.length;
  }catch(e){console.warn('Neon batch cache write failed:',e?.message||e);return 0;}
}
`;
  api=api.replace('async function steam(path,params={}){',batchWrite+'\nasync function steam(path,params={}){');
}

const newMatchBySequence=`async function matchBySequence(historyMatch,accountId=null,stats=null,persistentBatch=null){
  const id=String(historyMatch.match_id),mem=globalCache.matches.get(id);
  if(mem&&Date.now()-mem.at<24*60*60*1000){if(stats)stats.memory=(stats.memory||0)+1;return mem.match;}
  if(accountId){
    const persisted=persistentBatch instanceof Map?persistentBatch.get(id):await readPersistentMatchCache(accountId,id);
    if(persisted?.match){globalCache.matches.set(id,{at:Date.now(),match:persisted.match,seq:String(persisted.match.match_seq_num||historyMatch.match_seq_num||'')});if(stats)stats.neon=(stats.neon||0)+1;return persisted.match;}
  }
  const seq=String(historyMatch.match_seq_num||'');if(!/^\\d+$/.test(seq))throw new Error('match_seq_num missing');
  const raw=await steam('IDOTA2Match_570/GetMatchHistoryBySequenceNum/v1/',{start_at_match_seq_num:seq,matches_requested:1});const r=(raw?.result?.matches||[]).find(x=>String(x.match_id)===id);if(!r)throw new Error('Steam sequence endpoint did not return requested match');
  globalCache.matches.set(id,{at:Date.now(),match:r,seq});if(stats)stats.steam=(stats.steam||0)+1;
  if(accountId){if(stats?.deferPersistentWrites)(stats.pendingWrites||(stats.pendingWrites=[])).push(r);else await writePersistentMatchCache(accountId,r);}
  return r;
}`;
api=replaceRequired(api,/async function matchBySequence\(historyMatch,accountId=null,stats=null\)\{[\s\S]*?\n\}\nasync function mapLimit/,newMatchBySequence+'\nasync function mapLimit','matchBySequence');

const newBundle=`async function bundleFor(accountId,limit,scope){
  if(!/^\\d{5,12}$/.test(accountId))throw Object.assign(new Error('Invalid Dota account ID.'),{statusCode:400});limit=Math.max(20,Math.min(MAX_MATCHES,n(limit,50)));const rankedOnly=scope!=='all',steamid64=steam64FromAccount(accountId);
  const [heroMap,itemCatalog,profileRaw,history]=await Promise.all([getHeroMap(),getItemCatalog(),profileForSteam64(steamid64),historyFiltered(accountId,limit,rankedOnly)]);
  const persistentBatch=await readPersistentMatchCacheBatch(accountId,history.matches.map(m=>String(m.match_id)));
  const cacheStats={memory:0,neon:0,steam:0,deferPersistentWrites:true,pendingWrites:[]};
  const detailed=await mapLimit(history.matches,8,async hm=>normalizeMatch(await matchBySequence(hm,accountId,cacheStats,persistentBatch),hm,accountId));
  const cacheWrites=cacheStats.pendingWrites.length?await writePersistentMatchCacheBatch(accountId,cacheStats.pendingWrites):0;
  let failed=0;const matches=[];for(const x of detailed){if(!x||x.__error){failed++;continue;}matches.push(x);}matches.sort((a,b)=>b.start_time-a.start_time);
  const ratingRows=matches.filter(m=>m.previous_rank!==null&&m.rank_change!==null),latest=ratingRows[0],currentMmr=latest?latest.previous_rank+latest.rank_change:null,deltaRows=matches.filter(m=>m.rank_change!==null),delta20=deltaRows.length?deltaRows.slice(0,20).reduce((s,m)=>s+n(m.rank_change),0):null;const rankTier=nullableInt(profileRaw?.rank_tier),leaderboardRank=nullableInt(profileRaw?.leaderboard_rank);
  return{version:'web-beta-3-final',source:'steam',scope:rankedOnly?'ranked':'all',account_id:accountId,steam_id64:steamid64,profile:{profile:{personaname:String(profileRaw?.personaname||\`Player \${accountId}\`),avatar:String(profileRaw?.avatar||''),avatarfull:String(profileRaw?.avatarfull||''),profileurl:String(profileRaw?.profileurl||'')},rank_tier:rankTier,leaderboard_rank:leaderboardRank},rating:{current_mmr:currentMmr,rank_tier:rankTier,leaderboard_rank:leaderboardRank,delta_count:deltaRows.length,delta_last20:delta20,source:currentMmr!==null?'steam_history_rank_fields':'unavailable_in_public_webapi'},matches,heroMap,itemMap:itemCatalog.map,item_source:itemCatalog.source,match_count:matches.length,history_count:history.matches.length,scanned_history_count:history.scanned,cache_hits:(cacheStats.memory+cacheStats.neon),memory_cache_hits:cacheStats.memory,persistent_cache_hits:cacheStats.neon,fetched_matches:cacheStats.steam,persistent_cache_loaded:persistentBatch.size,persistent_cache_written:cacheWrites,cache_backend:database()?'neon-batch+memory':'memory',failed_matches:failed,detail_method:'GetMatchHistoryBySequenceNum',role_method:'explicit-field probe -> team economy v2 -> manual override'};
}`;
api=replaceRequired(api,/async function bundleFor\(accountId,limit,scope\)\{[\s\S]*?\n\}\nasync function findHistoryMatch/,newBundle+'\nasync function findHistoryMatch','bundleFor');

api=api.replaceAll("version:'web-beta-1'","version:'web-beta-3-final'");
api=api.replace("version:'web-beta-2'","version:'web-beta-3-final'");
api=api.replace("match_cache:'neon+memory'","match_cache:'neon-batch+memory'");

const finalCss=`

/* ===== Dota Skill Lab Web Beta Final — mobile/navigation polish ===== */
@media(max-width:1050px){
  .shell{display:block!important;min-height:100vh}
  .sidebar{position:sticky!important;top:0;z-index:250;width:100%!important;height:auto!important;display:block!important;padding:8px 10px 9px!important;border-right:0!important;border-bottom:1px solid rgba(255,255,255,.07)!important;background:rgba(7,13,18,.94)!important;backdrop-filter:blur(16px);box-shadow:0 8px 24px rgba(0,0,0,.22)}
  .sidebar .brand,.sidebar-card,.nav-group-label{display:none!important}
  .sidebar nav{display:flex!important;gap:7px!important;width:100%;max-width:100vw;overflow-x:auto!important;overflow-y:hidden!important;padding:1px 1px 3px;scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scroll-snap-type:x proximity;touch-action:pan-x}
  .sidebar nav::-webkit-scrollbar{display:none}
  .nav-item{flex:0 0 auto!important;min-height:42px;white-space:nowrap;padding:9px 13px 9px 34px!important;border:1px solid #1d2c37!important;border-radius:999px!important;background:#0b141b!important;color:#93a4b0!important;scroll-snap-align:start;box-shadow:none!important;font-size:12px!important}
  .nav-item::before{left:11px!important;width:15px!important}
  .nav-item:hover{background:#101b23!important;border-color:#2a3c48!important}
  .nav-item.active{color:#fff!important;border-color:rgba(239,101,91,.38)!important;background:linear-gradient(180deg,rgba(239,101,91,.18),rgba(239,101,91,.07))!important;box-shadow:inset 0 0 0 1px rgba(239,101,91,.05)!important}
  .nav-item[data-section="overview"]{order:1}.nav-item[data-section="matches"]{order:2}.nav-item[data-section="heroes"]{order:3}.nav-item[data-section="sessions"]{order:4}.nav-item[data-section="coach"]{order:5}.nav-item[data-section="deep"]{order:6}.nav-item[data-section="patterns"]{order:7}.nav-item[data-section="mistakes"]{order:8}.nav-item[data-section="training"]{order:9}.nav-item[data-section="progress"]{order:10}.nav-item[data-section="benchmark"]{order:11}
  main{padding-top:16px!important}
}
@media(max-width:760px){
  main{padding:12px 10px 34px!important}
  .topbar{display:grid!important;grid-template-columns:1fr;gap:9px;margin-bottom:12px;padding-bottom:12px}
  .topbar h1{font-size:21px!important}.topbar-actions{width:100%;justify-content:space-between!important;gap:8px}
  .connection-pill{max-width:55vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .profile-strip{padding:14px!important}.profile-main{width:100%;min-width:0}.profile-name{font-size:16px}.profile-meta{overflow-wrap:anywhere}
  .profile-actions{width:100%;display:grid!important;grid-template-columns:1fr 1fr;gap:7px!important}.profile-actions .dataset-chip{grid-column:1/-1;white-space:normal;line-height:1.35}.profile-actions .secondary{width:100%;min-width:0;padding:9px 8px;font-size:11px}
  .cockpit-grid{grid-template-columns:1fr!important}.command-score-block,.command-focus-block,.command-match-block{padding:16px!important;border-right:0!important}.command-score-block,.command-focus-block{border-bottom:1px solid rgba(255,255,255,.055)}.command-match-block{grid-column:auto!important;border-top:0!important}
  .command-score-block{grid-template-columns:auto 1fr}.score-ring{width:88px;height:88px}.score-ring-inner b{font-size:27px}.command-focus-block h2{font-size:20px}
  .secondary-row{grid-template-columns:1fr!important;gap:10px!important}.kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.kpi-card{padding:11px!important}.kpi-card strong{font-size:18px!important}
  .dna-panel{display:block!important}.dna-panel .panel-title{margin-bottom:12px!important}.dna-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.dna-panel .footnote{grid-column:auto!important}
  .section-header{flex-direction:column;align-items:stretch!important;gap:9px}.filters{width:100%;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}.filters::-webkit-scrollbar{display:none}.filters select{flex:0 0 auto;min-width:135px}
  .table-wrap{border-radius:11px}.hero-passport-art{height:115px}.heroes-grid{grid-template-columns:1fr!important}.pattern-mini-grid{grid-template-columns:1fr!important}.quest-hero{grid-template-columns:1fr!important;text-align:center}.quest-ring{margin:0 auto}.quest-run{grid-template-columns:1fr!important}.progress-grid{grid-template-columns:1fr 1fr!important}.progress-headline{grid-template-columns:1fr auto!important}.progress-headline>:last-child{grid-column:1/-1}
  .modal-backdrop{padding:8px!important}.modal{width:100%!important;max-height:96dvh!important;padding:14px!important;border-radius:14px!important}.modal.match-modal{width:100%!important;padding:14px!important}.match-meta-grid{grid-template-columns:1fr 1fr!important}.match-personal-grid{grid-template-columns:1fr 1fr!important}
}
@media(max-width:520px){
  .sidebar{padding-left:8px!important;padding-right:8px!important}.nav-item{font-size:11px!important;padding-right:12px!important}
  .dna-grid{grid-template-columns:1fr!important}.progress-grid{grid-template-columns:1fr!important}.progress-headline{grid-template-columns:1fr!important}.profile-actions{grid-template-columns:1fr 1fr!important}
  .auth-gate{padding:10px!important}.auth-card{max-height:calc(100dvh - 20px);overflow:auto;padding:18px!important}.steam-auth-card{border-radius:16px!important}.auth-card h1{font-size:24px!important}
}
`;
if(!css.includes('Dota Skill Lab Web Beta Final — mobile/navigation polish'))css+=finalCss;

app=app.replaceAll('Product UI Final · v16','Web Beta · Final');
html=html.replace('<title>Dota Skill Lab — Web Beta</title>','<title>Dota Skill Lab — Web Beta Final</title>');

fs.writeFileSync(apiPath,api);
fs.writeFileSync(cssPath,css);
fs.writeFileSync(appPath,app);
fs.writeFileSync(htmlPath,html);
console.log('Final beta optimization patch applied.');
