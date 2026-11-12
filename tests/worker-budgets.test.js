import test from "node:test";
import assert from "node:assert/strict";
import { publicDemoBudget, publicJevBudget } from "../server/public-demo.js";
import * as B from "../worker/budgets.js";

// Deterministic PRNG so failures are reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

test("Durable Object public-allowance logic matches server/public-demo.js step for step", () => {
  const random = rng(7);
  let time = Date.parse("2026-11-12T00:00:00Z");
  const original = publicDemoBudget(() => time);
  const state = B.fresh();
  for (let i = 0; i < 3000; i++) {
    time += Math.floor(random() * random() * 7200000);
    if (random() < 0.3) {
      const { counter_scope: _a, ...x } = original.status();
      const { counter_scope: _b, ...y } = B.publicStatus(state, time);
      assert.deepEqual(y, x);
    }
    assert.deepEqual(B.publicReserve(state, time), original.reserve(), `step ${i}`);
  }
});

test("per-address Jev limits match server/public-demo.js", () => {
  const random = rng(11);
  let time = Date.parse("2026-11-12T00:00:00Z");
  const original = publicJevBudget(() => time);
  const state = B.fresh();
  for (let i = 0; i < 4000; i++) {
    time += Math.floor(random() * 90000);
    const address = `10.0.0.${Math.floor(random() * 3)}`;
    assert.deepEqual(B.jevReserve(state, address, time), original.reserve(address), `step ${i}`);
  }
});

test("attempt limit, concurrency slot, global batch cap and slot lease behave like server/index.js", () => {
  const s = B.fresh();
  const t = 1_000_000;
  for (let i = 0; i < 15; i++) assert.equal(B.attempt(s, "1.1.1.1", t).allowed, true);
  assert.equal(B.attempt(s, "1.1.1.1", t).allowed, false);
  assert.equal(B.attempt(s, "2.2.2.2", t).allowed, true);
  assert.equal(B.attempt(s, "1.1.1.1", t + 3600001).allowed, true); // hourly window reset

  const a = B.acquire(s, false, t, "a");
  assert.equal(a.status, "ok");
  assert.equal(B.busy(s, t), true);
  assert.equal(B.acquire(s, false, t, "b").status, "busy");
  B.release(s, "wrong");
  assert.equal(B.busy(s, t), true);
  B.release(s, "a");
  assert.equal(B.busy(s, t), false);

  // A killed invocation cannot hold the slot forever.
  assert.equal(B.acquire(s, false, t, "c").status, "ok");
  assert.equal(B.busy(s, t + 11 * 60000), true);
  assert.equal(B.busy(s, t + 13 * 60000), false);

  // Global cap of 20 batches per hourly window.
  const g = B.fresh();
  for (let i = 0; i < 20; i++) {
    assert.equal(B.acquire(g, false, t, `x${i}`).status, "ok");
    B.release(g, `x${i}`);
  }
  assert.equal(B.acquire(g, false, t, "y").status, "busy");
});

test("rejected public reservations do not consume the batch slot; state survives JSON round trip", () => {
  const s = B.fresh();
  const t = Date.parse("2026-11-12T12:00:00Z");
  assert.equal(B.acquire(s, true, t, "a").status, "ok");
  B.release(s, "a");
  const second = B.acquire(s, true, t + 1000, "b");
  assert.equal(second.status, "limited");
  assert.equal(s.active, null);
  assert.equal(second.reservation.retry_after, 59);
  const restored = structuredClone(JSON.parse(JSON.stringify(s)));
  assert.equal(B.acquire(restored, true, t + 61000, "c").status, "ok");
});
