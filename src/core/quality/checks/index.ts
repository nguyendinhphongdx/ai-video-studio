import type { QualityCheck, QualityIssue } from '../check';

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

/** Scenes of one block must keep changing the props the block lists in varyBy (e.g. the camera shot of a picture). */
const variety: QualityCheck = {
  id: 'variety',
  name: 'Đa dạng bố cục',
  stages: ['script'],
  run: ({ scenes, tools }) => {
    if (!tools) return [];
    const out: QualityIssue[] = [];
    const counts = new Map<string, number>();
    const total = new Map<string, number>();
    scenes.forEach((s, i) => {
      for (const key of tools.block(s.block)?.varyBy ?? []) {
        const value = String(s.props[key] ?? 'auto');
        const group = `${s.block}|${key}`;
        total.set(group, (total.get(group) ?? 0) + 1);
        counts.set(`${group}|${value}`, (counts.get(`${group}|${value}`) ?? 0) + 1);
        const prev = scenes[i - 1];
        if (prev && prev.block === s.block && String(prev.props[key] ?? 'auto') === value) out.push({ check: 'variety', level: 'warning', message: `Hai cảnh liền nhau cùng ${key} "${value}": đổi để bố cục không lặp`, sceneId: s.id });
      }
    });
    for (const [k, n] of counts) {
      const [block, key, value] = k.split('|') as [string, string, string];
      const all = total.get(`${block}|${key}`) ?? 0;
      if (value !== 'auto' && n >= 3 && n / all > 0.34) out.push({ check: 'variety', level: 'warning', message: `${key} "${value}" lặp ${n}/${all} cảnh: dùng thêm kiểu khác` });
    }
    return out;
  },
};

/** Narration is spoken aloud: it should have questions, a changing rhythm, and scenes that do not all open the same way. */
const spoken: QualityCheck = {
  id: 'spoken',
  name: 'Giọng kể tự nhiên',
  stages: ['script'],
  run: ({ scenes }) => {
    const told = scenes.filter((s) => !s.locked && s.narration.trim());
    if (told.length < 4) return [];
    const out: QualityIssue[] = [];
    const words = (s: string) => s.trim().split(/\s+/).length;
    if (!told.some((s) => s.narration.includes('?'))) out.push({ check: 'spoken', level: 'warning', message: 'Chưa có câu hỏi nào dẫn dắt người xem: lời đọc dễ nghe như bài tường thuật' });
    const shortLine = told.some((s) => s.narration.split(/[.!?…]+/).some((x) => x.trim() && words(x) <= 5));
    if (!shortLine) out.push({ check: 'spoken', level: 'warning', message: 'Mọi câu đều dài: thêm vài câu rất ngắn để có nhịp nói' });
    for (let i = 1; i < told.length; i++) {
      const open = (s: string) => s.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase();
      if (open(told[i]!.narration) === open(told[i - 1]!.narration)) out.push({ check: 'spoken', level: 'warning', message: `Hai cảnh liền nhau cùng mở bằng "${open(told[i]!.narration)}"`, sceneId: told[i]!.id });
    }
    return out;
  },
};

const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** What the finished file itself shows: black holes, long silences, clipping, a voice too quiet to follow. */
const avHealth: QualityCheck = {
  id: 'av-health',
  name: 'Hình và tiếng của video',
  stages: ['video'],
  run: ({ analysis, totalSeconds }) => {
    if (!analysis) return [];
    const out: QualityIssue[] = [];
    // A fade at the very start or end is normal; black in the middle is a broken scene.
    for (const b of analysis.black) if (b.start > 0.5 && b.end < totalSeconds - 0.5) out.push({ check: 'av-health', level: 'warning', message: `Có đoạn đen ${(b.end - b.start).toFixed(1)} giây lúc ${fmtSec(b.start)}: một cảnh có thể dựng lỗi` });
    for (const s of analysis.silences) if (s.start > 0.5 && s.end < totalSeconds - 0.5) out.push({ check: 'av-health', level: 'warning', message: `Im lặng hoàn toàn ${(s.end - s.start).toFixed(1)} giây lúc ${fmtSec(s.start)}: thiếu giọng đọc hoặc nhạc nền` });
    if (analysis.maxDb !== null && analysis.maxDb >= -0.3) out.push({ check: 'av-health', level: 'warning', message: 'Âm thanh chạm trần (dễ bị rè): giảm âm lượng hiệu ứng hoặc nhạc nền' });
    if (analysis.meanDb !== null && analysis.meanDb < -30) out.push({ check: 'av-health', level: 'warning', message: `Âm thanh quá nhỏ (trung bình ${analysis.meanDb.toFixed(0)} dB): kiểm tra giọng đọc` });
    return out;
  },
};

/** Registered checks. Add a check here. */
export const QUALITY_CHECKS: QualityCheck[] = [duration, slotCounts, catchphrases, avoid, narrationLength, variety, spoken, avHealth];
