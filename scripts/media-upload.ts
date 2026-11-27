// Uploads the local media folder (data/media) to object storage: once when switching an install to S3/R2, or to repair
// a bucket. Only files the bucket lacks, or has older or of another size, are sent.
// Usage:  npm run media:upload        (S3_* env vars as for the app; see src/server/adapters/media/storage.ts)
import { storage } from '@/server/adapters/media/storage';

async function main() {
  if (!storage.enabled) throw new Error('S3_BUCKET is not set: nothing to upload to.');
  const n = await storage.push('');
  console.log(`uploaded ${n} files`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
