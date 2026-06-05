// Local favorites storage. Persists a Set of player ids (string for static
// roster, "mlb:<id>" for live MLB players from the Stats API).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'diamondstats:favorites:v1';

let inMemory: Set<string> | null = null;
const listeners = new Set<(favs: Set<string>) => void>();

async function load(): Promise<Set<string>> {
  if (inMemory) return inMemory;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      inMemory = new Set(arr);
    } else {
      inMemory = new Set();
    }
  } catch {
    inMemory = new Set();
  }
  return inMemory;
}

async function persist(set: Set<string>) {
  inMemory = set;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(Array.from(set)));
  } catch {
    // best-effort; AsyncStorage failures are non-fatal for this UI
  }
  listeners.forEach((fn) => fn(set));
}

export function useFavorites() {
  const [favs, setFavs] = useState<Set<string>>(() => inMemory ?? new Set());
  const [loaded, setLoaded] = useState(inMemory !== null);

  useEffect(() => {
    let cancelled = false;
    load().then((s) => {
      if (cancelled) return;
      setFavs(new Set(s));
      setLoaded(true);
    });
    const listener = (s: Set<string>) => setFavs(new Set(s));
    listeners.add(listener);
    return () => {
      cancelled = true;
      listeners.delete(listener);
    };
  }, []);

  const toggle = useCallback(async (id: string) => {
    const current = await load();
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    await persist(next);
  }, []);

  const isFavorite = useCallback((id: string) => favs.has(id), [favs]);

  return { favs, isFavorite, toggle, loaded };
}
