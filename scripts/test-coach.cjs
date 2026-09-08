const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),storage=new Map();
const ctx=vm.createContext({console,fetch:async()=>({ok:true,text:async()=>'{"ok":true}',json:async()=>({ok:true})}),window:{location:{protocol:'http:'}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{getElementById:()=>({}),querySelectorAll:()=>[]},setTimeout,clearTimeout,AbortController});
for(const name of ['coach-core.js','coach-brief.js','app.js']){let source=fs.readFileSync(path.join(root,name),'utf8');if(name==='app.js')source=source.split('\ninitProductUI();')[0];new vm.Script(source,{filename:name}).runInContext(ctx);}
const run=code=>vm.runInContext(code,ctx),read=()=>JSON.parse(run('JSON.stringify(buildCoachContext())'));
const fixture=(i,role=3)=>({match_id:9000000000-i,start_time:1788780000-i*4000,duration:2300,hero_id:1,player_slot:0,radiant_win:i%5<3,kills:4+i%13,deaths:3+i%10,assists:6+i%17,gold_per_min:380+i%17*19,xp_per_min:440+i%19*17,last_hits:180+i%100,hero_damage:18000+i%11*2100,tower_damage:1000+i%7*600,hero_healing:0,role_auto:role,role_confidence:.8});
run("state.accountId='123456789';state.heroMap={1:{en:'Anti-Mage',ru:'Anti-Mage'}};");
let cases=0;
for(const n of [0,12,20,50,100,200])for(const language of ['ru','en'])for(const scope of ['ranked','all'])for(const role of [1,3,5]) {
  ctx.fixture=Array.from({length:n},(_,i)=>fixture(i,role));ctx.language=language;ctx.scope=scope;
  run('state.matches=fixture;state.lang=language;state.scope=scope;recomputeAnalytics();');const c=read();
  assert.equal(c.sample,n);assert.equal(c.language,language);assert.equal(c.scope,scope);assert.ok(Buffer.byteLength(JSON.stringify(c))<20000);
  if(n<20)assert.equal(c.priorities.length,0);if(n<40)assert.equal(c.status,'insufficient_data');
  if(role===5)assert.ok(c.priorities.every(p=>['deaths','kda','assistpm'].includes(p.target.metric)));
  assert.ok(c.matches.length<=5);assert.ok(c.priorities.length<=3);cases++;
}
run('state.matches.forEach(m=>m.role_confidence=.1);recomputeAnalytics();');assert.equal(read().priorities.length,0);
ctx.fixture=Array.from({length:50},(_,i)=>({...fixture(0),match_id:9000000000-i,start_time:1788780000-i*4000}));
run('state.matches=fixture;recomputeAnalytics();');assert.equal(read().priorities.length,0);
ctx.fixture=Array.from({length:50},(_,i)=>fixture(i));run('state.matches=fixture;recomputeAnalytics();');
const c=read(),target=c.priorities[0].target;
ctx.training={...target,label:'saved target',startTime:1788780000,startedAt:1};
run('localStorage.setItem(trainingStorageKey(),JSON.stringify(training));');assert.equal(read().training.decision,'continue');
assert.equal(read().priorities[0].id,target.mistakeKey);
for(const [passed,decision] of [[5,'mastered'],[3,'repeat'],[0,'adjust']]) {
  ctx.fixture=Array.from({length:50},(_,i)=>({...fixture(i),deaths:i<5?(i<passed?0:50):fixture(i).deaths}));
  ctx.training={metric:'deaths',direction:'max',threshold:6,role:3,mistakeKey:'highDeaths',titleKey:'mistakeHighDeaths',startTime:1788780000-5*4000,label:'≤6 deaths'};
  run('state.matches=fixture;localStorage.setItem(trainingStorageKey(),JSON.stringify(training));recomputeAnalytics();');assert.equal(read().training.decision,decision);
}
run("localStorage.removeItem(trainingStorageKey());state.roleOverrides={};state.matches=fixture;recomputeAnalytics();");
const before=read();run("state.roleOverrides[String(state.matches[0].match_id)]={role:5,verifiedAt:1};saveRoleOverrides();recomputeAnalytics();");const after=read();assert.notDeepEqual(after.dataset_revision,before.dataset_revision);
(async()=>{
  const {generateCoach,fingerprint,readCoachBody}=await import('../lib/coach-service.js');const core=globalThis.DSLCoach;
  assert.notEqual(fingerprint('A',c,'model'),fingerprint('B',c,'model'));
  assert.notEqual(fingerprint('A',before,'model'),fingerprint('A',after,'model'));
  const selection=core.fallback(c);assert.deepEqual(core.validateSelection(selection,c),selection);
  assert.throws(()=>core.validateSelection({...selection,evidence_ids:['death_after_25']},c));
  assert.throws(()=>core.validateSelection({...selection,match_ids:['123456789']},c));
  assert.throws(()=>core.validateSelection({...selection,summary:'Invented prose'},c));
  await assert.rejects(()=>readCoachBody({body:{context:c,account_id:'other'}}));
  await assert.rejects(()=>readCoachBody({body:{context:{...c,account_id:'other'}}}));
  process.env.COACH_ENABLED='true';delete process.env.COACH_PROVIDER;delete process.env.COACH_MODEL;delete process.env.GROQ_API_KEY;delete process.env.OPENAI_API_KEY;assert.equal((await generateCoach('A',c)).reason,'not_configured');
  process.env.GROQ_API_KEY='test-only';process.env.COACH_ENABLED='true';
  const cache=new Map(),calls=new Map();let paid=0,rateLimit=false;
  const sql=async(parts,...args)=>{const q=parts.join('?');if(q.startsWith('SELECT result'))return cache.has(args[0]+args[1])?[{result:cache.get(args[0]+args[1])}]:[];if(q.startsWith('INSERT INTO dsl_coach_budget')){calls.set(args[0],1+(calls.get(args[0])||0));return rateLimit?[]:[{calls:1}];}if(q.startsWith('INSERT INTO dsl_coach_cache'))cache.set(args[0]+args[1],JSON.parse(args[2]));return [];};
  const fetcher=async(url,options)=>{assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');const body=JSON.parse(options.body);assert.equal(body.model,'openai/gpt-oss-20b');assert.equal(body.response_format.json_schema.strict,true);assert.equal(body.stream,false);assert.equal(body.store,undefined);assert.equal(body.reasoning_effort,'low');assert.deepEqual(body.response_format.json_schema.schema,core.schema(c));paid++;return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(selection)}}]})};};
  assert.equal((await generateCoach('A',c,{sql,fetcher})).source,'ai');
  assert.equal((await generateCoach('A',c,{sql,fetcher})).cached,true);assert.equal(paid,1);
  await generateCoach('B',c,{sql,fetcher});assert.equal(paid,2);assert.equal(cache.size,2);
  assert.equal((await generateCoach('A',c,{sql,fetcher,refresh:true})).cached,false);
  rateLimit=true;assert.equal((await generateCoach('A',c,{sql,fetcher,refresh:true})).reason,'rate_limited');rateLimit=false;
  assert.equal((await generateCoach('A',c,{sql,refresh:true,fetcher:async()=>({ok:false,status:429})})).reason,'quota_exceeded');
  assert.equal((await generateCoach('A',c,{sql,refresh:true,fetcher:async()=>{throw Object.assign(new Error(),{name:'TimeoutError'});}})).reason,'timeout');
  assert.equal((await generateCoach('A',c,{sql,refresh:true,fetcher:async()=>({ok:true,json:async()=>({choices:[{message:{content:'{"invented":true}'}}]})})})).source,'automated');
  assert.notEqual(fingerprint('A',c,'same-model','groq'),fingerprint('A',c,'same-model','openai'));
  const newMatch=JSON.parse(JSON.stringify(c));newMatch.dataset_revision[0][0]='9999999999';assert.notEqual(fingerprint('A',c,'model'),fingerprint('A',newMatch,'model'));
  assert.equal((await generateCoach('A',c,{refresh:true,fetcher})).reason,'storage_unavailable');
  process.env.COACH_ENABLED='false';assert.equal((await generateCoach('A',c,{sql,fetcher})).reason,'disabled');process.env.COACH_ENABLED='true';
  assert.equal((await generateCoach('A',c,{sql,refresh:true,fetcher:async()=>({ok:false,status:500})})).reason,'provider_error');
  assert.equal((await generateCoach('A',c,{sql,refresh:true,fetcher:async()=>{throw new Error('network failure');}})).source,'automated');
  assert.equal((await generateCoach('A',c,{sql,refresh:true,fetcher:async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({...selection,priority_id:'invented'})}}]})})})).source,'automated');
  assert.equal((await generateCoach('A',c,{sql,refresh:true,fetcher:async()=>({ok:true,json:async()=>{throw new SyntaxError('malformed');}})})).source,'automated');
  process.env.COACH_PROVIDER='openai';process.env.OPENAI_API_KEY='test-openai';
  const openai=await generateCoach('A',c,{sql,fetcher:async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/chat/completions');const b=JSON.parse(options.body);assert.equal(b.model,'gpt-4o-mini');assert.equal(b.store,false);assert.equal(b.reasoning_effort,undefined);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(selection)}}]})};}});
  assert.equal(openai.source,'ai');assert.equal(openai.cached,false);assert.notEqual(openai.fingerprint,fingerprint('A',c,'openai/gpt-oss-20b','groq'));
  process.env.COACH_PROVIDER='unsupported';assert.equal((await generateCoach('A',c,{sql,fetcher})).reason,'not_configured');
  process.env.COACH_PROVIDER='groq';
  // Exercise the actual authenticated route with signed test sessions; no real network or database.
  const apiSource=fs.readFileSync(path.join(root,'api/index.js'),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export default async function handler','async function handler');
  process.env.SESSION_SECRET='test-secret-at-least-24-characters';process.env.COACH_ENABLED='false';
  const api=vm.createContext({crypto,process,Buffer,URL,URLSearchParams,console:{error(){}},readCoachBody,generateCoach,neon:()=>sql,fetch:()=>{throw new Error('Unexpected external call');},setTimeout,clearTimeout});vm.runInContext(apiSource,api);
  const token=id=>{const b=Buffer.from(JSON.stringify({steamid64:String(76561197960265728n+BigInt(id)),exp:Date.now()/1000+3600})).toString('base64url');return b+'.'+crypto.createHmac('sha256',process.env.SESSION_SECRET).update(b).digest('base64url');};
  const request=async(id,body={context:c})=>{const res={setHeader(){},end(v){this.body=JSON.parse(v);}};api.req={url:'/api/coach',method:'POST',headers:{host:'localhost',cookie:id?'dsl_session='+token(id):''},body};api.res=res;await vm.runInContext('handler(req,res)',api);return res;};
  assert.equal((await request(null)).statusCode,401);
  const ra=await request(1),rb=await request(2);assert.equal(ra.statusCode,200);assert.notEqual(ra.body.fingerprint,rb.body.fingerprint);
  assert.equal((await request(1,{context:c,account_id:'2'})).statusCode,400);
  console.log(`PASS: ${cases} context scenarios; role correction; active/mastered/repeat/adjust training; evidence rejection; account isolation; cache; budgets; provider errors; authenticated API.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
