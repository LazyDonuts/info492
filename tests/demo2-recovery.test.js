import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotStore,mergeRetry} from '../js/demo2-recovery.js';
import {evaluationResults,compareRuns,workingAssessment,assessExtraction} from '../js/demo2-core.js';
import {makeAgent} from '../server/agent.js';
import {packet,extraction} from './demo2-fixtures.js';
test('tab snapshots recover, expire, clear, scope by backend and handle unavailable storage',()=>{
  const m=new Map(),storage={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
  let time=1000; const store=snapshotStore(()=>storage,'https://one',()=>time);
  assert.equal(store.save({selected:[packet(1),packet(2)]}),true);
  assert.equal(store.load().selected.length,2);
  assert.equal(snapshotStore(()=>storage,'https://two',()=>time).load(),null);
  time+=86400001; assert.equal(store.load(),null);
  store.save({selected:[]}); store.clear(); assert.equal(store.load(),null);
  assert.equal(snapshotStore(()=>{throw Error('blocked')},'x').save({}),false);
});
test('retry merges only failed IDs, preserving successful results and provenance',()=>{
  const original={run_id:'one',metadata:{config_hash:'same'},records:[packet(1),packet(2)],results:[{rfi_id:'TEST-1',assessment_state:'assigned',priority:'P0'},{rfi_id:'TEST-2',assessment_state:'processing_error',priority:null}]};
  const retry={run_id:'two',metadata:{config_hash:'same'},results:[{rfi_id:'TEST-2',assessment_state:'assigned',priority:'P1'}]};
  const merged=mergeRetry(original,retry);
  assert.equal(merged.results.length,2); assert.deepEqual(merged.results[0],original.results[0]);
  assert.equal(merged.results[1].source_run_id,'two'); assert.equal(merged.retry_history.length,1);
  assert.equal(original.results[1].priority,null);
  assert.throws(()=>mergeRetry(original,{...retry,metadata:{config_hash:'changed'}}),/configuration/);
  assert.throws(()=>mergeRetry(original,{...retry,results:[original.results[0]]}),/failed records/);
});
test('unreceived AI output stays unranked; v0.4 evaluation never counts provider failures as working successes',()=>{
  const failed={rfi_id:'TEST-1',assessment_state:'processing_error',priority:null};
  assert.equal(workingAssessment({...failed,not_attempted:true},packet(1)).priority,null);
  const run={kind:'ai-1',records:[packet(1),packet(2)],results:[failed,{rfi_id:'TEST-2',assessment_state:'needs_information',priority:null}]};
  const evaluated=evaluationResults(run,'working-triage-0.4');
  assert.equal(evaluated[0].assessment_state,'processing_error'); assert.equal(evaluated[1].priority,'P1');
  assert.equal(evaluationResults(run,'v0.3')[1].priority,null);
});
test('repeatability compares missing facts, excludes failures, and lists changed cases',()=>{
  const a={results:[{rfi_id:'A',assessment_state:'assigned',priority:'P0',missing_information:['Verify timing']},{rfi_id:'B',assessment_state:'processing_error',priority:null}]};
  const b={results:[{...a.results[0],missing_information:[]},a.results[1]]};
  assert.deepEqual(compareRuns(a,b),{eligible:1,priorityMatches:1,missingMatches:0,changed:['A']});
});
test('unknown checks are deterministic and separated from additional model follow-ups',()=>{
  const x=extraction('TEST-1',{X:'Unknown'}), y=structuredClone(x);
  y.missing_information=['Another model suggestion'];
  const a=assessExtraction(packet(1),x),b=assessExtraction(packet(1),y);
  assert.deepEqual(a.required_missing_information,b.required_missing_information);
  assert.ok(a.required_missing_information.length>0);
  assert.notDeepEqual(a.suggested_followups,b.suggested_followups);
});
test('single failed item can be retried without padding; ordinary single-item batch remains invalid',async()=>{
  let calls=0;
  const agent=makeAgent({env:{OPENAI_API_KEY:'test',OPENAI_MODEL:'test',DEMO2_ACCESS_TOKEN:'t'.repeat(40)},rubric:'test',providerFetch:async()=>{calls++;return Response.json({id:'mock',status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(extraction())}]}]});}});
  const body={records:[packet(1)],config_hash:agent.config().metadata.config_hash};
  await assert.rejects(agent.assess(body,()=>{}),/2–10/);
  const run=await agent.assess({...body,retry_failed:true},()=>{});
  assert.equal(calls,1); assert.equal(run.results.length,1); assert.equal(run.results[0].priority,'P0');
});
