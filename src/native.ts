import { invoke, isTauri } from '@tauri-apps/api/core';
import type { Snapshot } from './shared';
if (isTauri()) window.portwhim = {
  scan: () => invoke<Snapshot>('scan'),
  copy: (id, field) => invoke('copy', { id, field }),
  open: id => invoke('open', { id }),
  stop: id => invoke('stop', { id })
};
