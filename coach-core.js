/* Shared, bounded coaching contract. The model selects evidence; it cannot author facts. */
(() => {
  const VERSION = 'coach-1';
  const fail = () => { throw new Error('Invalid coaching context'); };
  function validateContext(c) {
    if (!c || c.version !== VERSION || !['ru','en'].includes(c.language) || !['ranked','all'].includes(c.scope)) fail();
    const keys=['version','language','scope','sample','status','windows','primary_role','quality','facts','priorities','matches','training','hero_roles','role_revision','dataset_revision'];
    if(Object.keys(c).some(k=>!keys.includes(k)) || keys.some(k=>!(k in c)))fail();
    if (JSON.stringify(c).length > 18000) fail();
    if (!Number.isInteger(c.sample) || c.sample < 0 || c.sample > 200) fail();
    if (!Array.isArray(c.facts) || c.facts.length > 32 || !Array.isArray(c.priorities) || c.priorities.length > 3) fail();
    const ids = new Set();
    for (const f of c.facts) {
      if (!f || !/^[a-z0-9_]{1,40}$/.test(f.id) || ids.has(f.id) || typeof f.text !== 'string' || f.text.length > 600 || !['form','recent','priority','hero','session','training','quality'].includes(f.kind)) fail();
      ids.add(f.id);
    }
    if (!['improving','stable','declining','insufficient_data'].includes(c.status)) fail();
    if (!Array.isArray(c.matches) || c.matches.length > 5 || c.matches.some(m => !/^\d{6,20}$/.test(m.match_id))) fail();
    for (const p of c.priorities) {
      if (!/^[a-zA-Z0-9_]{1,40}$/.test(p.id) || typeof p.title !== 'string' || p.title.length > 100 || !['high','medium','low'].includes(p.confidence) || !Array.isArray(p.evidence) || p.evidence.length > 4 || p.evidence.some(id => !ids.has(id))) fail();
      if (!p.target || !['max','min'].includes(p.target.direction) || !Number.isFinite(p.target.threshold) || !Number.isInteger(p.target.role) || p.target.role < 1 || p.target.role > 5) fail();
      if(!['deaths','kda','gpm','xpm','lhpm','dmgpm','assistpm','towerpm'].includes(p.target.metric) || typeof p.rule!=='string' || p.rule.length>600)fail();
    }
    if (!['none','continue','mastered','repeat','adjust'].includes(c.training?.decision)) fail();
    for(const name of ['last3','last5','last20','previous20']) {
      const w=c.windows?.[name];if(!w || !Number.isInteger(w.n) || w.n<0 || w.n>20 || !Number.isInteger(w.wins) || w.wins<0 || w.wins>w.n)fail();
      for(const metric of ['score','deaths','gpm','xpm','kda','wr'])if(w[metric]!==null&&!Number.isFinite(w[metric]))fail();
    }
    if(c.status!=='insufficient_data'&&(c.windows.last20.n!==20||c.windows.previous20.n!==20))fail();
    // Reject unexpected data, identities, raw payloads and non-finite numbers at any depth.
    const walk = (v, depth=0) => {
      if (depth > 8) fail();
      if (typeof v === 'number' && !Number.isFinite(v)) fail();
      if (typeof v === 'string' && v.length > 1000) fail();
      if (v && typeof v === 'object') for (const [k,x] of Object.entries(v)) {
        if (/account|steam|token|cookie|journal|email|password|avatar/i.test(k)) fail();
        walk(x,depth+1);
      }
    };
    walk(c);
    return c;
  }
  function fallback(c) {
    validateContext(c);
    return {priority_id:c.priorities[0]?.id || 'none', evidence_ids:c.priorities[0]?.evidence || [],
      supporting_ids:c.facts.filter(f=>['hero','session'].includes(f.kind)).slice(0,2).map(f=>f.id),
      match_ids:c.matches.filter(m=>m.review_for?.includes(c.priorities[0]?.id)).slice(0,3).map(m=>m.match_id)};
  }
  function validateSelection(s,c) {
    if (!s || Object.keys(s).sort().join() !== ['priority_id','evidence_ids','supporting_ids','match_ids'].sort().join()) throw new Error('Invalid coach response');
    const p=c.priorities.find(p=>p.id===s.priority_id);
    if (!p && !(s.priority_id==='none' && !c.priorities.length)) throw new Error('Unknown priority');
    // An active or unfinished training cycle is immutable, including across refreshes.
    if (c.priorities[0]?.locked && s.priority_id!==c.priorities[0]?.id && c.priorities.length) throw new Error('Training priority changed');
    for (const [key,max,allowed] of [
      ['evidence_ids',4,p?.evidence || []],
      ['supporting_ids',2,c.facts.filter(f=>['hero','session'].includes(f.kind)).map(f=>f.id)],
      ['match_ids',3,c.matches.filter(m=>m.review_for?.includes(s.priority_id)).map(m=>m.match_id)]
    ]) if (!Array.isArray(s[key]) || s[key].length>max || new Set(s[key]).size!==s[key].length || s[key].some(id=>!allowed.includes(id))) throw Object.assign(new Error('Unsupported evidence'),{code:key});
    if(p && !s.evidence_ids.length) throw new Error('Missing evidence');
    return s;
  }
  function schema(c) {
    const choice=values=>({type:'string',enum:values.length?values:['none']});
    const list=(values,max,description)=>({type:'array',items:choice([...new Set(values)]),maxItems:Math.min(max,new Set(values).size),description});
    return {type:'object',additionalProperties:false,required:['priority_id','evidence_ids','supporting_ids','match_ids'],properties:{
      priority_id:choice(c.priorities.map(p=>p.id)),
      evidence_ids:list(c.priorities.flatMap(p=>p.evidence),4,'Distinct IDs only from the selected priority evidence. At least one for a real priority; empty for none.'),
      supporting_ids:list(c.facts.filter(f=>['hero','session'].includes(f.kind)).map(f=>f.id),2,'At most two distinct hero or session fact IDs. Return [] when no allowed IDs.'),
      match_ids:list(c.matches.filter(m=>m.review_for?.length).map(m=>m.match_id),3,'At most three distinct match IDs. Each review_for must include the selected priority_id. Return [] for none.')
    }};
  }
  globalThis.DSLCoach={VERSION,validateContext,fallback,validateSelection,schema};
})();
