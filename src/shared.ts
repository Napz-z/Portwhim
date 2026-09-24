export interface Provenance {
  project:{name:string;directory:string;marker:string;evidence:string;inferred:boolean;git?:{root:string;branch:string;worktree:boolean}|null}|null;
  parent:{pid:number;name:string}|null;
  ancestors:{pid:number;name:string}[];
  source:string|null;
  manager?:string|null;
}
export interface Listener {
  id: string; pid: number; name: string; port: number; protocol: 'TCP'|'UDP'; address: string;
  started: string|null; cpu: number|null; memory: number|null;
  service: string; confidence: 'process'|'port hint'|'unknown'; category: 'app'|'database'|'container'|'system';
  scope: 'loopback'|'all interfaces'|'network'; systemManaged: boolean; canStop: boolean; stopReason:string|null; provenance:Provenance;
}
export interface Snapshot { listeners: Listener[]; scannedAt: string; hostname: string; platform: string; warnings: string[]; }
export interface HealthReport { url:string; connected:boolean; status:number|null; elapsedMs:number; message:string; checkedAt:string }
export interface WatchAlert { port:number; protocol:string; message:string; at:string }
export interface WatchStatus { alerts:WatchAlert[]; error:string|null; notificationError?:string|null; scannedAt:string|null }
export interface PortwhimAPI {
  checkHealth?(id:string,scheme:'http'|'https'):Promise<HealthReport>;
  requestNotificationPermission?():Promise<boolean>;
  configureWatch?(favorites:{port:number;protocol:string;label:string;watch?:boolean}[]):Promise<void>;
  watchStatus?():Promise<WatchStatus>;
  scan(): Promise<Snapshot>;
  open(id: string): Promise<void>;
  openProject(id: string): Promise<void>;
  copy(id: string, field:'pid'|'port'|'projectPath'): Promise<void>;
  stop(id: string): Promise<{cancelled?:boolean; message?:string}>;
}
declare global { interface Window { portwhim?: PortwhimAPI } }
