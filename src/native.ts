import { invoke, isTauri } from '@tauri-apps/api/core';
import type { Snapshot, HealthReport, WatchStatus } from './shared';
if (isTauri()) window.portwhim = {
  checkHealth: (id, scheme) => invoke<HealthReport>('check_health', {id, scheme}),
  requestNotificationPermission: () => invoke<boolean>('notification_permission'),
  configureWatch: favorites => invoke('watch_config', {favorites}),
  watchStatus: () => invoke<WatchStatus>('watch_status'),
  scan: () => invoke<Snapshot>('scan'),
  copy: (id, field) => invoke('copy', { id, field }),
  openProject: id => invoke('open_project', { id }),
  open: id => invoke('open', { id }),
  stop: id => invoke('stop', { id })
};
