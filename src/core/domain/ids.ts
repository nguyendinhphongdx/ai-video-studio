export const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

export function slugify(s: string): string {
  const slug = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return slug || 'video';
}
