import fs from 'node:fs';

const path='app.js';
let s=fs.readFileSync(path,'utf8');
if(s.includes('function remoteStorageSnapshot(){')){
  console.log('Multi-user client sync already applied.');
  process.exit(0);
}

function mustReplace(from,to,label){
  if(!s.includes(from)) throw new Error(`Patch target not found: ${label}`);
  s=s.replace(from,to);
}

mustReplace("  ratingManual: {},\n  bundleMeta: {},","  ratingManual: {},\n  remoteState: {available:false, loaded:false, found:false, syncing:false, updatedAt:null},\n  bundleMeta: {},",'state.remoteState');

const helpers=fs.readFileSync('scripts/cloud-helpers.txt','utf8');
mustReplace("function roleKey(){ return `dotaSkillLab.roles.${state.accountId||'guest'}`; }",helpers+"function roleKey(){ return `dotaSkillLab.roles.${state.accountId||'guest'}`; }",'cloud helpers');
mustReplace("function saveRoleOverrides(){ localStorage.setItem(roleKey(),JSON.stringify(state.roleOverrides)); }","function saveRoleOverrides(){ localStorage.setItem(roleKey(),JSON.stringify(state.roleOverrides)); queueRemoteUserStateSync(); }",'role sync');
mustReplace("function saveRatingManual(v){ state.ratingManual=v||{}; localStorage.setItem(ratingStorageKey(),JSON.stringify(state.ratingManual)); }","function saveRatingManual(v){ state.ratingManual=v||{}; localStorage.setItem(ratingStorageKey(),JSON.stringify(state.ratingManual)); queueRemoteUserStateSync(); }",'rating sync');
mustReplace("function setLanguage(lang){ if(!['ru','en'].includes(lang)) return; state.lang=lang; localStorage.setItem('dotaSkillLab.lang',lang); if(state.matches.length) renderAll(); else { applyI18n(); runDiagnostics(); } }","function setLanguage(lang){ if(!['ru','en'].includes(lang)) return; state.lang=lang; localStorage.setItem('dotaSkillLab.lang',lang); queueRemoteUserStateSync(); if(state.matches.length) renderAll(); else { applyI18n(); runDiagnostics(); } }",'language sync');
mustReplace("function startTraining(){ const m=state.analytics.mistakes[0],tg=trainingTargetFor(m,state.analytics.primaryRole);if(!tg)return;const latest=state.matches[0];localStorage.setItem(trainingStorageKey(),JSON.stringify({...tg,startMatchId:String(latest?.match_id||0),startTime:Number(latest?.start_time||0),startedAt:Date.now()}));renderTraining(); }","function startTraining(){ const m=state.analytics.mistakes[0],tg=trainingTargetFor(m,state.analytics.primaryRole);if(!tg)return;const latest=state.matches[0];localStorage.setItem(trainingStorageKey(),JSON.stringify({...tg,startMatchId:String(latest?.match_id||0),startTime:Number(latest?.start_time||0),startedAt:Date.now()}));queueRemoteUserStateSync();renderTraining(); }",'training start sync');
mustReplace("function resetTraining(){ localStorage.removeItem(trainingStorageKey());renderTraining(); }","function resetTraining(){ localStorage.removeItem(trainingStorageKey());queueRemoteUserStateSync();renderTraining(); }",'training reset sync');
mustReplace("$('saveJournal').onclick=()=>{localStorage.setItem(journalStorageKey(),$('journal').value);$('journalSaved').textContent=t('saved');setTimeout(()=>$('journalSaved').textContent='',1300);};","$('saveJournal').onclick=()=>{localStorage.setItem(journalStorageKey(),$('journal').value);queueRemoteUserStateSync();$('journalSaved').textContent=t('saved');setTimeout(()=>$('journalSaved').textContent='',1300);};",'journal sync');
mustReplace("  localStorage.setItem('dotaSkillLab.lastAccountId',state.accountId);localStorage.setItem('dotaSkillLab.historyLimit',String(limit));localStorage.setItem('dotaSkillLab.matchScope',scope);","  localStorage.setItem('dotaSkillLab.lastAccountId',state.accountId);localStorage.setItem('dotaSkillLab.historyLimit',String(limit));localStorage.setItem('dotaSkillLab.matchScope',scope);queueRemoteUserStateSync(900);",'preference sync');
mustReplace("    if(me.profile)state.profile={profile:me.profile};setLoadPipeline('connect',true);await loadPlayer();setTimeout(()=>setLoadPipeline('ready',false),650);","    if(me.profile)state.profile={profile:me.profile};setLoadPipeline('connect',true);await loadRemoteUserState();applyI18n();await loadPlayer();setTimeout(()=>setLoadPipeline('ready',false),650);",'bootstrap sync');

s=s.replace("sourceSteam:'Источник: Steam API',","sourceSteam:'Источник: Steam API', cloudSyncOn:'Профиль синхронизируется', cloudSyncLocal:'Настройки только на этом устройстве',");
s=s.replace("sourceSteam:'Source: Steam API',","sourceSteam:'Source: Steam API', cloudSyncOn:'Profile sync active', cloudSyncLocal:'Settings only on this device',");
mustReplace("els.datasetChip.textContent=`${state.matches.length} ${t('matchesWord')} · ${t('scanned')} ${scanned} · ${low} ${t('lowRole')} · ${itemLabel}`;","const syncLabel=state.remoteState?.available?t('cloudSyncOn'):t('cloudSyncLocal');els.datasetChip.textContent=`${state.matches.length} ${t('matchesWord')} · ${t('scanned')} ${scanned} · ${low} ${t('lowRole')} · ${itemLabel} · ${syncLabel}`;",'profile sync badge');

fs.writeFileSync(path,s,'utf8');
console.log('Applied multi-user client sync patch.');
