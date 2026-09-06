import crypto from 'node:crypto';

const STEAM_ORIGIN = 'https://api.steampowered.com';
const OPEN_DOTA = 'https://api.opendota.com/api';
const DOTA_DATA = 'https://www.dota2.com/datafeed';
const STEAM_ID_BASE = 76561197960265728n;
const UA = 'DotaSkillLab-WebBeta/1.0';
const SESSION_COOKIE = 'dsl_session';
const MAX_MATCHES = 200;

const globalCache = globalThis.__DSL_CACHE__ ||= {
  matches: new Map(),
  itemCatalog: null,
  itemCatalogAt: 0,
  benchmark: new Map()
};

function apiKey(){
  const key = String(process.env.STEAM_API_KEY || '').trim();
  if(!/^[A-Fa-f0-9]{32}$/.test(key)) throw Object.assign(new Error('STEAM_API_KEY is not configured on the server.'), {statusCode:503});
  return key;
}
function sessionSecret(){
  const explicit = String(process.env.SESSION_SECRET || '').trim();
  if(explicit.length >= 24) return explicit;
  const key = String(process.env.STEAM_API_KEY || '').trim();
  if(key) return `dota-skill-lab:${key}`;
  throw Object.assign(new Error('Server session secret is not configured.'), {statusCode:503});
}
function json(res,status,obj){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(obj));
}
function redirect(res,url,status=302){res.statusCode=status;res.setHeader('Location',url);res.setHeader('Cache-Control','no-store');res.end();}
function originOf(req){
  const proto=(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();
  const host=(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  return `${proto}://${host}`;
}
function parseCookies(req){
  const out={};
  String(req.headers.cookie||'').split(';').forEach(part=>{const i=part.indexOf('=');if(i<0)return;out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim());});
  return out;
}
function b64url(input){return Buffer.from(input).toString('base64url');}
function signSession(payload){
  const body=b64url(JSON.stringify(payload));
  const sig=crypto.createHmac('sha256',sessionSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifySession(token){
  if(!token||!token.includes('.'))return null;
  const [body,sig]=token.split('.',2);
  const expected=crypto.createHmac('sha256',sessionSecret()).update(body).digest('base64url');
  const a=Buffer.from(sig),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  try{const p=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));if(!p?.steamid64||Number(p.exp)<Date.now()/1000)return null;return p;}catch{return null;}
}
function setSessionCookie(res,steamid64){
  const now=Math.floor(Date.now()/1000),exp=now+60*60*24*30;
  const token=signSession({steamid64:String(steamid64),iat:now,exp});
  res.setHeader('Set-Cookie',`${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60*60*24*30}`);
}
function clearSessionCookie(res){res.setHeader('Set-Cookie',`${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);}
function requireSession(req){
  const p=verifySession(parseCookies(req)[SESSION_COOKIE]);
  if(!p) throw Object.assign(new Error('Not authenticated with Steam.'),{statusCode:401});
  return p;
}
function accountFromSteam64(steamid64){return (BigInt(steamid64)-STEAM_ID_BASE).toString();}
function steam64FromAccount(account){return (STEAM_ID_BASE+BigInt(account)).toString();}

async function fetchText(url,{timeout=18000,retries=2,method='GET',body=null,headers={}}={}){
  let last;
  for(let i=0;i<=retries;i++){
    const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeout);
    try{
      const r=await fetch(url,{method,body,signal:ctrl.signal,headers:{'User-Agent':UA,'Accept':'application/json',...headers}});
      const text=await r.text();
      if(!r.ok){const e=Object.assign(new Error(`HTTP ${r.status}: ${text.slice(0,300)}`),{status:r.status});if([429,500,502,503,504].includes(r.status)&&i<retries){last=e;await new Promise(x=>setTimeout(x,500*(i+1)));continue;}throw e;}
      return text;
    }catch(e){last=e;if(i<retries&&(e.name==='AbortError'||!e.status)){await new Promise(x=>setTimeout(x,400*(i+1)));continue;}throw e;}
    finally{clearTimeout(timer);}
  }
  throw last;
}
async function fetchJson(url,opts){return JSON.parse(await fetchText(url,opts));}
function n(v,fallback=0){const x=Number(v);return Number.isFinite(x)?x:fallback;}
function nullableInt(v){if(v===null||v===undefined||v==='')return null;const x=Number(v);return Number.isFinite(x)?Math.trunc(x):null;}
function rankOf(team,player,prop){const sorted=[...team].sort((a,b)=>n(b[prop])-n(a[prop]));return Math.max(1,sorted.findIndex(x=>n(x.player_slot)===n(player.player_slot))+1);}
function parseRoleValue(v){if(v===null||v===undefined)return null;const s=String(v);const m=s.match(/(?:POSITION|POS|ROLE)[_\s-]*([1-5])/i);if(m)return Number(m[1]);const x=Number(v);return x>=1&&x<=5?x:null;}
function explicitRole(historyPlayer,player){for(const obj of [player,historyPlayer]){if(!obj)continue;for(const name of ['assigned_position','ranked_position','ranked_role','predicted_position','position','role']){const r=parseRoleValue(obj[name]);if(r)return{role:r,source:`steam_explicit:${name}`,confidence:.98};}}return null;}
function estimateRole(team,player){
  const econ=new Map();
  for(const t of team){const lr=rankOf(team,t,'last_hits'),gr=rankOf(team,t,'gold_per_min'),xr=rankOf(team,t,'xp_per_min');econ.set(n(t.player_slot),.45*lr+.35*gr+.20*xr);}
  const ordered=[...team].sort((a,b)=>econ.get(n(a.player_slot))-econ.get(n(b.player_slot)));
  const cores=ordered.slice(0,3),supports=ordered.slice(3),map=new Map();
  if(supports.length===2){const s4=[...supports].sort((a,b)=>econ.get(n(a.player_slot))-econ.get(n(b.player_slot)))[0];const s5=supports.find(x=>n(x.player_slot)!==n(s4.player_slot));map.set(n(s4.player_slot),4);if(s5)map.set(n(s5.player_slot),5);}
  if(cores.length===3){
    const carry=[...cores].sort((a,b)=>(.55*rankOf(team,a,'last_hits')+.35*rankOf(team,a,'gold_per_min')+.10*rankOf(team,a,'xp_per_min'))-(.55*rankOf(team,b,'last_hits')+.35*rankOf(team,b,'gold_per_min')+.10*rankOf(team,b,'xp_per_min')))[0];
    const remain=cores.filter(x=>n(x.player_slot)!==n(carry.player_slot));
    const mid=[...remain].sort((a,b)=>(.60*rankOf(team,a,'xp_per_min')+.25*rankOf(team,a,'gold_per_min')+.15*rankOf(team,a,'kills'))-(.60*rankOf(team,b,'xp_per_min')+.25*rankOf(team,b,'gold_per_min')+.15*rankOf(team,b,'kills')))[0];
    const off=remain.find(x=>n(x.player_slot)!==n(mid.player_slot));map.set(n(carry.player_slot),1);map.set(n(mid.player_slot),2);if(off)map.set(n(off.player_slot),3);
  }
  const role=map.get(n(player.player_slot))||4;
  const ranks=[rankOf(team,player,'gold_per_min'),rankOf(team,player,'last_hits'),rankOf(team,player,'xp_per_min')];
  let confidence=.64;if(role<=3&&Math.min(...ranks)<=2)confidence=.72;if(role>=4&&Math.max(...ranks)>=4)confidence=.72;
  return{role,source:'team_economy_v2',confidence,gpm_rank:ranks[0],lh_rank:ranks[1],xpm_rank:ranks[2]};
}
function resolveRole(historyPlayer,team,player){const e=explicitRole(historyPlayer,player);if(e)return{...e,gpm_rank:rankOf(team,player,'gold_per_min'),lh_rank:rankOf(team,player,'last_hits'),xpm_rank:rankOf(team,player,'xp_per_min')};return estimateRole(team,player);}

async function steam(path,params={}){const qs=new URLSearchParams({key:apiKey(),...Object.fromEntries(Object.entries(params).map(([k,v])=>[k,String(v)]))});return fetchJson(`${STEAM_ORIGIN}/${path}?${qs}`);}
async function profileForSteam64(steamid64){const r=await steam('ISteamUser/GetPlayerSummaries/v2/',{steamids:steamid64});return r?.response?.players?.[0]||null;}
async function getHeroMap(){
  const [en,ru]=await Promise.all([steam('IEconDOTA2_570/GetHeroes/v1/',{language:'english'}),steam('IEconDOTA2_570/GetHeroes/v1/',{language:'russian'}).catch(()=>null)]);
  const ruMap=new Map((ru?.result?.heroes||[]).map(h=>[String(h.id),h.localized_name]));const out={};
  for(const h of en?.result?.heroes||[]){out[String(h.id)]={id:n(h.id),name:String(h.name||''),en:String(h.localized_name||''),ru:String(ruMap.get(String(h.id))||h.localized_name||'')};}
  return out;
}
async function getItemCatalog(){
  if(globalCache.itemCatalog&&Date.now()-globalCache.itemCatalogAt<12*60*60*1000)return globalCache.itemCatalog;
  let map={},source='none';
  try{
    const [en,ru]=await Promise.all([fetchJson(`${DOTA_DATA}/itemlist?language=english`),fetchJson(`${DOTA_DATA}/itemlist?language=russian`).catch(()=>null)]);
    const ruMap=new Map((ru?.result?.data?.itemabilities||[]).map(i=>[String(i.id),i.name_loc]));
    for(const i of en?.result?.data?.itemabilities||[]){const id=String(i.id),internal=String(i.name||''),img=internal.replace(/^item_/,'');const enName=String(i.name_loc||i.name_english_loc||internal);map[id]={id:n(i.id),name:internal,en:enName,ru:String(ruMap.get(id)||enName),image:`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${img}.png`};}
    if(Object.keys(map).length>50)source='dota2_datafeed';
  }catch{}
  if(Object.keys(map).length<50){
    try{const raw=await fetchJson('https://raw.githubusercontent.com/odota/dotaconstants/master/build/items.json');map={};for(const [key,i] of Object.entries(raw||{})){if(!n(i?.id))continue;const img=i.img?`https://cdn.cloudflare.steamstatic.com${String(i.img).replace(/\?.*$/,'')}`:`https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${key}.png`;map[String(i.id)]={id:n(i.id),name:`item_${key}`,en:String(i.dname||key),ru:String(i.dname||key),image:img};}if(Object.keys(map).length>50)source='dotaconstants_fallback';}catch{}
  }
  globalCache.itemCatalog={map,source};globalCache.itemCatalogAt=Date.now();return globalCache.itemCatalog;
}
async function historyFiltered(accountId,limit,rankedOnly){
  const selected=[],seen=new Set();let startAt=null,scanned=0;
  while(selected.length<limit&&scanned<2500){const params={account_id:accountId,matches_requested:100};if(startAt)params.start_at_match_id=startAt;const raw=await steam('IDOTA2Match_570/GetMatchHistory/v1/',params);const status=n(raw?.result?.status);if(status===15)throw Object.assign(new Error('Match history is private. Enable Expose Public Match Data in Dota 2.'),{statusCode:403});if(status!==1)throw new Error(raw?.result?.statusDetail||`Steam API status ${status}`);const page=raw?.result?.matches||[];if(!page.length)break;for(const m of page){const id=String(m.match_id);if(seen.has(id))continue;seen.add(id);scanned++;if(!rankedOnly||n(m.lobby_type)===7){selected.push(m);if(selected.length>=limit)break;}if(scanned>=2500)break;}const last=page.at(-1);if(!last?.match_id||page.length<2)break;startAt=(BigInt(last.match_id)-1n).toString();}
  return{matches:selected,scanned};
}
async function matchBySequence(historyMatch){
  const id=String(historyMatch.match_id);const cached=globalCache.matches.get(id);if(cached&&Date.now()-cached.at<24*60*60*1000)return cached.match;
  const seq=String(historyMatch.match_seq_num||'');if(!/^\d+$/.test(seq))throw new Error('match_seq_num missing');
  const raw=await steam('IDOTA2Match_570/GetMatchHistoryBySequenceNum/v1/',{start_at_match_seq_num:seq,matches_requested:1});const r=(raw?.result?.matches||[]).find(x=>String(x.match_id)===id);if(!r)throw new Error('Steam sequence endpoint did not return requested match');globalCache.matches.set(id,{at:Date.now(),match:r,seq});return r;
}
async function mapLimit(items,limit,fn){const out=new Array(items.length);let cursor=0;const workers=Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=cursor++;if(i>=items.length)return;try{out[i]=await fn(items[i],i);}catch(e){out[i]={__error:e};}}});await Promise.all(workers);return out;}
function normalizeMatch(r,hm,accountId){
  const hp=(hm.players||[]).find(x=>String(x.account_id)===String(accountId));let p=(r.players||[]).find(x=>String(x.account_id)===String(accountId));if(!p&&hp)p=(r.players||[]).find(x=>n(x.player_slot)===n(hp.player_slot));if(!p)return null;const radiant=n(p.player_slot)<128,team=(r.players||[]).filter(x=>(n(x.player_slot)<128)===radiant),role=resolveRole(hp,team,p);const rc=nullableInt(hm.rank_change)??nullableInt(r.rank_change),pr=nullableInt(hm.previous_rank)??nullableInt(r.previous_rank);
  return{match_id:String(r.match_id),match_seq_num:String(r.match_seq_num||hm.match_seq_num||''),player_slot:n(p.player_slot),radiant_win:!!r.radiant_win,hero_id:n(p.hero_id),kills:n(p.kills),deaths:n(p.deaths),assists:n(p.assists),duration:n(r.duration),pre_game_duration:nullableInt(r.pre_game_duration),start_time:n(r.start_time),lobby_type:n(r.lobby_type),game_mode:n(r.game_mode),radiant_score:nullableInt(r.radiant_score),dire_score:nullableInt(r.dire_score),first_blood_time:nullableInt(r.first_blood_time),cluster:nullableInt(r.cluster),human_players:nullableInt(r.human_players),tower_status_radiant:nullableInt(r.tower_status_radiant),tower_status_dire:nullableInt(r.tower_status_dire),barracks_status_radiant:nullableInt(r.barracks_status_radiant),barracks_status_dire:nullableInt(r.barracks_status_dire),gold_per_min:n(p.gold_per_min),xp_per_min:n(p.xp_per_min),last_hits:n(p.last_hits),denies:n(p.denies),level:n(p.level),hero_damage:nullableInt(p.hero_damage),tower_damage:nullableInt(p.tower_damage),hero_healing:nullableInt(p.hero_healing),item_0:n(p.item_0),item_1:n(p.item_1),item_2:n(p.item_2),item_3:n(p.item_3),item_4:n(p.item_4),item_5:n(p.item_5),item_6:n(p.item_6),item_7:n(p.item_7),item_8:n(p.item_8),item_9:n(p.item_9),item_10:n(p.item_10),backpack_0:n(p.backpack_0),backpack_1:n(p.backpack_1),backpack_2:n(p.backpack_2),item_neutral:n(p.item_neutral),role_auto:n(role.role),role_confidence:Number(role.confidence||0),role_source:String(role.source||'team_economy_v2'),team_gpm_rank:n(role.gpm_rank),team_lh_rank:n(role.lh_rank),team_xpm_rank:n(role.xpm_rank),rank_change:rc,previous_rank:pr,solo_rank:hm.solo_rank??null,source:'steam'};
}
async function bundleFor(accountId,limit,scope){
  if(!/^\d{5,12}$/.test(accountId))throw Object.assign(new Error('Invalid Dota account ID.'),{statusCode:400});limit=Math.max(20,Math.min(MAX_MATCHES,n(limit,50)));const rankedOnly=scope!=='all',steamid64=steam64FromAccount(accountId);
  const [heroMap,itemCatalog,profileRaw,history]=await Promise.all([getHeroMap(),getItemCatalog(),profileForSteam64(steamid64),historyFiltered(accountId,limit,rankedOnly)]);
  const detailed=await mapLimit(history.matches,8,async hm=>normalizeMatch(await matchBySequence(hm),hm,accountId));let failed=0;const matches=[];for(const x of detailed){if(!x||x.__error){failed++;continue;}matches.push(x);}matches.sort((a,b)=>b.start_time-a.start_time);
  const ratingRows=matches.filter(m=>m.previous_rank!==null&&m.rank_change!==null),latest=ratingRows[0],currentMmr=latest?latest.previous_rank+latest.rank_change:null,deltaRows=matches.filter(m=>m.rank_change!==null),delta20=deltaRows.length?deltaRows.slice(0,20).reduce((s,m)=>s+n(m.rank_change),0):null;const rankTier=nullableInt(profileRaw?.rank_tier),leaderboardRank=nullableInt(profileRaw?.leaderboard_rank);
  return{version:'web-beta-1',source:'steam',scope:rankedOnly?'ranked':'all',account_id:accountId,steam_id64:steamid64,profile:{profile:{personaname:String(profileRaw?.personaname||`Player ${accountId}`),avatar:String(profileRaw?.avatar||''),avatarfull:String(profileRaw?.avatarfull||''),profileurl:String(profileRaw?.profileurl||'')},rank_tier:rankTier,leaderboard_rank:leaderboardRank},rating:{current_mmr:currentMmr,rank_tier:rankTier,leaderboard_rank:leaderboardRank,delta_count:deltaRows.length,delta_last20:delta20,source:currentMmr!==null?'steam_history_rank_fields':'unavailable_in_public_webapi'},matches,heroMap,itemMap:itemCatalog.map,item_source:itemCatalog.source,match_count:matches.length,history_count:history.matches.length,scanned_history_count:history.scanned,cache_hits:0,fetched_matches:matches.length,failed_matches:failed,detail_method:'GetMatchHistoryBySequenceNum',role_method:'explicit-field probe -> team economy v2 -> manual override'};
}
async function findHistoryMatch(accountId,matchId){let startAt=null;for(let page=0;page<8;page++){const p={account_id:accountId,matches_requested:100};if(startAt)p.start_at_match_id=startAt;const raw=await steam('IDOTA2Match_570/GetMatchHistory/v1/',p);const arr=raw?.result?.matches||[];const found=arr.find(x=>String(x.match_id)===String(matchId));if(found)return found;if(!arr.length)break;const last=arr.at(-1);if(!last?.match_id)break;startAt=(BigInt(last.match_id)-1n).toString();}return null;}
async function fullMatch(accountId,matchId){
  let r=globalCache.matches.get(String(matchId))?.match;if(!r){const hm=await findHistoryMatch(accountId,matchId);if(!hm)throw Object.assign(new Error('Match was not found in the authenticated player history.'),{statusCode:404});r=await matchBySequence(hm);}
  const ids=[...new Set((r.players||[]).map(p=>nullableInt(p.account_id)).filter(x=>x&&x<4294967295).map(x=>steam64FromAccount(String(x))))];const profiles={};if(ids.length){try{const raw=await steam('ISteamUser/GetPlayerSummaries/v2/',{steamids:ids.join(',')});for(const sp of raw?.response?.players||[]){const aid=accountFromSteam64(sp.steamid);profiles[aid]={name:String(sp.personaname||''),avatar:String(sp.avatar||''),avatarfull:String(sp.avatarfull||''),profileurl:String(sp.profileurl||'')};}}catch{}}
  return{version:'web-beta-1',match:r,playerProfiles:profiles,account_id:accountId,retrieval:'GetMatchHistoryBySequenceNum'};
}
async function deepMatch(accountId,matchId){
  try{const raw=await fetchJson(`${OPEN_DOTA}/matches/${encodeURIComponent(matchId)}`,{timeout:18000,retries:1});const player=(raw.players||[]).find(p=>String(p.account_id)===String(accountId));if(!player)return{available:false,source:'opendota',status:404,details:'Player was not found in parsed match',match_id:matchId};const slot=n(player.player_slot),idx=slot>=128?(slot-128)+5:slot;const fights=[];for(const tf of raw.teamfights||[]){const ps=Array.isArray(tf.players)?tf.players[idx]:tf.players?.[String(slot)];if(ps)fights.push({start:tf.start,end:tf.end,kills:ps.kills,deaths:ps.deaths,damage:ps.damage,healing:ps.healing,gold_delta:ps.gold_delta,xp_delta:ps.xp_delta});}
    const pick=(arr)=>Array.isArray(arr)?arr.map(x=>({time:x?.time,key:x?.key,x:x?.x,y:x?.y})).filter(Boolean):[];const purchases=pick(player.purchase_log),obs=pick(player.obs_log),sen=pick(player.sen_log),gold=Array.isArray(player.gold_t)?player.gold_t:[],xp=Array.isArray(player.xp_t)?player.xp_t:[],lh=Array.isArray(player.lh_t)?player.lh_t:[];const parsed=purchases.length||obs.length||sen.length||fights.length||gold.length>2||xp.length>2||lh.length>2;return{available:true,source:'opendota',match_id:matchId,parsed:!!parsed,generated_at:Math.floor(Date.now()/1000),player:{account_id:player.account_id,player_slot:player.player_slot,lane_role:player.lane_role,is_roaming:player.is_roaming,lane_efficiency_pct:player.lane_efficiency_pct,lane:player.lane,stuns:player.stuns,gold_t:gold,xp_t:xp,lh_t:lh,purchase_log:purchases,obs_log:obs,sen_log:sen},teamfights:fights,objectives:(raw.objectives||[]).map(o=>({time:o.time,type:o.type,slot:o.slot,key:o.key,player_slot:o.player_slot}))};
  }catch(e){return{available:false,source:'opendota',status:e.status||null,details:e.message,match_id:matchId};}
}
function quantile(arr,q){const a=arr.filter(Number.isFinite).sort((a,b)=>a-b);if(!a.length)return 0;const pos=(a.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(pos-lo);}
function summarizeRows(rows,skill,heroId,role,scanned,failed,minMinutes,maxMinutes){const keys=['kda','deaths','gpm','xpm','lhpm','dmgpm','assistpm','towerpm'],metrics={};for(const k of keys){const vals=rows.map(r=>Number(r[k])).filter(Number.isFinite);metrics[k]={p25:quantile(vals,.25),p50:quantile(vals,.5),p75:quantile(vals,.75),values:vals};}return{n:rows.length,wr:rows.length?rows.filter(r=>r.win).length/rows.length:0,skill,hero_id:heroId,role,scanned,failed,min_minutes:minMinutes,max_minutes:maxMinutes,metrics,from_cache:false,cache_age_hours:0};}
async function benchmarkCohort(heroId,role,skill,target,minMinutes,maxMinutes){
  const cacheKey=[heroId,role,skill,target,minMinutes,maxMinutes].join(':');const cached=globalCache.benchmark.get(cacheKey);if(cached&&Date.now()-cached.at<6*60*60*1000)return{...cached.data,from_cache:true,cache_age_hours:(Date.now()-cached.at)/3600000};
  const raw=await steam('IDOTA2Match_570/GetMatchHistory/v1/',{hero_id:heroId,skill,matches_requested:100});const candidates=raw?.result?.matches||[];const details=await mapLimit(candidates.slice(0,80),8,async hm=>({hm,r:await matchBySequence(hm)}));const rows=[];let failed=0;
  for(const x of details){if(!x||x.__error){failed++;continue;}const {hm,r}=x;if(n(r.lobby_type)!==7)continue;const mins=Math.max(1,n(r.duration)/60);if(minMinutes>0&&mins<minMinutes)continue;if(maxMinutes>0&&mins>=maxMinutes)continue;const p=(r.players||[]).find(p=>n(p.hero_id)===n(heroId));if(!p)continue;const hp=(hm.players||[]).find(p=>n(p.hero_id)===n(heroId));const radiant=n(p.player_slot)<128,team=(r.players||[]).filter(z=>(n(z.player_slot)<128)===radiant),ri=resolveRole(hp,team,p);if(n(ri.role)!==n(role))continue;rows.push({win:radiant===!!r.radiant_win,kda:(n(p.kills)+n(p.assists))/Math.max(1,n(p.deaths)),deaths:n(p.deaths),gpm:n(p.gold_per_min),xpm:n(p.xp_per_min),lhpm:n(p.last_hits)/mins,dmgpm:n(p.hero_damage)/mins,assistpm:n(p.assists)/mins,towerpm:n(p.tower_damage)/mins});if(rows.length>=target)break;}
  const data=summarizeRows(rows,skill,heroId,role,candidates.length,failed,minMinutes,maxMinutes);globalCache.benchmark.set(cacheKey,{at:Date.now(),data});return data;
}
async function benchmark(heroId,role,peerSkill,sample,minMinutes,maxMinutes){const peer=await benchmarkCohort(heroId,role,peerSkill,sample,minMinutes,maxMinutes);const same=peerSkill===3,elite=same?peer:await benchmarkCohort(heroId,role,3,sample,minMinutes,maxMinutes);return{version:'web-beta-1',hero_id:heroId,role,peer_skill:peerSkill,elite_skill:3,peer,elite,same_cohort:same,from_cache:!!peer.from_cache&&!!elite.from_cache,cache_age_hours:Math.max(peer.cache_age_hours||0,elite.cache_age_hours||0),duration_min:minMinutes,duration_max:maxMinutes,method:'Steam hero_id + skill -> ranked -> duration -> team economy role'};}

async function authSteam(req,res){
  const origin=originOf(req),returnTo=`${origin}/api/auth/callback`,q=new URLSearchParams({'openid.ns':'http://specs.openid.net/auth/2.0','openid.mode':'checkid_setup','openid.return_to':returnTo,'openid.realm':origin,'openid.identity':'http://specs.openid.net/auth/2.0/identifier_select','openid.claimed_id':'http://specs.openid.net/auth/2.0/identifier_select'});redirect(res,`https://steamcommunity.com/openid/login?${q}`);
}
async function authCallback(req,res,url){
  const expectedReturn=`${originOf(req)}/api/auth/callback`,returned=url.searchParams.get('openid.return_to')||'';
  if(returned&&returned!==expectedReturn)throw Object.assign(new Error('Steam OpenID return URL mismatch.'),{statusCode:401});
  const params=new URLSearchParams(url.searchParams);params.delete('__dsl_path');params.set('openid.mode','check_authentication');
  const text=await fetchText('https://steamcommunity.com/openid/login',{method:'POST',body:params.toString(),headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'text/plain'},timeout:15000,retries:1});
  if(!/is_valid\s*:\s*true/i.test(text))throw Object.assign(new Error('Steam OpenID verification failed.'),{statusCode:401});
  const claimed=url.searchParams.get('openid.claimed_id')||'';const m=claimed.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/i);if(!m)throw Object.assign(new Error('Steam returned an invalid identity.'),{statusCode:401});setSessionCookie(res,m[1]);redirect(res,'/?steam_login=1');
}
async function authMe(req,res){const s=verifySession(parseCookies(req)[SESSION_COOKIE]);if(!s)return json(res,200,{authenticated:false});let profile=null;try{profile=await profileForSteam64(s.steamid64);}catch{}return json(res,200,{authenticated:true,steamid64:String(s.steamid64),account_id:accountFromSteam64(s.steamid64),profile:profile?{personaname:profile.personaname,avatar:profile.avatar,avatarfull:profile.avatarfull,profileurl:profile.profileurl}:null});}

