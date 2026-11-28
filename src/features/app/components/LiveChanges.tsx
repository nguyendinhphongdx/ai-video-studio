'use client';

import { useLiveChanges } from '../hooks/use-live-changes';

/** Mounts the tab's live connection; renders nothing. */
export function LiveChanges() {
  useLiveChanges();
  return null;
}
