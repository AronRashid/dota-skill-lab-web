/* Adapter over existing analytics; no raw match payload leaves the browser. */
let coachRequest = {key:null, result:null, controller:null, pending:false};
const coachText=(ru,en)=>state.lang==='ru'?ru:en;
function buildCoachContext() {
  const a=state.analytics, ms=state.matches, role=a.primaryRole, recent=ms.slice(0,20), prior=ms.slice(20,40);
  const round=n=>Number.isFinite(n)?Number(n.toFixed(2)):null;
  const summary=rows=>({n:rows.length,wins:rows.filter(isWin).length,wr:rows.length?round(rows.filter(isWin).length/rows.length*100):null,score:round(avg(rows,m=>m._score??50)),deaths:round(avg(rows,m=>m.deaths)),gpm:round(avg(rows,m=>m.gold_per_min)),xpm:round(avg(rows,m=>m.xp_per_min)),kda:round(avg(rows,kda))});
  const windows={last3:summary(ms.slice(0,3)),last5:summary(ms.slice(0,5)),last20:summary(recent),previous20:summary(prior)};
  const valid=recent.length===20&&prior.length===20,delta=valid?round(windows.last20.score-windows.previous20.score):null;
  const status=!valid?'insufficient_data':delta>=3?'improving':delta<=-3?'declining':'stable';
  const facts=[],add=(id,kind,text)=>{facts.push({id,kind,text});return id;};
  const low=recent.filter(m=>roleConfidenceLevel(m)==='low').length;
  add('form','form',valid?coachText(`Форма ${delta>=3?'улучшается':delta<=-3?'снижается':'стабильна'}: Performance ${delta>0?'+':''}${delta} за последние 20 против предыдущих 20.`,`Form is ${delta>=3?'improving':delta<=-3?'declining':'stable'}: Performance ${delta>0?'+':''}${delta}, last 20 versus previous 20.`):coachText(`Для сравнения двух полных периодов нужны 40 матчей. Сейчас ${ms.length}; устойчивый тренд пока не определён.`,`Two full comparison windows need 40 matches. Currently ${ms.length}; no reliable trend yet.`));
  add('recent','recent',coachText(`Последние ${windows.last5.n}: ${windows.last5.wins} побед, ${windows.last5.n-windows.last5.wins} поражений. Последние ${windows.last3.n}: Performance ${windows.last3.score??'—'}.`,`Last ${windows.last5.n}: ${windows.last5.wins} wins, ${windows.last5.n-windows.last5.wins} losses. Last ${windows.last3.n}: Performance ${windows.last3.score??'—'}.`));
  add('quality','quality',coachText(`Выборка: ${ms.length}. Низкая уверенность роли: ${low}/${recent.length} последних матчей. Тайминги смертей, vision и позиции на карте в этой сводке отсутствуют.`,`Sample: ${ms.length}. Low role confidence: ${low}/${recent.length} recent matches. Death timings, vision and map positions are unavailable in this brief.`));
  const snap=trainingSnapshot(),active=getTraining();
  const training={decision:!active?'none':snap.results.length<5?'continue':snap.passed>=4?'mastered':snap.passed>=2?'repeat':'adjust',completed:snap.results.length,passed:snap.passed,target:active?{metric:active.metric,direction:active.direction,threshold:active.threshold,role:active.role}:null,revision:active?JSON.stringify(active):'none'};
  const decisions={none:coachText('Выберите цель на следующие 5 игр.','Choose a goal for the next 5 games.'),continue:coachText('Закончите текущие 5 игр; цель сохраняется.','Finish the current 5 games; keep the same goal.'),mastered:coachText('Цель выполнена минимум в 4 играх. Можно перейти к следующему навыку.','Target met in at least 4 games. You can move to the next skill.'),repeat:coachText('Повторите тот же навык и цель ещё 5 игр.','Repeat the same skill and target for 5 more games.'),adjust:coachText('Сохраните навык, но смягчите цель до текущей ролевой медианы.','Keep the skill and ease the target to your current role median.')};
  add('training','training',`${decisions[training.decision]} ${active?`${snap.passed}/${snap.results.length} · Pos ${active.role}`:''}`);
  // Do not inherit mixed-role mistake confidence: recompute with the same existing rules on this role only.
  const roleRows=ms.filter(m=>getRole(m)===role),allowed=role<=3?['deaths','kda','gpm','xpm','lhpm','dmgpm','towerpm']:['deaths','kda','assistpm'];
  let candidates=buildMistakes(roleRows,a.baselines).filter(m=>allowed.includes(m.metric)&&m.confidence>=60&&m.eligible>=20&&roleRows.length>=20&&low<=recent.length*.3).slice(0,3);
  if(ms.length<20)candidates=[];
  if(active && ['continue','repeat','adjust'].includes(training.decision)) {
    const existing=MISTAKE_DEFS.find(m=>m.key===active.mistakeKey);
    candidates=existing?[{...existing,locked:true,confidence:0},...candidates.filter(m=>m.key!==existing.key)].slice(0,3):[];
  } else if(training.decision==='mastered') candidates=candidates.filter(m=>m.key!==active.mistakeKey);
  const priorities=candidates.map((m,i)=>{
    let target=m.locked?{...active}:trainingTargetFor(m,role);
    if(m.locked && training.decision==='adjust') {const median=a.baselines[target.role]?.[target.metric]?.p50;if(Number.isFinite(median))target.threshold=target.direction==='max'?Math.max(target.threshold,median):Math.min(target.threshold,median);}
    target={metric:target.metric,direction:target.direction,threshold:target.metric==='deaths'?Math.floor(target.threshold):round(target.threshold),role:target.role,mistakeKey:m.key,titleKey:m.titleKey};
    const roleSample=ms.filter(x=>getRole(x)===target.role),hits=rows=>rows.filter(x=>{const b=a.baselines[target.role]?.[m.metric],v=matchMetrics(x)[m.metric];return b&&(m.direction==='high'?v>b.p75:v<b.p25);});
    const last5=roleSample.slice(0,5),last3=roleSample.slice(0,3),p20=roleSample.slice(0,20),older=roleSample.slice(20,40);
    const evidence=[];
    evidence.push(add(`priority_${i}`,'priority',m.locked?`${decisions[training.decision]} ${snap.passed}/${snap.results.length}`:coachText(`Pos ${target.role}: ${t(m.titleKey)} встречается в ${m.count}/${m.eligible} последних игр роли. WR в этих играх ${fmtPct(m.wrPresent,0)}, в остальных ${fmtPct(m.wrAbsent,0)}. Это связь в выборке, не доказанная причина.`,`Pos ${target.role}: ${t(m.titleKey)} appears in ${m.count}/${m.eligible} recent role games. WR is ${fmtPct(m.wrPresent,0)} with the pattern and ${fmtPct(m.wrAbsent,0)} otherwise. This is an association, not a proven cause.`)));
    evidence.push(add(`recurrence_${i}`,'priority',coachText(`Повторения на Pos ${target.role}: ${hits(last3).length}/${last3.length} последних, ${hits(last5).length}/${last5.length}, ${hits(p20).length}/${p20.length}; предыдущие ${older.length}: ${hits(older).length}.`,`Recurrence on Pos ${target.role}: ${hits(last3).length}/${last3.length} latest, ${hits(last5).length}/${last5.length}, ${hits(p20).length}/${p20.length}; previous ${older.length}: ${hits(older).length}.`)));
    const pattern=(a.patterns?.overall||[]).find(p=>p.metric===m.metric&&p.role===target.role&&p.validationGap>0&&p.validationN>=8&&roleSample.length>=30);
    if(pattern)evidence.push(add(`holdout_${i}`,'priority',coachText(`Связь подтверждается в отложенной выборке: ${pattern.validationN} игр; разница WR ${fmtPct(pattern.validationGap,0)}.`,`Association persists in the holdout: ${pattern.validationN} games; WR gap ${fmtPct(pattern.validationGap,0)}.`)));
    return {id:m.key,title:t(m.titleKey),confidence:m.locked?'low':m.confidence>=80&&pattern?'high':'medium',evidence,target,rule:coachRule(target),locked:!!m.locked};
  });
  const heroRoles=(a.heroRoles||[]).filter(h=>h.n>=12&&h.confidence>=65).slice(0,3).map(h=>({hero_id:h.hero_id,role:h.role,n:h.n,confidence:round(h.confidence),gaps:h.gaps.filter(g=>g.pct<40).map(g=>({metric:g.metric,pct:round(g.pct)}))}));
  for(const [i,h] of heroRoles.entries())if(h.gaps.length)add(`hero_${i}`,'hero',coachText(`${heroName(h.hero_id)} · Pos ${h.role}: ${h.n} игр. Относительное отставание: ${h.gaps.map(g=>gapMetricLabel(g.metric)).join(', ')}. Это сигнал для разбора героя, а не доказательство общей проблемы навыка.`,`${heroName(h.hero_id)} · Pos ${h.role}: ${h.n} games. Relative gaps: ${h.gaps.map(g=>gapMetricLabel(g.metric)).join(', ')}. Review this hero; this does not establish a general skill problem.`));
  if(a.sessions?.strength==='warn')add('session','session',t(a.sessions.recommendation));
  const matches=ms.slice(0,5).map(m=>{const model=coachModelForMatch(m),keys=Number(getRole(m))<=3?['deaths','kda','gpm','xpm','lhpm','dmgpm','towerpm']:['deaths','kda','assistpm'];return {match_id:String(m.match_id),hero_id:m.hero_id,hero:heroName(m.hero_id),role:getRole(m),role_confidence:roleConfidenceLevel(m),win:isWin(m),score:m._score,grade:performanceGrade(m._score),kda:`${m.kills}/${m.deaths}/${m.assists}`,strengths:model.strengths.filter(x=>keys.includes(x.key)).map(x=>({metric:x.key,pct:x.pct})),risks:model.risks.filter(x=>keys.includes(x.key)).map(x=>({metric:x.key,pct:x.pct})),review_for:roleConfidenceLevel(m)==='low'?[]:priorities.filter(p=>p.target.role===getRole(m)&&(p.target.direction==='max'?matchMetrics(m)[p.target.metric]>p.target.threshold:matchMetrics(m)[p.target.metric]<p.target.threshold)).map(p=>p.id)};});
  return DSLCoach.validateContext({version:DSLCoach.VERSION,language:state.lang,scope:state.scope,sample:ms.length,status,windows,primary_role:role,quality:{low_role:low,missing:['death_timings','vision','positions']},facts,priorities,matches,training,hero_roles:heroRoles,role_revision:Object.entries(state.roleOverrides).slice(0,200).map(([id,v])=>[id,v.role]),dataset_revision:ms.map(m=>[String(m.match_id),getRole(m),m._score])});
}
function coachRule(target) {
  const support=target.role>=4;
  if(target.metric==='deaths')return coachText(support?'Перед выходом на обзор проверьте, кто из союзников рядом; не проверяйте туман в одиночку.':'Перед дракой проверьте видимых противников и возможность отхода; не входите без поддержки.',support?'Before moving for vision, check which allies are nearby; avoid checking fog alone.':'Before a fight, check visible enemies and your escape route; engage with support.');
  if(target.metric==='assistpm'||(support&&target.metric==='kda'))return coachText('Перед движением команды проверьте дистанцию до союзника и готовность спасения или контроля.','Before your team moves, check your distance to an ally and whether your save or disable is ready.');
  return coachNextRule({key:target.metric});
}
function coachTargetLabel(tg){return `Pos ${tg.role} · ${gapMetricLabel(tg.metric)} ${tg.direction==='max'?'≤':'≥'} ${Number(tg.threshold.toFixed(tg.metric==='deaths'?1:2))}`;}
function initCoachLayout() {
  const overview=$('overview'),detail=document.createElement('details');detail.className='panel coach-support';detail.id='coachSupporting';
  const summary=document.createElement('summary');summary.id='coachSupportingLabel';detail.append(summary);
  [...overview.children].filter(el=>el.id!=='welcomePanel').forEach(el=>detail.append(el));
  // Detailed metrics remain reachable, with all IDs and handlers intact.
  $('coach').append(detail);
  const host=document.createElement('div');host.id='coachBrief';host.setAttribute('aria-live','polite');overview.append(host);
}
async function renderCoachBrief(refresh=false) {
  if(!$('coachBrief')||!state.analytics)return;
  let c;try{c=buildCoachContext();}catch(e){$('coachBrief').textContent=coachText('Сводка недоступна. Подробная аналитика доступна в разделах.','Brief unavailable. Detailed analytics remain available in the sections.');return;}
  const key=JSON.stringify({account:state.accountId,context:c});
  if(key===coachRequest.key&&!refresh){paintCoachBrief(c,coachRequest.result,coachRequest.pending);return;}
  coachRequest.controller?.abort();
  const controller=new AbortController();coachRequest={key,result:null,controller,pending:true};
  paintCoachBrief(c,null,true);
  const timer=setTimeout(()=>controller.abort(),16000);
  try {
    const response=await fetch('/api/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({context:c,refresh}),signal:controller.signal});
    if(!response.ok)throw new Error('Coach unavailable');
    const result=await response.json();DSLCoach.validateSelection(result.selection,c);
    if(coachRequest.key!==key||coachRequest.controller!==controller)return;
    coachRequest.result=result;
  }catch{if(coachRequest.controller!==controller)return;coachRequest.result={source:'automated',reason:'unavailable',selection:DSLCoach.fallback(c)};}
  finally{clearTimeout(timer);if(coachRequest.controller===controller){coachRequest.pending=false;paintCoachBrief(c,coachRequest.result,false);}}
}
function paintCoachBrief(c,result,pending) {
  const selection=result?.selection||DSLCoach.fallback(c),priority=c.priorities.find(p=>p.id===selection.priority_id),fact=id=>c.facts.find(f=>f.id===id)?.text||'',esc=safeText;
  const heading=coachText('Ваш план на следующую игру','Your plan for the next game');
  $('coachSupportingLabel').textContent=coachText('Дополнительная аналитика: форма, DNA, сравнение','Supporting analytics: form, DNA, comparison');
  $('coachBrief').innerHTML=`<article class="panel"><div class="panel-title"><div><span class="eyebrow">${result?.source==='ai'?'AI Coach Brief':'Automated Coach Summary'}</span><h2>${heading}</h2></div><button class="secondary small" id="coachRefresh" ${pending?'disabled':''}>${pending?coachText('Анализируем…','Analyzing…'):coachText('Обновить анализ','Refresh analysis')}</button></div>
    <p class="coach-form"><b>${c.sample?`${performanceGrade(c.windows.last20.score)} · ${Math.round(c.windows.last20.score)}/100`:'—'}</b> ${esc(fact('form'))}</p><p>${esc(fact('recent'))}</p>
    <div class="focus-rule"><span class="eyebrow">${coachText('Главный приоритет','Main priority')}</span><h3>${esc(priority?.title||coachText('Пока рано выбирать устойчивый приоритет','Too early to choose a reliable priority'))}</h3><p>${priority?esc(priority.rule):coachText('Продолжайте собирать матчи на своей роли. Не меняйте героя или роль только по этой выборке.','Keep collecting matches on your role. Do not change hero or role based only on this sample.')}</p>
    ${priority?`<p><b>${esc(coachTargetLabel(priority.target))}</b> · ${coachText('Уверенность','Confidence')}: ${esc({high:coachText('высокая','high'),medium:coachText('средняя','medium'),low:coachText('низкая — сохранённая цель','low — retained goal')}[priority.confidence])}</p>`:''}
    <details><summary>${coachText('Почему выбран этот приоритет','Why this priority')}</summary><ul>${selection.evidence_ids.map(id=>`<li>${esc(fact(id))}</li>`).join('')}</ul><p>${esc(fact('quality'))}</p><p>${coachText('Совет — практическое правило для проверки, а не утверждение о событиях повтора.','The advice is a practice rule to test, not a claim about replay events.')}</p></details></div>
    <p>${coachText('Герой и роль: сохраняйте текущий пул до завершения цикла; отдельные отклонения проверьте в Heroes.','Hero and role: keep your current pool through the cycle; inspect individual gaps in Heroes.')}</p>
    ${selection.supporting_ids.map(id=>`<p class="muted">${esc(fact(id))}</p>`).join('')}
    <small class="muted">${pending?coachText('Автоматическая сводка уже готова. AI уточняет приоритет.','Automated summary is ready. AI is refining the priority.'):result?.source==='ai'?coachText('AI выбрал факты; числа и цели рассчитаны приложением.','AI selected evidence; the application calculated all numbers and targets.'):coachText('Работает автоматическая сводка. AI недоступен или не подключён.','Automated summary is active. AI is unavailable or not configured.')}</small></article>
    <article class="panel"><span class="eyebrow">${coachText('Текущая тренировка','Current training')}</span><h3>${esc(c.training.target?coachTargetLabel(c.training.target):priority?coachTargetLabel(priority.target):coachText('Сначала соберём достаточно данных','Collect sufficient data first'))}</h3><p>${esc(fact('training'))}</p><div class="coach-actions">${priority&&c.training.decision!=='continue'?`<button class="primary" id="coachStart">${coachText(c.training.decision==='none'?'Начать 5 игр':'Начать следующий цикл',c.training.decision==='none'?'Start 5 games':'Start next cycle')}</button>`:''}<button class="secondary" data-coach-section="training">${coachText('Открыть тренировку','Open training')}</button></div></article>
    <article class="panel"><h3>${coachText('Последние игры · где проверить','Recent games · where to verify')}</h3><div class="coach-recent">${c.matches.map(m=>`<button class="secondary coach-match" data-coach-match="${m.match_id}"><b>${esc(m.hero)} · Pos ${m.role||'?'}</b><span>${m.win?coachText('Победа','Win'):coachText('Поражение','Loss')} · ${m.grade} · ${m.kda}</span><small>#${m.match_id} ${selection.match_ids.includes(m.match_id)?'· '+coachText('Проверить приоритет','Verify priority'):''}</small></button>`).join('')||esc(coachText('Нет матчей','No matches'))}</div></article>
    <article class="panel"><h3>${coachText('Изменения формы','Progress snapshot')}</h3>${c.status==='insufficient_data'?`<p>${esc(fact('form'))}</p>`:''}${c.status!=='insufficient_data'?`<p>Deaths ${fmtDeltaNumber(c.windows.last20.deaths-c.windows.previous20.deaths)} · GPM ${fmtDeltaNumber(c.windows.last20.gpm-c.windows.previous20.gpm,0)} · WR ${fmtDeltaNumber(c.windows.last20.wr-c.windows.previous20.wr)} ${coachText('п.п.','pp')}</p>`:''}<button class="secondary" data-coach-section="progress">${coachText('Проверить прогресс','Inspect progress')}</button></article>
    <article class="panel"><h3>${coachText('Изучить аналитику','Explore analytics')}</h3><div class="coach-actions">${['matches','heroes','patterns','sessions','coach','deep','progress'].map(id=>`<button class="secondary" data-coach-section="${id}">${esc(t({matches:'navMatches',heroes:'navHeroes',patterns:'navPatterns',sessions:'navSessions',coach:'navCoach',deep:'navDeep',progress:'navProgress'}[id]))}</button>`).join('')}</div></article>`;
  $('coachRefresh').onclick=()=>renderCoachBrief(true);
  $('coachBrief').querySelectorAll('[data-coach-section]').forEach(b=>b.onclick=()=>switchSection(b.dataset.coachSection));
  $('coachBrief').querySelectorAll('[data-coach-match]').forEach(b=>b.onclick=()=>openFullMatch(b.dataset.coachMatch));
  if($('coachStart'))$('coachStart').onclick=()=>startCoachCycle(priority);
}
function startCoachCycle(priority) {
  if(!priority || (getTraining()&&trainingSnapshot().results.length<5))return;
  const latest=state.matches[0],tg=priority.target;
  localStorage.setItem(trainingStorageKey(),JSON.stringify({...tg,label:coachTargetLabel(tg),startMatchId:String(latest?.match_id||0),startTime:Number(latest?.start_time||0),startedAt:Date.now()}));
  queueRemoteUserStateSync();renderTraining();renderCoachBrief();
}
