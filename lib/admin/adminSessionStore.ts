const activeSessions = new Set<string>();

export function createSession(token: string) {
  activeSessions.add(token);
}

export function isSessionValid(token: string) {
  return activeSessions.has(token);
}

export function deleteSession(token: string) {
  activeSessions.delete(token);
}

export function clearAllSessions() {
  activeSessions.clear();
}

// 🔥 placeholder لمرحلة Redis (مش مستخدم حالياً)
export async function createSessionPersistent(token: string) {
  // TODO: store in Redis later
  createSession(token);
}

export async function isSessionValidPersistent(token: string) {
  // TODO: check Redis later
  return isSessionValid(token);
}