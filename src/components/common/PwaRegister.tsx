'use client';

import { useEffect } from 'react';

/** Registers the service worker in production builds only (in dev it fights with hot reload). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  }, []);
  return null;
}
