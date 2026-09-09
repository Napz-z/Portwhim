import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Listener } from './shared';
import { identity, inspectLabel, socketGroups, visibleGroups } from './explorer';

export function ProcessCard({ listeners, title, select }: {
  listeners: Listener[]; title: React.ReactNode; select: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const groups = socketGroups(listeners);
  const { visible, remaining } = visibleGroups(groups, expanded);
  return <article className="map-card" aria-label={`Process ${listeners[0].name}, PID ${listeners[0].pid}`}>
    {title}
    <div className="socket-branches" id={`sockets-${listeners[0].pid}`}>
      {visible.map(group => <button key={group.key}
        aria-label={`${inspectLabel(group.bindings[0])}, ${group.bindings.length} ${group.bindings.length === 1 ? 'binding' : 'bindings'}`}
        onClick={() => select(identity(group.bindings[0]))}>
        <span className="dot"/><strong>:{group.port}</strong><small>{group.protocol}</small>
        <span className="binding-count">{group.bindings.length} {group.bindings.length === 1 ? 'binding' : 'bindings'}</span><ArrowUpRight size={13}/>
      </button>)}
    </div>
    {remaining > 0 && <button className="expand-sockets" aria-expanded={expanded}
      aria-controls={`sockets-${listeners[0].pid}`} onClick={() => setExpanded(!expanded)}>
      {expanded ? 'Show less' : `+${remaining} more`}
    </button>}
  </article>;
}
