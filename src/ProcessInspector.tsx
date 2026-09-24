import { HealthCheck } from './HealthCheck';
import { restartDiagnosis } from './diagnosis';
import React, { useEffect, useRef } from 'react';
import { ArrowUpRight, Boxes, Copy, Database, Square, Terminal, X } from 'lucide-react';
import type { Listener } from './shared';
import { canRequestStop, systemBadge } from './process-policy';
import { identity, inspectLabel, openTarget } from './explorer';

type Action = (type: 'copy'|'open'|'stop'|'project', listener: Listener, field?: 'pid'|'port'|'projectPath') => Promise<void>;

const memory = (value: number|null) => value === null ? '—' : value < 1048576 ? `${(value / 1024).toFixed(0)} KB` : `${(value / 1048576).toFixed(1)} MB`;
const cpu = (value: number|null) => value === null ? '—' : `${value.toFixed(1)}%`;
const time = (value: string|null) => value ? new Date(value).toLocaleString() : 'Unavailable';
const icon = (listener: Listener) => listener.category === 'database' ? <Database size={22}/> : listener.category === 'container' ? <Boxes size={22}/> : <Terminal size={22}/>;

export function ProcessInspector({ row, all, selected, acting, close, select, action, previousTarget }: {
  previousTarget?:Listener; row: Listener; all: Listener[]; selected: string; acting: boolean;
  close: () => void; select: (id: string) => void; action: Action;
}) {
  const diagnosis=restartDiagnosis(row,previousTarget);
  const dialog=useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const target = openTarget(row);
  const bindings = all.filter(l => l.pid === row.pid && l.port === row.port && l.protocol === row.protocol);
  const related = all.filter(l => l.pid === row.pid && (l.port !== row.port || l.protocol !== row.protocol));
  useEffect(() => {
    const previous = document.body.style.overflow;
    const previouslyFocused=document.activeElement as HTMLElement|null;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    return () => { document.body.style.overflow = previous; previouslyFocused?.focus(); };
  }, []);

  return <div className="inspector-shade" onMouseDown={event => {
    if (event.target === event.currentTarget) close();
  }}>
    <section ref={dialog} onKeyDown={event=>{
      if(event.key!=='Tab')return;
      const buttons=Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex="0"]'));
      const first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }} className="inspector-dialog" role="dialog" aria-modal="true" aria-label="Process details">
      <header className="inspector-header">
        <span>PROCESS INSPECTOR</span>
        <button ref={closeButton} className="icon-button" aria-label="Close details" onClick={close}><X size={19}/></button>
      </header>
      <div className="inspector-scroll">
        <div className="inspector-hero">
          <span className={`service-icon inspector-icon ${row.category}`}>{icon(row)}</span>
          <div className="inspector-identity">
            <div className="inspector-title-line"><h2>{row.service}</h2>{systemBadge(row) && <span className="system-badge">{systemBadge(row)}</span>}</div>
            <p>{row.name} <span className={`protocol ${row.protocol.toLowerCase()}`}>{row.protocol}</span></p>
          </div>
          <div className="inspector-port">:{row.port}<button className="icon-button" aria-label={`Copy port ${row.port}`} onClick={() => action('copy', row)}><Copy size={17}/></button></div>
          <div className="inspector-actions">
            <button className="primary" disabled={acting || !target.url} aria-describedby="open-reason" onClick={() => action('open', row)}>Open localhost <ArrowUpRight size={16}/></button>
            <button className="secondary" aria-label={`Copy PID ${row.pid}`} onClick={() => action('copy', row, 'pid')}><Copy size={15}/> PID</button>
            <p id="open-reason">{target.reason || 'HTTP/HTTPS candidate inferred from service or port; availability is not verified.'}</p>
          </div>
        </div>

        <div className="inspector-columns">
          <div>
            <section className="inspector-section bindings">
              <h3>Bindings for :{row.port} · {row.protocol}</h3>
              <div>{bindings.map(listener => <button key={identity(listener)} aria-label={`Inspect binding ${listener.address}, ${listener.protocol} port ${listener.port}`} aria-pressed={identity(listener) === selected} onClick={() => select(identity(listener))}>{listener.address}<small>{listener.scope}</small></button>)}</div>
            </section>
            <section className="inspector-section provenance">
              <h3>Project & launch origin</h3>
              <dl>
                <div><dt>Project (inferred)</dt><dd>{row.provenance.project?.name || 'Unknown'}</dd></div>
                <div><dt>Project directory</dt><dd>{row.provenance.project?.directory || 'Unavailable'}{row.provenance.project && <div className="project-actions"><button className="secondary" disabled={acting} onClick={() => action('project', row)}>Open folder <ArrowUpRight size={14}/></button><button className="secondary" disabled={acting} onClick={() => action('copy', row, 'projectPath')}><Copy size={14}/> Copy path</button></div>}</dd></div>
                <div><dt>Evidence</dt><dd>{row.provenance.project?.evidence || 'No accessible project marker found in available paths.'}</dd></div>
                <div><dt>Launch source</dt><dd>{row.provenance.source || 'Unknown'}</dd></div>
                <div><dt>Parent process</dt><dd>{row.provenance.parent ? `${row.provenance.parent.name} · PID ${row.provenance.parent.pid}` : 'Unavailable or exited'}</dd></div>
              </dl>
              {row.provenance.ancestors.length > 0 && <><h3>Parent chain · nearest first</h3><ol>{row.provenance.ancestors.map(parent => <li key={parent.pid}>{parent.name} <small>PID {parent.pid}</small></li>)}</ol></>}
              <p>Project ownership is inferred from local paths. Launch source describes observed ancestors, not a complete launch history.</p>
            </section>
          </div>

          <div>
            <section className="inspector-section process-facts">
              <h3>Process details</h3>
              <dl>{[
                ['Process ID', row.pid], ['Bind address', row.address], ['Scope', row.scope],
                ['Started', time(row.started)], ['CPU', cpu(row.cpu)], ['Memory (RSS)', memory(row.memory)],
                ['Recognition', row.confidence === 'process' ? 'Process / command signature' : row.confidence === 'port hint' ? 'Port hint · not verified' : 'No known signature']
              ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            </section>
            <section className="inspector-section related">
              <h3>Other sockets in this process</h3>
              <div>{related.map(listener => <button key={identity(listener)} aria-label={inspectLabel(listener)} onClick={() => select(identity(listener))}>:{listener.port} <small>{listener.protocol} · {listener.address}</small></button>)}{related.length === 0 && <p>No other sockets.</p>}</div>
            </section>
            <HealthCheck key={identity(row)} row={row}/>
            <section className="inspector-section restart-diagnosis"><h3>Why might this come back?</h3><strong>{diagnosis.title}</strong><p>{diagnosis.detail}</p><p className="diagnosis-next">{diagnosis.next}</p></section>
            <section className="inspector-section stop-area">
              <p>Stopping a process closes all of its ports.</p>
              <button className="danger" disabled={!canRequestStop(row) || acting} onClick={() => action('stop', row)}><Square size={14}/> Stop process</button>
              {!canRequestStop(row) && <small>{row.stopReason || 'Process identity could not be verified. Stopping is disabled.'}</small>}
            </section>
          </div>
        </div>
      </div>
    </section>
  </div>;
}
