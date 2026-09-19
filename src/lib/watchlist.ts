const KEY = "parqo:watchlist";

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function write(ids: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable (private mode etc.) — watching just won't persist.
  }
}

export function getWatchlist(): Set<string> {
  return read();
}

export function toggleWatch(spotId: string): Set<string> {
  const ids = read();
  if (ids.has(spotId)) ids.delete(spotId);
  else ids.add(spotId);
  write(ids);
  return ids;
}
