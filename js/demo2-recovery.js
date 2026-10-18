// Development recovery is scoped to this tab and backend. No credentials stored.
export function snapshotStore(getStorage, origin, now = Date.now) {
  const key = `info492.demo2.workspace.v1:${origin}`;
  return {
    save(value) {
      try {
        const text = JSON.stringify({version:1, saved:now(), value});
        if (text.length > 3000000) return false;
        getStorage().setItem(key,text); return true;
      } catch { return false; }
    },
    load() {
      try {
        const x=JSON.parse(getStorage().getItem(key)||'null');
        if (!x || x.version!==1 || now()-x.saved>86400000) return null;
        return x.value;
      } catch { return null; }
    },
    clear() { try { getStorage().removeItem(key); return true; } catch { return false; } },
  };
}
export function mergeRetry(previous, retry) {
  if (previous.metadata.config_hash !== retry.metadata.config_hash)
    throw new Error('Cannot merge retries across model/prompt configurations. Start a new analysis.');
  const failed = new Set(previous.results.filter(r=>r.assessment_state==='processing_error').map(r=>r.rfi_id));
  const replacements = new Map();
  for(const r of retry.results) {
    if(!failed.has(r.rfi_id) || replacements.has(r.rfi_id)) throw new Error('Retry must contain only unique failed records.');
    replacements.set(r.rfi_id, {...r, source_run_id:retry.run_id});
  }
  return {...previous, completed_at:retry.completed_at,
    retry_history:[...(previous.retry_history||[]),retry],
    results:previous.results.map(r=>replacements.get(r.rfi_id)||r),
    received_count:previous.results.filter(r=>!(replacements.get(r.rfi_id)||r).not_attempted).length,
  };
}
