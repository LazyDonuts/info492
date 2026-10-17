import test from 'node:test';
import assert from 'node:assert/strict';
import { publicDemoBudget } from '../server/public-demo.js';
import { createServer } from '../server/index.js';
import { packet, extraction } from './demo2-fixtures.js';
test('public budget enforces cooldown, rolling hour, UTC day and exact daily reservation', () => {
  let time = Date.parse('2026-10-17T00:00:00Z');
  const budget = publicDemoBudget(() => time);
  assert.equal(budget.reserve().allowed, true);
  assert.equal(budget.reserve().retry_after, 60);
  time += 60000;
  assert.equal(budget.reserve().allowed, true);
  time += 60000;
  assert.equal(budget.reserve().allowed, true);
  time += 60000;
  assert.match(budget.reserve().error, /Hourly/);
  for (let i = 3; i < 10; i++) {
    time += 3600000;
    assert.equal(budget.reserve().allowed, true);
  }
  assert.equal(budget.status().daily_batches_remaining, 0);
  assert.match(budget.reserve().error, /Daily/);
  time = Date.parse('2026-10-18T00:00:00Z');
  assert.equal(budget.reserve().allowed, true);
  assert.equal(budget.status().daily_batches_remaining, 9);
});
test('public API analyzes without authorization, keeps admin protected and rejects excess before provider calls', async t => {
  let calls = 0;
  const server = await createServer({
    env: { AI_PROVIDER:'gemini', GEMINI_API_KEY:'fixture-only', GEMINI_MODEL:'gemini-test',
      GEMINI_MIN_INTERVAL_MS:'0', DEMO2_PUBLIC_DEMO:'true' },
    executionMode: 'test_fixture',
    providerFetch: async (url, opts) => {
      calls++;
      const r = JSON.parse(JSON.parse(opts.body).contents[0].parts[0].text);
      return Response.json({responseId:`fixture-${r.rfi_id}`, candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(extraction(r.rfi_id))}]}}]});
    },
  });
  server.listen(0,'127.0.0.1');
  await new Promise(r => server.once('listening',r));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const c = await fetch(base+'/api/config').then(r=>r.json());
  assert.equal(c.configured,true);
  assert.equal(c.access.token_required,false);
  assert.equal((await fetch(base+'/api/models')).status,401);
  const opts = {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({records:Array.from({length:10},(_,i)=>packet(i+1)), config_hash:c.metadata.config_hash})};
  const res = await fetch(base+'/api/assess',opts);
  assert.equal(res.status,200);
  const events = (await res.text()).trim().split('\n').map(JSON.parse);
  assert.equal(events.at(-1).event,'completed');
  assert.equal(calls,10);
  assert.equal(events.filter(e => e.event === 'item' && e.result?.priority === 'P0').length,10);
  const blocked = await fetch(base+'/api/assess',opts);
  assert.equal(blocked.status,429);
  assert.ok(Number(blocked.headers.get('retry-after'))>0);
  assert.equal(calls,10);
  assert.equal((await fetch(base+'/api/config',{headers:{Origin:'https://other.example'}})).status,403);
});
