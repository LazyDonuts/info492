import { DurableObject } from "cloudflare:workers";
import * as B from "./budgets.js";

// One global instance holds the shared counters. Its operations only await
// storage writes, so they execute one at a time (no races between isolates).
async function run(self, fn) {
  const out = fn(self.limits, Date.now());
  await self.ctx.storage.put("state", self.limits);
  return out;
}

export class Limits extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.limits = (await ctx.storage.get("state")) ?? B.fresh();
    });
  }
  attempt(address) { return run(this, (s, n) => B.attempt(s, address, n)); }
  busy() { return run(this, (s, n) => B.busy(s, n)); }
  acquire(publicDemo) { return run(this, (s, n) => B.acquire(s, publicDemo, n, crypto.randomUUID())); }
  release(id) { return run(this, (s) => B.release(s, id)); }
  publicStatus() { return run(this, (s, n) => B.publicStatus(s, n)); }
  jevReserve(address) { return run(this, (s, n) => B.jevReserve(s, address, n)); }
}
