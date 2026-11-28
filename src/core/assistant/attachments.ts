// Files a person shows the assistant: what is accepted, and the type decided from the bytes (never from the claimed one).

export interface AssistantAttachment {
  /** Media-relative path, inside the conversation's own folder. */
  path: string;
  name: string;
  mime: string;
  size: number;
}

export const MAX_ATTACHMENTS = 5;
export const MAX_PICTURE_BYTES = 8 * 1024 * 1024;
/** Text goes into the prompt as is, so its limit is far lower than a picture's. */
export const MAX_TEXT_BYTES = 200 * 1024;
export const ATTACHMENT_ACCEPT = 'image/png,image/jpeg,image/webp,text/plain,text/markdown,.txt,.md';

export const isPicture = (mime: string) => mime.startsWith('image/');

const starts = (b: Uint8Array, at: number, sig: number[]) => sig.every((v, i) => b[at + i] === v);

export const TYPE_BY_EXT: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.txt': 'text/plain', '.md': 'text/markdown' };

/** The extension to store an accepted file under, or why it is refused (Vietnamese, shown to the person). */
export function checkAttachment(bytes: Uint8Array, name: string): { ext: string } | { error: string } {
  if (!bytes.length) return { error: 'Tệp trống.' };
  const picture = starts(bytes, 0, [0x89, 0x50, 0x4e, 0x47]) ? '.png' : starts(bytes, 0, [0xff, 0xd8, 0xff]) ? '.jpg' : starts(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && starts(bytes, 8, [0x57, 0x45, 0x42, 0x50]) ? '.webp' : null;
  if (picture) return bytes.length > MAX_PICTURE_BYTES ? { error: 'Ảnh tối đa 8MB.' } : { ext: picture };
  const text = /\.(txt|md)$/i.exec(name)?.[0].toLowerCase();
  if (!text || bytes.includes(0)) return { error: 'Chỉ nhận ảnh PNG, JPG, WEBP hoặc tệp chữ TXT, MD.' };
  return bytes.length > MAX_TEXT_BYTES ? { error: 'Tệp chữ tối đa 200KB.' } : { ext: text };
}
