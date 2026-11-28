'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

/**
 * A titled group that folds away. The title side toggles it; `actions` sit on the right and stay usable while it is folded
 * (so "save" or "draw the missing ones" never hides with the content). `badge` is a short status such as "3/7".
 */
export function Section({ title, badge, actions, defaultOpen = true, flat, children }: { title: ReactNode; badge?: ReactNode; actions?: ReactNode; defaultOpen?: boolean; flat?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className={`sec${flat ? ' flat' : ''}`}>
      <div className="sec-head">
        <button type="button" className="sec-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          <ChevronDown size={18} className={open ? 'open' : undefined} aria-hidden />
          <h3>{title}</h3>
          {badge != null && <span className="chip">{badge}</span>}
        </button>
        {actions && <div className="sec-actions">{actions}</div>}
      </div>
      {open && (
        <div id={id} className="sec-body">
          {children}
        </div>
      )}
    </section>
  );
}
