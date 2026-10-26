import type { QualityCheck } from '../check';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const norm = (s: string) => s.toLowerCase().normalize('NFC');

const duration: QualityCheck = {
  id: 'duration',
  name: 'Thời lượng',
  stages: ['script', 'video'],
  run: ({ format, totalSeconds, stage }) => {
    const r = format.durationSec;
    if (!r) return [];
    if (totalSeconds > r.max) return [{ check: 'duration', level: 'warning', message: `${stage === 'script' ? 'Ước tính dài' : 'Dài'} ${fmt(totalSeconds)} (tối đa ${fmt(r.max)})` }];
    if (totalSeconds < r.min) return [{ check: 'duration', level: 'warning', message: `${stage === 'script' ? 'Ước tính ngắn' : 'Ngắn'} ${fmt(totalSeconds)} (tối thiểu ${fmt(r.min)})` }];
    return [];
  },
};

const slotCounts: QualityCheck = {
  id: 'slot-scenes',
  name: 'Số cảnh mỗi phần',
  stages: ['script'],
  run: ({ slots, scenes }) =>
    slots
      .filter((s) => s.fill === 'ai')
      .flatMap((s) => {
        const n = scenes.filter((x) => x.slotId === s.id).length;
        return n < s.scenes.min || n > s.scenes.max ? [{ check: 'slot-scenes', level: 'warning' as const, message: `Phần "${s.name}" có ${n} cảnh (cần ${s.scenes.min}-${s.scenes.max})` }] : [];
      }),
};

const catchphrases: QualityCheck = {
  id: 'catchphrases',
  name: 'Câu bắt buộc',
  stages: ['script'],
  run: ({ bible, scenes }) => {
    const all = norm(scenes.map((s) => s.narration).join(' '));
    return (bible?.catchphrases ?? []).filter((c) => !all.includes(norm(c))).map((c) => ({ check: 'catchphrases', level: 'warning' as const, message: `Thiếu câu bắt buộc: "${c}"` }));
  },
};

const avoid: QualityCheck = {
  id: 'avoid',
  name: 'Điều cấm',
  stages: ['script'],
  run: ({ bible, scenes }) =>
    (bible?.avoid ?? [])
      .filter((w) => w.trim().split(/\s+/).length <= 3)
      .flatMap((w) =>
        scenes
          .filter((s) => norm(`${s.narration} ${JSON.stringify(s.props)}`).includes(norm(w)))
          .map((s) => ({ check: 'avoid', level: 'error' as const, message: `Có từ bị cấm: "${w}"`, sceneId: s.id })),
      ),
};

const narrationLength: QualityCheck = {
  id: 'narration-length',
  name: 'Độ dài lời đọc',
  stages: ['script'],
  run: ({ scenes }) =>
    scenes
      .filter((s) => s.narration.split(/[.!?…]+/).filter((x) => x.trim()).length > 3)
      .map((s) => ({ check: 'narration-length', level: 'warning' as const, message: 'Lời đọc quá 3 câu', sceneId: s.id })),
};

/** Registered checks. Add a check here. */
export const QUALITY_CHECKS: QualityCheck[] = [duration, slotCounts, catchphrases, avoid, narrationLength];
