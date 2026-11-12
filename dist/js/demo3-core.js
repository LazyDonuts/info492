export const BOARD_KEY = 'info492.demo3.board.v2';
export function today(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s; }
export function emptyBoard() { return {version:2, items:[], audit:[], capacity:5, project:'', updated:null}; }
const text = value => typeof value === 'string' ? value.trim() : '';
export function normalizeRfiRecords(rows) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 50) throw Error('Import 1–50 RFI records.');
  const records = rows.map((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw Error(`Record ${index + 1} must be an object.`);
    const rfi_id = text(row.rfi_id ?? row.id ?? row.rfi_number ?? row['RFI Number']);
    const title = (text(row.title ?? row.subject ?? row.rfi_title ?? row.file_name ?? row['RFI Title'] ?? row['File Name']).replace(/\.pdf$/i, '')) || rfi_id;
    const description = text(row.description ?? row.question ?? row.rfi_description ?? row['RFI Description']);
    const submitted_date = text(row.submitted_date ?? row.submitted ?? row.date_submitted ?? row['Date Submitted']);
    const rawDue = row.due_date ?? row.required_return_date ?? row['Required Return Date'];
    const due_date = validDate(typeof rawDue === 'string' ? rawDue : '');
    const normalizedDue = due_date ? rawDue : null;
    const package_id = text(row.package_id ?? row.project ?? row['Project']) || 'Imported RFIs';
    if (!rfi_id || rfi_id.length > 200) throw Error(`Record ${index + 1} needs a valid RFI ID.`);
    if (!description || description.length > 20000) throw Error(`${rfi_id}: add a description up to 20,000 characters.`);
    if (submitted_date && !validDate(submitted_date)) throw Error(`${rfi_id}: submitted date must use YYYY-MM-DD.`);
    return {
      rfi_id, title, description, submitted_date: submitted_date || null, due_date: normalizedDue,
      package_id, assigned_reviewer: text(row.assigned_reviewer),
      provenance: text(row.provenance) || 'User supplied sample; verify source and current status.',
    };
  });
  if (new Set(records.map(record => record.rfi_id)).size !== records.length) throw Error('RFI IDs must be unique in this import.');
  return records;
}
export function mergeRfiRecords(board, records, origin = 'user-import') {
  const normalized = normalizeRfiRecords(records);
  let added=0, updated=0;
  for (const record of normalized) {
    const key = JSON.stringify([origin, record.package_id, record.rfi_id]);
    const old = board.items.find(x=>x.key===key);
    const result = {priority:null, priority_reason:'Not classified yet.', assessment_state:'not_attempted', missing_information:[], suggested_gc_review_action:'Review the submitted description and decide the next coordination step.'};
    const fresh = {key, origin, record, result, run_id:'', metadata:{provider:'Jev',model:'jev-latest'}, analyzed_at:'', classification:null, classification_input:null, classification_state:'not_classified'};
    if (old) { Object.assign(old, fresh); old.analysis_updated=true; updated++; }
    else { board.items.push({...fresh, status:'suggested', order:board.items.length, plan_date:null, due_override:'', owner:'', history:[]}); added++; }
  }
  board.updated = new Date().toISOString();
  return {added, updated};
}
export function applyJevClassification(item, evaluation, inputKey) {
  const priority = {high:'P0', mid:'P1', low:'P2'}[evaluation.category] || null;
  item.classification = {category:evaluation.category, confidence:evaluation.confidence};
  item.classification_input = inputKey;
  item.classification_state = 'classified';
  item.result.priority = priority;
  item.result.priority_reason = `Jev classification: ${evaluation.category.replace('_',' ')} (${Math.round(evaluation.confidence*100)}% confidence).`;
  item.result.assessment_state = evaluation.category === 'lacking_info' ? 'lacking_info' : 'assigned';
  item.result.missing_information = evaluation.category === 'lacking_info' ? ['The submitted information may not support a defensible priority decision. Review the source RFI.'] : [];
  item.result.suggested_gc_review_action = evaluation.category === 'lacking_info' ? 'Review the source RFI and clarify the missing context before assigning priority.' : 'Review Jev’s recommendation and confirm the next coordination action.';
  item.analyzed_at = new Date().toISOString();
  return item;
}
export function due(item) { return validDate(item.due_override) ? item.due_override : validDate(item.result.decision_date) ? item.result.decision_date : ''; }
export function rankable(item) { return ['P0','P1','P2'].includes(item.result.priority); }
export function recommend(items, day) {
  return items.filter(x=>x.status==='suggested' && rankable(x)).sort((a,b)=>['P0','P1','P2'].indexOf(a.result.priority)-['P0','P1','P2'].indexOf(b.result.priority) || (due(a)||'9999').localeCompare(due(b)||'9999') || a.record.rfi_id.localeCompare(b.record.rfi_id) || a.key.localeCompare(b.key));
}
export function wakeSnoozed(board, day) {
  for (const x of board.items) if(x.status==='snoozed' && x.wake_date<=day) {x.status='suggested'; x.followup_due=x.wake_date; x.wake_date=null;}
}
export function change(board, key, action, payload={}, day=today()) {
  const x=board.items.find(i=>i.key===key); if(!x) throw Error('Task no longer exists.');
  if(action==='add') { if(x.status==='planned') return; if(!rankable(x)) throw Error('Classify this RFI before adding it to the plan.'); x.status='planned'; x.plan_date=day; x.order=Math.max(0,...board.items.map(i=>i.order))+1; }
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
  if(!Number.isInteger(limit)||limit<1||limit>50)throw Error('Choose a daily limit from 1 to 50.');
  if(!ranked.length)throw Error('No classified RFIs are ready for planning yet. Classify an RFI first.');
  const chosen=ranked.slice(0,limit),keys=new Set(chosen.map(x=>x.key));
  for(const x of items){
    if(x.status==='planned'&&!keys.has(x.key)){x.status='suggested';x.plan_date=null;x.manual=false;}
    if(keys.has(x.key)){x.status='planned';x.order=chosen.findIndex(i=>i.key===x.key);x.plan_date=day;x.manual=false;}
  }
  board.audit.push({at:new Date().toISOString(),action:'generate-plan',day,project:board.project,policy:'priority-first-1',keys:chosen.map(x=>x.key)});
  return chosen.length;
}
