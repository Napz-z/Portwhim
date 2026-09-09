import type { Listener } from './shared';

export function matchesOwnership(l: Listener, filter: string): boolean {
  if (filter === 'system') return l.systemManaged;
  if (filter === 'dev') return !l.systemManaged && l.category !== 'system';
  if (filter === 'network') return l.scope !== 'loopback';
  return filter === 'all';
}

export function systemBadge(l: Listener): string | null {
  return l.systemManaged ? 'System managed' : null;
}

export function canRequestStop(l: Listener): boolean {
  return l.canStop && !l.systemManaged && l.pid > 4 && !!l.started;
}
