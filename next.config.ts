import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The app only enqueues work; rendering happens in the worker. These stay out of the Next bundle.
  serverExternalPackages: ['@remotion/bundler', '@remotion/renderer', 'esbuild'],
  devIndicators: false,
};

export default nextConfig;
