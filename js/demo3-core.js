import { workingAssessment, validateRecords } from './demo2-core.js?v=20261018-refine';
export const BOARD_KEY = 'info492.demo3.board.v1';
export const INBOX_KEY = 'info492.demo3.inbox.v1';
export const RETURN_KEY = 'info492.demo3.return.v1';
export function today(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s; }
export function emptyBoard() { return {version:1, items:[], audit:[], capacity:5, project:'', updated:null}; }
export function envelope(run, origin) {
  if (run?.kind !== 'development' || !run.completed_at) throw Error('Send a completed development run, not an evaluation or baseline.');
  if (!Number.isFinite(Date.parse(run.completed_at)) || typeof run.run_id !== 'string') throw Error('Run timestamp or ID is invalid.');
  const records = validateRecords(run.records, {minimum:1});
  if (!Array.isArray(run.results) || run.results.length > 10) throw Error('Invalid analysis results.');
  const ids = new Set(records.map(r=>r.rfi_id));
  if (new Set(run.results.map(r=>r.rfi_id)).size !== run.results.length || run.results.some(r=>!ids.has(r.rfi_id))) throw Error('Result IDs do not match submission packets.');
  const u = new URL(origin);
  if (u.origin !== origin || !['https:', 'http:'].includes(u.protocol)) throw Error('Invalid backend origin.');
  return {version:1, origin, run:{...run, records}, sent_at:new Date().toISOString()};
}
export function mergeRun(board, message) {
  const {run, origin} = envelope(message.run, message.origin);
  let added=0, updated=0;
  for (const record of run.records) {
    const raw = run.results.find(r=>r.rfi_id===record.rfi_id);
    if (!raw) continue;
    const key = JSON.stringify([origin, record.package_id || 'Unassigned project',record.rfi_id]);
    const old = board.items.find(x=>x.key===key);
    if (old && Date.parse(old.analyzed_at) >= Date.parse(run.completed_at)) continue;
    const result = workingAssessment(raw, record);
    const fresh = {key, origin, record, result, run_id:run.run_id, metadata:run.metadata || {}, analyzed_at:run.completed_at};
    if (old) { Object.assign(old, fresh); old.analysis_updated=true; updated++; }
    else { board.items.push({...fresh, status:'suggested', order:board.items.length, plan_date:null, due_override:'', owner:'', history:[]}); added++; }
  }
  board.updated = new Date().toISOString();
  return {added, updated};
}
export function due(item) { return validDate(item.due_override) ? item.due_override : validDate(item.result.decision_date) ? item.result.decision_date : ''; }
export function rankable(item) { return item.result.assessment_state !== 'excluded' && !item.result.not_attempted && !item.result.ai_review_failed && ['P0','P1','P2'].includes(item.result.priority); }
export function recommend(items, day) {
  return items.filter(x=>x.status==='suggested' && rankable(x)).sort((a,b)=>['P0','P1','P2'].indexOf(a.result.priority)-['P0','P1','P2'].indexOf(b.result.priority) || (due(a)||'9999').localeCompare(due(b)||'9999') || a.record.rfi_id.localeCompare(b.record.rfi_id) || a.key.localeCompare(b.key));
}
export function wakeSnoozed(board, day) {
  for (const x of board.items) if(x.status==='snoozed' && x.wake_date<=day) {x.status='suggested'; x.followup_due=x.wake_date; x.wake_date=null;}
}
export function change(board, key, action, payload={}, day=today()) {
  const x=board.items.find(i=>i.key===key); if(!x) throw Error('Task no longer exists.');
  if(action==='add') { if(x.status==='planned') return; if(!rankable(x)) throw Error('Resolve failed or excluded assessments in Demo 2 first.'); x.status='planned'; x.plan_date=day; x.order=Math.max(0,...board.items.map(i=>i.order))+1; }
  else if(action==='remove') {x.status='suggested';x.plan_date=null;}
  else if(action==='snooze') { if(!validDate(payload.date)||payload.date<=day||!payload.reason?.trim()) throw Error('Choose a future follow-up date and enter a reason.');x.status='snoozed';x.wake_date=payload.date;x.snooze_reason=payload.reason.trim(); }
  else if(action==='review') { if(!payload.outcome || !payload.note?.trim()) throw Error('Choose an outcome and record your action.'); if(payload.followup && (!validDate(payload.followup)||payload.followup<=day)) throw Error('Follow-up must be after today.'); x.status='reviewed';x.reviewed_date=day;x.outcome=payload.outcome;x.note=payload.note.trim();x.followup=payload.followup||''; x.followup_due=''; }
  else throw Error('Unknown task action.');
  board.audit.push({at:new Date().toISOString(), day, key, action, ...payload}); board.audit=board.audit.slice(-2000);
}
export function reorder(board, key, target) {
  const list=board.items.filter(x=>x.status==='planned').sort((a,b)=>a.order-b.order);
  const from=list.findIndex(x=>x.key===key), to=list.findIndex(x=>x.key===target);
  if(from<0||to<0||from===to) return;
  const [x]=list.splice(from,1);list.splice(to,0,x);list.forEach((i,n)=>i.order=n);x.manual=true;
  board.audit.push({at:new Date().toISOString(),key,action:'reorder',target});
}

export function planCandidates(items, day) {
  return recommend(items.filter(x=>['suggested','planned'].includes(x.status)).map(x=>({...x,status:'suggested'})),day);
}
export function generatePlan(board, day) {
  if(!validDate(day)) throw Error('Choose a valid planning date.');
  const items=board.items.filter(x=>!board.project || (x.record.package_id||'Unassigned project')===board.project);
  const ranked=planCandidates(items,day), limit=Number(board.capacity);
  if(![3,5,10].includes(limit))throw Error('Choose a daily capacity of 3, 5 or 10.');
  if(!ranked.length)throw Error('No eligible assessments. Send completed results from Demo 2 first.');
  const chosen=ranked.slice(0,limit),keys=new Set(chosen.map(x=>x.key));
  for(const x of items){
    if(x.status==='planned'&&!keys.has(x.key)){x.status='suggested';x.plan_date=null;x.manual=false;}
    if(keys.has(x.key)){x.status='planned';x.order=chosen.findIndex(i=>i.key===x.key);x.plan_date=day;x.manual=false;}
  }
  board.audit.push({at:new Date().toISOString(),action:'generate-plan',day,project:board.project,policy:'priority-first-1',keys:chosen.map(x=>x.key)});
  return chosen.length;
}
