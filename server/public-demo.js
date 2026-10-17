// Bounded, global limits for a single running demo instance. Provider quota is
// separate. These counters reset on process restart; this is not a billing cap.
export function publicDemoBudget(now = Date.now) {
  let day = '', daily = 0, starts = [], last = null;
  function status() {
    const current = now();
    const today = new Date(current).toISOString().slice(0, 10);
    if (today !== day) { day = today; daily = 0; }
    starts = starts.filter(start => current - start < 3600000);
    return {
      daily_batch_limit: 10, hourly_batch_limit: 3, min_batch_interval_seconds: 60,
      daily_batches_remaining: Math.max(0, 10 - daily),
      hourly_batches_remaining: Math.max(0, 3 - starts.length),
      resets_at: new Date(Date.parse(`${day}T00:00:00Z`) + 86400000).toISOString(),
      counter_scope: 'single_process_resets_on_restart',
    };
  }
  return {
    status,
    reserve() {
      const s = status(), current = now();
      let retry = 0, error = '';
      if (!s.daily_batches_remaining) {
        retry = Math.ceil((Date.parse(s.resets_at) - current) / 1000);
        error = 'Daily public demo allowance reached. Keep your inputs and try after the UTC day resets.';
      } else if (!s.hourly_batches_remaining) {
        retry = Math.ceil((starts[0] + 3600000 - current) / 1000);
        error = 'Hourly public demo allowance reached. Keep your inputs and try later.';
      } else if (last !== null && current - last < 60000) {
        retry = Math.ceil((60000 - current + last) / 1000);
        error = 'Please wait at least one minute between public demo batches.';
      }
      if (error) return { allowed: false, retry_after: Math.max(1, retry), error };
      daily++; starts.push(current); last = current;
      return { allowed: true };
    },
  };
}
