// Pure, JSON-serializable port of the in-memory limits in server/index.js and
// server/public-demo.js. The Durable Object persists this state so the limits
// are shared by every Worker isolate (Workers memory is not shared).
const HOUR = 3600000;
const DAY = 86400000;
// A batch can legitimately run ~10 minutes (10 items x 13 s pacing + 45 s timeouts).
// If an invocation is killed without releasing, the slot frees itself after this.
const LEASE = 12 * 60000;

export const fresh = () => ({
  windowStart: 0,
  globalCount: 0,
  attempts: {},
  active: null,
  pub: { day: "", daily: 0, starts: [], last: null },
  jev: {},
});

// Per-IP attempts/hour (15) and global batches/hour (20), counted before auth, as before.
export function attempt(s, address, now) {
  if (!s.windowStart || now - s.windowStart > HOUR) {
    s.windowStart = now;
    s.globalCount = 0;
    s.attempts = {};
  }
  const key = `ip:${address}`;
  const count = s.attempts[key] ?? 0;
  if (count >= 15) return { allowed: false };
  s.attempts[key] = count + 1;
  return { allowed: true };
}

export function busy(s, now) {
  if (s.active && now - s.active.since > LEASE) s.active = null;
  return s.globalCount >= 20 || s.active !== null;
}

export function publicStatus(s, now) {
  const p = s.pub;
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== p.day) {
    p.day = today;
    p.daily = 0;
  }
  p.starts = p.starts.filter((t) => now - t < HOUR);
  return {
    daily_batch_limit: 10,
    hourly_batch_limit: 3,
    min_batch_interval_seconds: 60,
    daily_batches_remaining: Math.max(0, 10 - p.daily),
    hourly_batches_remaining: Math.max(0, 3 - p.starts.length),
    resets_at: new Date(Date.parse(`${p.day}T00:00:00Z`) + DAY).toISOString(),
    counter_scope: "single_durable_object_persisted",
  };
}

export function publicReserve(s, now) {
  const st = publicStatus(s, now);
  const p = s.pub;
  let retry = 0;
  let error = "";
  if (!st.daily_batches_remaining) {
    retry = Math.ceil((Date.parse(st.resets_at) - now) / 1000);
    error = "Daily public demo allowance reached. Keep your inputs and try after the UTC day resets.";
  } else if (!st.hourly_batches_remaining) {
    retry = Math.ceil((p.starts[0] + HOUR - now) / 1000);
    error = "Hourly public demo allowance reached. Keep your inputs and try later.";
  } else if (p.last !== null && now - p.last < 60000) {
    retry = Math.ceil((60000 - now + p.last) / 1000);
    error = "Please wait at least one minute between public demo batches.";
  }
  if (error) return { allowed: false, retry_after: Math.max(1, retry), error };
  p.daily++;
  p.starts.push(now);
  p.last = now;
  return { allowed: true };
}

// Atomically re-check capacity, spend public allowance, then take the batch slot.
export function acquire(s, publicDemo, now, id) {
  if (busy(s, now)) return { status: "busy" };
  if (publicDemo) {
    const reservation = publicReserve(s, now);
    if (!reservation.allowed) return { status: "limited", reservation };
  }
  s.active = { id, since: now };
  s.globalCount++;
  return { status: "ok", id };
}

export function release(s, id) {
  if (s.active && s.active.id === id) s.active = null;
}

export function jevReserve(s, address, now) {
  const day = new Date(now).toISOString().slice(0, 10);
  const keys = Object.keys(s.jev);
  if (keys.length > 5000)
    for (const k of keys) if (s.jev[k].day !== day && !s.jev[k].hourly.some((t) => now - t < HOUR)) delete s.jev[k];
  const key = `ip:${address}`;
  const bucket = s.jev[key] || { day, daily: 0, hourly: [] };
  if (bucket.day !== day) {
    bucket.day = day;
    bucket.daily = 0;
  }
  bucket.hourly = bucket.hourly.filter((t) => now - t < HOUR);
  if (bucket.daily >= 250)
    return { allowed: false, retry_after: Math.ceil((Date.parse(`${day}T00:00:00Z`) + DAY - now) / 1000) };
  if (bucket.hourly.length >= 50)
    return { allowed: false, retry_after: Math.ceil((bucket.hourly[0] + HOUR - now) / 1000) };
  bucket.daily++;
  bucket.hourly.push(now);
  s.jev[key] = bucket;
  return { allowed: true };
}
