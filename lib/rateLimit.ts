const requests = new Map<string, { count: number; lastRequest: number }>();

export function rateLimit(key: string, limit = 5, windowMs = 10000) {
  const now = Date.now();

  const entry = requests.get(key);

  if (!entry) {
    requests.set(key, { count: 1, lastRequest: now });
    return true;
  }

  // reset window
  if (now - entry.lastRequest > windowMs) {
    requests.set(key, { count: 1, lastRequest: now });
    return true;
  }

  // increment
  entry.count++;

  if (entry.count > limit) {
    return false;
  }

  return true;
}