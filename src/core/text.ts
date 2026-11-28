/** Lower-case and strip Vietnamese diacritics, so "cuu dan" finds "Cứu dân" and "na tra" finds "Na Tra". */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}
