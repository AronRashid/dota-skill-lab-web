import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const SESSION_COOKIE='dsl_session';
const STEAM_ID_BASE=76561197960265728n;
let schemaReady=false;

function json(res,status,obj){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(obj));}
function parseCookies(req){const out={};String(req.headers.cookie||'').split(';').forEach(part=>{const i=part.indexOf('=');if(i<0)return;out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim());});return out;}
function sessionSecret(){const explicit=String(process.env.SESSION_SECRET||'').trim();if(explicit.length>=24)return explicit;const key=String(process.env.STEAM_API_KEY||'').trim();if(key)return `dota-skill-lab:${key}`;throw Object.assign(new Error('Server session secret is not configured.'),{statusCode:503});}
function verifySession(token){if(!token||!token.includes('.'))return null;const [body,sig]=token.split('.',2);const expected=crypto.createHmac('sha256',sessionSecret()).update(body).digest('base64url');const a=Buffer.from(sig),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;try{const p=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));if(!p?.steamid64||Number(p.exp)<Date.now()/1000)return null;return p;}catch{return null;}}
function requireSession(req){const p=verifySession(parseCookies(req)[SESSION_COOKIE]);if(!p)throw Object.assign(new Error('Not authenticated with Steam.'),{statusCode:401});return p;}
function accountFromSteam64(steamid64){return (BigInt(steamid64)-STEAM_ID_BASE).toString();}
function db(){const url=String(process.env.DATABASE_URL||'').trim();if(!url)return null;return neon(url);}
async function ensureSchema(sql){if(schemaReady)return;await sql`
  CREATE TABLE IF NOT EXISTS dsl_users (
    steam_id64 TEXT PRIMARY KEY,
    account_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`
  CREATE TABLE IF NOT EXISTS dsl_user_state (
    steam_id64 TEXT PRIMARY KEY REFERENCES dsl_users(steam_id64) ON DELETE CASCADE,
    role_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
    rating_manual JSONB NOT NULL DEFAULT '{}'::jsonb,
    training JSONB,
    journal TEXT NOT NULL DEFAULT '',
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    revision BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS dsl_user_state_updated_idx ON dsl_user_state(updated_at DESC)`;
  schemaReady=true;
}
function safeObject(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}
function sanitize(input){
  const role=safeObject(input.role_overrides),rating=safeObject(input.rating_manual),pref=safeObject(input.preferences);
  const training=(input.training&&typeof input.training==='object'&&!Array.isArray(input.training))?input.training:null;
  const journal=String(input.journal||'').slice(0,20000);
  if(JSON.stringify(role).length>100000)throw Object.assign(new Error('Role override payload is too large.'),{statusCode:413});
  if(JSON.stringify(rating).length>10000)throw Object.assign(new Error('Rating payload is too large.'),{statusCode:413});
  if(training&&JSON.stringify(training).length>20000)throw Object.assign(new Error('Training payload is too large.'),{statusCode:413});
  return {role_overrides:role,rating_manual:rating,training,journal,preferences:{language:['ru','en'].includes(pref.language)?pref.language:'ru',scope:['ranked','all'].includes(pref.scope)?pref.scope:'ranked',history_limit:[50,100,200].includes(Number(pref.history_limit))?Number(pref.history_limit):50}};
}
async function readBody(req){if(req.body&&typeof req.body==='object')return req.body;let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>300000)throw Object.assign(new Error('Request body too large.'),{statusCode:413});}if(!raw)return{};try{return JSON.parse(raw);}catch{throw Object.assign(new Error('Invalid JSON body.'),{statusCode:400});}}

export default async function handler(req,res){
  try{
    const session=requireSession(req),steamid64=String(session.steamid64),accountId=accountFromSteam64(steamid64),sql=db();
    if(!sql)return json(res,200,{available:false,found:false,reason:'DATABASE_URL is not configured'});
    await ensureSchema(sql);
    await sql`INSERT INTO dsl_users (steam_id64, account_id, last_seen_at) VALUES (${steamid64},${accountId},NOW()) ON CONFLICT (steam_id64) DO UPDATE SET account_id=EXCLUDED.account_id,last_seen_at=NOW()`;
    if(req.method==='GET'){
      const rows=await sql`SELECT role_overrides,rating_manual,training,journal,preferences,revision,updated_at FROM dsl_user_state WHERE steam_id64=${steamid64} LIMIT 1`;
      const row=rows[0];if(!row)return json(res,200,{available:true,found:false,account_id:accountId});
      return json(res,200,{available:true,found:true,account_id:accountId,revision:Number(row.revision||1),updated_at:row.updated_at,state:{role_overrides:row.role_overrides||{},rating_manual:row.rating_manual||{},training:row.training||null,journal:row.journal||'',preferences:row.preferences||{}}});
    }
    if(req.method==='PUT'||req.method==='POST'){
      const body=sanitize(await readBody(req));
      const rows=await sql`
        INSERT INTO dsl_user_state (steam_id64,role_overrides,rating_manual,training,journal,preferences,revision,updated_at)
        VALUES (${steamid64},${JSON.stringify(body.role_overrides)}::jsonb,${JSON.stringify(body.rating_manual)}::jsonb,${body.training?JSON.stringify(body.training):null}::jsonb,${body.journal},${JSON.stringify(body.preferences)}::jsonb,1,NOW())
        ON CONFLICT (steam_id64) DO UPDATE SET
          role_overrides=EXCLUDED.role_overrides,
          rating_manual=EXCLUDED.rating_manual,
          training=EXCLUDED.training,
          journal=EXCLUDED.journal,
          preferences=EXCLUDED.preferences,
          revision=dsl_user_state.revision+1,
          updated_at=NOW()
        RETURNING revision,updated_at`;
      return json(res,200,{available:true,ok:true,account_id:accountId,revision:Number(rows[0]?.revision||1),updated_at:rows[0]?.updated_at});
    }
    res.setHeader('Allow','GET, PUT, POST');return json(res,405,{error:'Method not allowed'});
  }catch(e){console.error('user-state',e);return json(res,e.statusCode||500,{error:e.message||'User state error'});}
}
