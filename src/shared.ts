export interface Provenance {
  project:{name:string;directory:string;marker:string;evidence:string;inferred:boolean}|null;
  parent:{pid:number;name:string}|null;
  ancestors:{pid:number;name:string}[];
  source:string|null;
}
export interface Listener {
  id: string; pid: number; name: string; port: number; protocol: 'TCP'|'UDP'; address: string;
  started: string|null; cpu: number|null; memory: number|null;
  service: string; confidence: 'process'|'port hint'|'unknown'; category: 'app'|'database'|'container'|'system';
  scope: 'loopback'|'all interfaces'|'network'; canStop: boolean; provenance:Provenance;
}
export interface Snapshot { listeners: Listener[]; scannedAt: string; hostname: string; platform: string; warnings: string[]; }
export interface PortwhimAPI {
  scan(): Promise<Snapshot>;
  open(id: string): Promise<void>;
  copy(id: string, field:'pid'|'port'): Promise<void>;
  stop(id: string): Promise<{cancelled?:boolean; message?:string}>;
}
declare global { interface Window { portwhim?: PortwhimAPI } }
