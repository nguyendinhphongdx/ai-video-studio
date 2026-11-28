import { VOICES, voiceReady, type VoiceId } from '@/core/domain/catalog';

export interface VoiceOption {
  id: VoiceId;
  name: string;
  /** "nữ, miền Bắc" */
  traits: string;
  gender: 'nữ' | 'nam';
  /** Edge voices cost nothing; Google voices cost a little per line. */
  free: boolean;
  ready: boolean;
  /** Why it cannot be played, when it cannot. */
  reason: string | null;
}

export interface VoiceGroup {
  key: 'edge' | 'google';
  label: string;
  voices: VoiceOption[];
}

/** Splits "Hoài My (nữ, miền Bắc) · Edge, miễn phí, giọng máy" into its parts. */
const parse = (id: VoiceId): Pick<VoiceOption, 'name' | 'traits' | 'gender'> => {
  const m = /^(.*?) \((.*?)\)/.exec(VOICES[id]);
  const traits = m?.[2] ?? '';
  return { name: m?.[1] ?? id, traits, gender: traits.startsWith('nam') ? 'nam' : 'nữ' };
};

/** The voices grouped by who speaks them (Edge, free; Google, paid), each marked playable or not with the reason. */
export function groupVoices(has: { tts: boolean; ttsGoogle: boolean } | undefined): VoiceGroup[] {
  const ids = Object.keys(VOICES) as VoiceId[];
  const option = (id: VoiceId): VoiceOption => {
    const google = id.startsWith('gemini-');
    // Until the machine's capabilities are known, nothing is claimed to be missing.
    const ready = has ? voiceReady(id, has) : true;
    return { id, ...parse(id), free: !google, ready, reason: ready ? null : google ? 'Chưa có Google API key (nhập ở Cài đặt)' : 'Chưa cài edge-tts trên máy này' };
  };
  const all = ids.map(option);
  return [
    { key: 'edge', label: 'Edge · miễn phí, giọng máy', voices: all.filter((v) => v.free) },
    { key: 'google', label: 'Google · tính phí theo lời đọc', voices: all.filter((v) => !v.free) },
  ];
}

/** What to read for a sample: the first sentence of the description, else a fixed greeting. */
export function sampleLine(description: string): string {
  const first = description.trim().split(/(?<=[.!?。])\s+/)[0] ?? '';
  return first.length >= 8 ? first.slice(0, 160) : 'Xin chào, đây là giọng đọc của dự án. Bạn thấy giọng này thế nào?';
}
