import spec from "../examples/be-hoc-mau-sac.json";
import type { VideoProps, Spec } from "./Video";

// Preview data for `npm run studio`; real renders pass their own props.
const parts: VideoProps["timeline"]["parts"] = [
  { kind: "intro", key: "intro", start: 0, duration: 3 },
  ...spec.scenes.map((_, i) => ({ kind: "scene" as const, key: String(i), index: i, start: 3 + i * 4, duration: 4 })),
  { kind: "outro", key: "outro", start: 3 + spec.scenes.length * 4, duration: 4 },
];

export const sampleProps: VideoProps = {
  spec: spec as Spec,
  brand: { name: "Kid Plazza", logo: "brands/kid-plazza/logo.png", outroText: "Hẹn gặp lại các bé nhé!", subscribeText: "🔔 ĐĂNG KÝ KÊNH" },
  timeline: { parts, total: 7 + spec.scenes.length * 4 },
  audio: {},
  width: 1920,
  height: 1080,
  music: true,
};
