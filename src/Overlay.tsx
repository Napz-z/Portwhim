import React, { useEffect, useRef } from 'react';
import { motion, useIsPresent } from 'motion/react';
import { X } from 'lucide-react';
import { gentleSpring, useMotionSettings } from './Motion';

export function Overlay({ title, close, children, sheet = false }: { title: string; close: () => void; children: React.ReactNode; sheet?: boolean }) {
  const dialog = useRef<HTMLElement>(null);
  const present = useIsPresent();
  const { reduced } = useMotionSettings();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLButtonElement>('[aria-label="Close panel"]')?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <motion.div className={`utility-shade ${sheet ? 'sheet-shade' : ''}`} variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }} transition={{ duration: reduced ? 0 : .22 }} style={{ pointerEvents: present ? 'auto' : 'none' }} onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
    <motion.section ref={dialog} role="dialog" aria-modal="true" aria-label={title} className={`utility-dialog ${sheet ? 'utility-sheet' : ''}`} inert={!present} variants={{ closed: { opacity: 0, x: reduced ? 0 : sheet ? 64 : 0, y: reduced || sheet ? 0 : 26, scale: reduced || sheet ? 1 : .95 }, open: { opacity: 1, x: 0, y: 0, scale: 1 } }} transition={reduced ? { duration: 0 } : gentleSpring} onKeyDown={e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key !== 'Tab') return;
      const items = Array.from(dialog.current!.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),input:not(:disabled),[tabindex="0"]')).filter(el => el.getClientRects().length && !el.closest('[inert]'));
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }}>
      <header className="utility-header"><div><span>YOUR WORKSPACE</span><h2>{title}</h2></div><button className="icon-button" aria-label="Close panel" onClick={close}><X size={19}/></button></header>
      <div className="utility-body">{children}</div>
    </motion.section>
  </motion.div>;
}
