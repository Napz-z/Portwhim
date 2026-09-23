import type { Listener } from './shared';

export interface Filters { query: string; protocol: string; filter: string }
export function queryPort(query: string): number | null {
  const text = query.trim();
  const direct = /^:?(\d{1,5})$/.exec(text);
  let value = direct?.[1];
  if (!value) {
    try {
      const url = new URL(text.includes('://') ? text : `http://${text}`);
      if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return null;
      value = url.port || (text.includes('://') ? (url.protocol === 'https:' ? '443' : url.protocol === 'http:' ? '80' : '') : '');
    } catch { return null; }
  }
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port <= 65535 ? port : null;
}
export function matchesQuery(l: Listener, query: string): boolean {
  const port = queryPort(query);
  if (port !== null) return l.port === port;
  const text = query.trim().toLowerCase();
  if (/^pid:\d+$/.test(text)) return l.pid === Number(text.slice(4));
  return `${l.port} ${l.pid} ${l.name} ${l.service} ${l.address} ${l.provenance.project?.name || ''} ${l.provenance.project?.directory || ''}`.toLowerCase().includes(text);
}
export function clearSearch(state: Filters): Filters { return { ...state, query: '' }; }
export function resetFilters(): Filters { return { query: '', protocol: 'all', filter: 'all' }; }
export function hasFilters(state: Filters): boolean {
  return state.query !== '' || state.protocol !== 'all' || state.filter !== 'all';
}
export function identity(l: Listener): string { return `${l.pid}:${l.started ?? 'unknown'}:${l.protocol}:${l.address}:${l.port}`; }
export function sameProcess(a: Pick<Listener, 'pid'|'started'>, b: Pick<Listener, 'pid'|'started'>): boolean {
  return a.pid === b.pid && a.started === b.started;
}
export function stopFeedback(target: Listener, listeners: Listener[]): { complete: boolean; message: string } {
  if (listeners.some(l => sameProcess(l, target))) {
    return { complete: false, message: `Stop sent, but PID ${target.pid} still has listening sockets. Refresh to check again.` };
  }
  const replacement = listeners.find(l => l.protocol === target.protocol && l.port === target.port);
  if (replacement) {
    return { complete: true, message: `${target.service} no longer appears, but ${target.protocol} :${target.port} is occupied by ${replacement.name} (PID ${replacement.pid}).` };
  }
  return { complete: true, message: `No ${target.protocol} listener observed on :${target.port} in this scan. Binding availability is not guaranteed.` };
}
export function inspectLabel(l: Listener): string {
  return `Inspect ${l.name}, PID ${l.pid}, ${l.protocol} port ${l.port} at ${l.address}`;
}
export interface SocketGroup { key: string; port: number; protocol: string; bindings: Listener[] }
export function socketGroups(listeners: Listener[]): SocketGroup[] {
  const groups = new Map<string, SocketGroup>();
  for (const l of listeners) {
    const key = `${l.pid}:${l.protocol}:${l.port}`;
    let group = groups.get(key);
    if (!group) { group = { key, port: l.port, protocol: l.protocol, bindings: [] }; groups.set(key, group); }
    if (!group.bindings.some(b => b.address === l.address)) group.bindings.push(l);
  }
  return [...groups.values()];
}
export function visibleGroups(groups: SocketGroup[], expanded: boolean) {
  return { visible: expanded ? groups : groups.slice(0, 6), remaining: Math.max(0, groups.length - 6) };
}
export function sortListeners(listeners: Listener[], sort: 'port'|'memory'): Listener[] {
  return [...listeners].sort((a, b) =>
    (sort === 'memory' ? (b.memory ?? -1) - (a.memory ?? -1) : 0) ||
    a.port - b.port || a.pid - b.pid || a.protocol.localeCompare(b.protocol) || a.address.localeCompare(b.address));
}

// Keep aligned with the backend using tests/open-cases.json. These are candidates,
// not a network probe; generic runtimes and arbitrary development ports are insufficient.
export function openTarget(l: Pick<Listener, 'protocol'|'port'|'address'|'category'|'service'|'confidence'>): { url: string|null; reason: string|null } {
  const denied = (reason: string) => ({ url: null, reason });
  if (l.protocol !== 'TCP') return denied('UDP cannot be opened in a browser.');
  if (l.category === 'database' || [21,22,23,25,53,110,135,139,143,445,465,587,993,995,1433,1521,3306,3389,5432,5672,6379,27017].includes(l.port))
    return denied('This service is not an HTTP browser candidate.');
  if (!['0.0.0.0', '::', '::1'].includes(l.address) && !/^127\.\d+\.\d+\.\d+$/.test(l.address))
    return denied('This binding does not listen on localhost.');
  const webService = l.confidence === 'process' && ['Vite', 'Next.js', 'Laravel'].includes(l.service);
  if (![80,443,8080,8443].includes(l.port) && !webService)
    return denied('No reliable HTTP or HTTPS hint for this port.');
  const scheme = [443,8443].includes(l.port) ? 'https' : 'http';
  const host = l.address.includes(':') ? '[::1]' : l.address === '0.0.0.0' ? '127.0.0.1' : l.address;
  return { url: `${scheme}://${host}:${l.port}`, reason: null };
}
