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