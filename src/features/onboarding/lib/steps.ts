export type StepId = 'ai' | 'channel' | 'video' | 'quality';

export interface OnboardingInput {
  llmReady: boolean;
  /** The current channel has its own intro/outro design. */
  channelDesigned: boolean;
  episodeCount: number;
  imageReady: boolean;
  /** Edge or Google voice is usable. */
  voiceReady: boolean;
}

export interface OnboardingStep {
  id: StepId;
  title: string;
  why: string;
  done: boolean;
  /** The optional step never blocks and does not count toward the total. */
  optional: boolean;
}

/** What a new person still has to do, computed from the app state so it never goes stale. */
export function onboardingSteps(i: OnboardingInput): OnboardingStep[] {
  return [
    { id: 'ai', title: 'Kết nối AI', why: 'AI viết kịch bản và trả lời trợ lý. Không có khoá AI thì chưa làm được gì.', done: i.llmReady, optional: false },
    { id: 'channel', title: 'Dựng bộ nhận diện cho kênh', why: 'Intro, outro và phong cách ảnh riêng làm video của bạn khác với kênh khác.', done: i.channelDesigned || i.episodeCount > 0, optional: false },
    { id: 'video', title: 'Làm video đầu tiên', why: 'Chỉ cần gõ một câu ý tưởng, AI viết kịch bản và bạn duyệt từng cảnh.', done: i.episodeCount > 0, optional: false },
    { id: 'quality', title: 'Tạo ảnh và giọng tốt hơn', why: 'Khoá ảnh AI cho ảnh đẹp hơn, giọng Google tự nhiên hơn giọng Edge miễn phí. Có thể bỏ qua.', done: i.imageReady && i.voiceReady, optional: true },
  ];
}

export function progress(steps: OnboardingStep[]): { done: number; total: number; finished: boolean } {
  const required = steps.filter((s) => !s.optional);
  const done = required.filter((s) => s.done).length;
  return { done, total: required.length, finished: done === required.length };
}