export default async function handler(req,res){
  const url=new URL(req.url,originOf(req));const routed=url.searchParams.get('__dsl_path');const path=routed?`/api/${routed.replace(/^\/+/, '')}`:url.pathname;
  try{
    if(path==='/api/auth/steam')return authSteam(req,res);
    if(path==='/api/auth/callback')return authCallback(req,res,url);
    if(path==='/api/auth/me')return authMe(req,res);
    if(path==='/api/auth/logout'){clearSessionCookie(res);return json(res,200,{ok:true});}
    if(path==='/api/health'||path==='/health')return json(res,200,{ok:true,service:'Dota Skill Lab Web Beta',version:'web-beta-1',steam_key_configured:/^[A-Fa-f0-9]{32}$/.test(String(process.env.STEAM_API_KEY||'')),auth:'steam-openid'});
    if(path==='/api/diagnostics'){
      const [st,od]=await Promise.all([fetchText(`${STEAM_ORIGIN}/ISteamWebAPIUtil/GetServerInfo/v1/`,{timeout:8000,retries:0}).then(()=>({ok:true,status:200,details:'OK'})).catch(e=>({ok:false,status:e.status||null,details:e.message})),fetchText(`${OPEN_DOTA}/health`,{timeout:8000,retries:0}).then(()=>({ok:true,status:200,details:'OK'})).catch(e=>({ok:false,status:e.status||null,details:e.message}))]);return json(res,200,{steam:st,opendota:od});
    }
    const session=requireSession(req),accountId=accountFromSteam64(session.steamid64);
    if(path==='/api/steam/bundle'){return json(res,200,await bundleFor(accountId,n(url.searchParams.get('limit'),50),url.searchParams.get('scope')==='all'?'all':'ranked'));}
    if(path==='/api/steam/match'){const matchId=url.searchParams.get('match_id')||'';if(!/^\d{6,20}$/.test(matchId))throw Object.assign(new Error('Invalid match ID.'),{statusCode:400});return json(res,200,await fullMatch(accountId,matchId));}
    if(path==='/api/deep-match'){const matchId=url.searchParams.get('match_id')||'';if(!/^\d{6,20}$/.test(matchId))throw Object.assign(new Error('Invalid match ID.'),{statusCode:400});return json(res,200,await deepMatch(accountId,matchId));}
    if(path==='/api/steam/benchmark'){const heroId=n(url.searchParams.get('hero_id')),role=n(url.searchParams.get('role')),peer=n(url.searchParams.get('peer_skill')),sample=Math.max(10,Math.min(24,n(url.searchParams.get('sample'),16))),min=n(url.searchParams.get('min_minutes')),max=n(url.searchParams.get('max_minutes'));if(heroId<1||role<1||role>5||peer<1||peer>3)throw Object.assign(new Error('Invalid benchmark parameters.'),{statusCode:400});return json(res,200,await benchmark(heroId,role,peer,sample,min,max));}
    return json(res,404,{error:'Not found'});
  }catch(e){console.error(e);const status=e.statusCode||((e.status>=400&&e.status<600)?502:500);return json(res,status,{error:e.message||'Server error',upstream_status:e.status||null});}
}
