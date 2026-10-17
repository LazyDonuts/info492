// Store only the team access token, scoped to an explicitly validated backend.
export function teamTokenStorage(getStorage, origin) {
  const key = `info492.demo2.team-access.v1:${new URL(origin).origin}`;
  return {
    load() {
      try {
        const saved = JSON.parse(getStorage().getItem(key) || "null");
        return { available: true, remember: saved?.remember !== false,
          token: saved?.remember === true && typeof saved.token === "string" ? saved.token : "" };
      } catch {
        return { available: false, remember: false, token: "" };
      }
    },
    save(token, remember) {
      try {
        getStorage().setItem(key, JSON.stringify({ remember, token: remember ? token.trim() : "" }));
        return true;
      } catch { return false; }
    },
    forget() {
      // Preserve the opt-out across reloads, with no credential retained.
      return this.save("", false);
    },
  };
}
