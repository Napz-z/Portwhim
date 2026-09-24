import React, { createContext, useContext, useState } from 'react';
import { MotionConfig, useReducedMotion } from 'motion/react';

export const spring = { type: 'spring' as const, stiffness: 380, damping: 34, mass: 1 };
export const gentleSpring = { type: 'spring' as const, stiffness: 290, damping: 30, mass: 1 };
type Preference = 'system' | 'full' | 'reduced';
const MotionContext = createContext({ reduced: false, preference: 'system' as Preference, setPreference: (_value: Preference) => {} });
export const useMotionSettings = () => useContext(MotionContext);
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const systemReduced = useReducedMotion();
  const [preference, update] = useState<Preference>(() => {
    try { const value = localStorage.getItem('portwhim.motion.v1'); return value === 'full' || value === 'reduced' ? value : 'system'; } catch { return 'system'; }
  });
  const reduced = preference === 'reduced' || (preference === 'system' && !!systemReduced);
  const setPreference = (value: Preference) => { update(value); try { localStorage.setItem('portwhim.motion.v1', value); } catch { /* This session still uses the selected preference. */ } };
  return <MotionContext.Provider value={{ reduced, preference, setPreference }}><MotionConfig reducedMotion={reduced ? 'always' : 'never'} transition={reduced ? { duration: 0 } : spring}><div className="motion-root" data-motion={reduced ? 'reduced' : 'full'}>{children}</div></MotionConfig></MotionContext.Provider>;
}
export function MotionSettings() {
  const { preference, setPreference } = useMotionSettings();
  return <label className="motion-setting">Motion effects<select aria-label="Motion effects" value={preference} onChange={e => setPreference(e.target.value as Preference)}><option value="system">Follow system</option><option value="full">Full motion</option><option value="reduced">Reduced motion</option></select></label>;
}
