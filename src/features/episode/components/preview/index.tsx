'use client';

import dynamic from 'next/dynamic';

import { Skeleton } from '@/components/ui/skeleton';

const box = (ratio: string) =>
  function Loading() {
    return <Skeleton className="w-full rounded-lg" style={{ aspectRatio: ratio }} />;
  };

export const StoryboardPlayer = dynamic(() => import('./players').then((m) => m.StoryboardPlayer), { ssr: false, loading: box('16 / 9') });
export const ScenePlayer = dynamic(() => import('./players').then((m) => m.ScenePlayer), { ssr: false, loading: box('16 / 9') });
export const SceneThumbnail = dynamic(() => import('./players').then((m) => m.SceneThumbnail), { ssr: false, loading: box('16 / 9') });
