import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecords, parseUpload, csv } from '../js/demo2-core.js';
import { makeAgent } from '../server/agent.js';
import { packet, extraction } from './demo2-fixtures.js';
const rows = n => Array.from({length:n},(_,i)=>packet(i+1));
test('selection and CSV/JSON imports accept every size 2–10 without padding or truncation',()=>{
  for(let n=2;n<=10;n++) {
    assert.equal(validateRecords(rows(n)).length,n);
    assert.equal(parseUpload(JSON.stringify(rows(n)),'test.json').length,n);
    assert.equal(parseUpload(csv(rows(n)),'test.csv').length,n);
  }
  for(const n of [0,1,11]) {
    assert.throws(()=>validateRecords(rows(n)),/2–10/);
    assert.throws(()=>parseUpload(JSON.stringify(rows(n)),'test.json'),/2–10/);
  }
  assert.throws(()=>validateRecords(rows(6),{exactlyTen:true}),/exactly 10/);
});
test('agent returns precisely 2, 6 or 10 assessments, rejects out-of-range before provider calls', async ()=>{
  let calls=0;
  const agent=makeAgent({env:{OPENAI_API_KEY:'fixture-only',OPENAI_MODEL:'test-model',DEMO2_ACCESS_TOKEN:'t'.repeat(40)},rubric:'test',providerFetch:async(url,opts)=>{
    calls++;
    const record=JSON.parse(JSON.parse(opts.body).input);
    return Response.json({id:`mock-${record.rfi_id}`,status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(extraction(record.rfi_id))}]}]});
  }});
  for(const n of [2,6,10]) {
    const events=[], before=calls;
    const run=await agent.assess({records:rows(n),config_hash:agent.config().metadata.config_hash},e=>events.push(e));
    assert.equal(calls-before,n);
    assert.equal(run.results.length,n);
    assert.equal(events.filter(e=>e.event==='item').length,n);
    assert.ok(run.results.every(r=>r.priority==='P0'));
    assert.equal(events.at(-1).event,'completed');
  }
  const before=calls;
  for(const n of [1,11]) await assert.rejects(agent.assess({records:rows(n),config_hash:agent.config().metadata.config_hash},()=>{}),/2–10/);
  assert.equal(calls,before);
});
