// Admin Session Store (In-Memory)
// Cesar Store
// Path: /lib/admin/adminSessionStore.ts
// =====================================================

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
