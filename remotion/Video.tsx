import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { loadFont } from "@remotion/fonts";
import { createContext, useContext } from "react";

const ROUND = "Baloo2";
const HAND = "PatrickHand";
loadFont({ family: ROUND, url: staticFile("Baloo2.ttf"), weight: "400 800" });
loadFont({ family: HAND, url: staticFile("PatrickHand-Regular.ttf") });

export type Scene = { heading: string; emoji: string; count: number; caption: string; narration: string; color: string };
export type Spec = { title: string; template: "cards" | "whiteboard"; scenes: Scene[] };
export type Part = { kind: "intro" | "scene" | "outro"; key: string; start: number; duration: number; index?: number };
export type Brand = { name: string; logo: string; outroText: string; subscribeText: string };
export type VideoProps = {
  spec: Spec;
  brand: Brand;
  timeline: { parts: Part[]; total: number };
  audio: Record<string, string>; // part key -> URL of narration file
  width: number;
  height: number;
  music: boolean;
};

const INK = "#2B2B2B";

const BrandContext = createContext<Brand>({ name: "", logo: "brands/kid-plazza/logo.png", outroText: "", subscribeText: "" });
const useBrand = () => useContext(BrandContext);

// --- helpers ---------------------------------------------------------------
const useLayout = () => {
  const { width, height } = useVideoConfig();
  return { u: Math.min(width, height) / 1080, portrait: height > width, width, height };
};

const outline = (color: string, w: number) =>
  `-${w}px -${w}px 0 ${color}, ${w}px -${w}px 0 ${color}, -${w}px ${w}px 0 ${color}, ${w}px ${w}px 0 ${color}, 0 ${w + 6}px 0 rgba(0,0,0,0.18)`;

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
};

const progress = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });

const headingSize = (text: string) => {
  const len = [...text].length;
  return len <= 2 ? 380 : len <= 4 ? 250 : len <= 7 ? 170 : 120;
};

const emojiSize = (count: number) => (count <= 1 ? 300 : count <= 3 ? 210 : count <= 6 ? 160 : 120);

/** Fade the whole part out over its last frames so cuts feel soft. */
const PartFade: React.FC<{ duration: number; children: React.ReactNode }> = ({ duration, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const end = duration * fps;
  const opacity = interpolate(frame, [0, 8, end - 8, end], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

// --- shared pieces -----------------------------------------------------------
const Sparkles: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <>
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: (i * 263 + 120) % width,
            top: (i * 151 + 60) % height,
            fontSize: 50,
            opacity: 0.7,
            transform: `scale(${0.6 + 0.4 * Math.sin(frame / 10 + i)})`,
          }}
        >
          ✨
        </div>
      ))}
    </>
  );
};

const Sky: React.FC<{ color?: string; children?: React.ReactNode }> = ({ color = "#4FC3F7", children }) => (
  <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, ${shade(color, 0.15)}, ${shade(color, -0.15)})`, fontFamily: ROUND, overflow: "hidden" }}>
    <Sparkles />
    {children}
  </AbsoluteFill>
);

const Board: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: "#FDFDFB", fontFamily: HAND, overflow: "hidden" }}>{children}</AbsoluteFill>
);

const Pen: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 220 220" style={{ position: "absolute", left: 0, top: -size, overflow: "visible", pointerEvents: "none" }}>
    <g transform="rotate(-35 0 220)">
      <polygon points="0,220 14,196 26,196" fill={INK} />
      <rect x={10} y={110} width={20} height={86} rx={3} fill="#E53935" />
      <rect x={8} y={20} width={24} height={95} rx={6} fill="#F5F5F5" stroke="#999" strokeWidth={2} />
      <rect x={8} y={20} width={24} height={22} rx={6} fill="#E53935" />
    </g>
  </svg>
);

/** Handwritten text revealed left to right, with a pen following the edge. */
const Written: React.FC<{ text: string; p: number; size: number; color?: string }> = ({ text, p, size, color = INK }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{ fontFamily: HAND, fontSize: size, color, whiteSpace: "nowrap", lineHeight: 1.2, clipPath: `inset(-20% ${100 - p * 100}% -20% 0)` }}>
        {text}
      </div>
      {p > 0 && p < 1 ? (
        <div style={{ position: "absolute", left: `${p * 100}%`, top: size * 0.85 + Math.sin(frame * 1.7) * size * 0.15 }}>
          <Pen size={size * 1.6} />
        </div>
      ) : null}
    </div>
  );
};

// --- cards template ------------------------------------------------------------
const CardsIntro: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const pop = spring({ frame, fps, config: { damping: 9 } });
  const words = title.split(" ");
  const colors = ["#FF4F6D", "#FFB020", "#3CC86A", "#7B61FF", "#00B8D9"];
  return (
    <Sky>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 40 * u, padding: 60 * u }}>
        <Img src={staticFile(useBrand().logo)} style={{ width: 520 * u, borderRadius: 50 * u, transform: `scale(${pop}) rotate(${Math.sin(frame / 8) * 2}deg)`, boxShadow: "0 30px 60px rgba(0,0,0,0.25)" }} />
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${30 * u}px` }}>
          {words.map((w, i) => {
            const s = spring({ frame: frame - 15 - i * 5, fps, config: { damping: 8 } });
            return (
              <div key={i} style={{ fontSize: 130 * u, fontWeight: 800, color: colors[i % colors.length], textShadow: outline("white", 7 * u), transform: `scale(${s}) translateY(${Math.sin((frame - i * 6) / 6) * 8}px)` }}>
                {w}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Sky>
  );
};

const CardsScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, portrait } = useLayout();
  const numPop = spring({ frame, fps, config: { damping: 7 } });
  const labelIn = spring({ frame: frame - 15 - scene.count * 8, fps, config: { damping: 12 } });
  const eSize = emojiSize(scene.count) * u * (portrait ? 1.1 : 1);
  return (
    <Sky color={scene.color}>
      <AbsoluteFill style={{ flexDirection: portrait ? "column" : "row", alignItems: "center", justifyContent: "center", padding: `${80 * u}px ${100 * u}px`, gap: 40 * u }}>
        <div
          style={{
            minWidth: portrait ? undefined : 560 * u,
            textAlign: "center",
            fontSize: headingSize(scene.heading) * u,
            fontWeight: 800,
            lineHeight: 1.05,
            color: "white",
            textShadow: outline("#1E3A6B", 12 * u),
            transform: `scale(${numPop}) rotate(${Math.sin(frame / 7) * 4}deg)`,
          }}
        >
          {scene.heading}
        </div>
        <div style={{ flex: portrait ? undefined : 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 40 * u }}>
          <div style={{ display: "flex", gap: 20 * u, flexWrap: "wrap", justifyContent: "center", maxWidth: (portrait ? 900 : 1100) * u }}>
            {Array.from({ length: scene.count }).map((_, i) => {
              const s = spring({ frame: frame - 10 - i * 8, fps, config: { damping: 6 } });
              return (
                <div key={i} style={{ fontSize: eSize, lineHeight: 1.1, transform: `scale(${s}) translateY(${Math.abs(Math.sin((frame - i * 5) / 6)) * -18 * u}px)` }}>
                  {scene.emoji}
                </div>
              );
            })}
          </div>
          <div
            style={{
              fontSize: 96 * u,
              fontWeight: 800,
              color: "white",
              textAlign: "center",
              textShadow: outline("#1E3A6B", 6 * u),
              opacity: labelIn,
              transform: `translateY(${interpolate(labelIn, [0, 1], [60, 0])}px)`,
            }}
          >
            {scene.caption}
          </div>
        </div>
      </AbsoluteFill>
    </Sky>
  );
};

const SubscribeOutro: React.FC<{ board?: boolean }> = ({ board }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u } = useLayout();
  const logo = spring({ frame, fps, config: { damping: 10 } });
  const btn = spring({ frame: frame - 20, fps, config: { damping: 8 } });
  const Bg = board ? Board : Sky;
  return (
    <Bg>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 40 * u, fontFamily: ROUND }}>
        <Img src={staticFile(useBrand().logo)} style={{ width: 440 * u, borderRadius: 40 * u, transform: `scale(${logo})`, boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }} />
        <div style={{ fontSize: 84 * u, fontWeight: 800, textAlign: "center", color: board ? INK : "white", textShadow: board ? undefined : outline("#1E3A6B", 6 * u), opacity: logo }}>
          {useBrand().outroText}
        </div>
        <div
          style={{
            background: "#FF0033",
            color: "white",
            fontSize: 60 * u,
            fontWeight: 800,
            padding: `${16 * u}px ${56 * u}px`,
            borderRadius: 999,
            transform: `scale(${btn * (1 + 0.06 * Math.sin(frame / 5))})`,
            boxShadow: `0 ${12 * u}px 0 #B00020`,
          }}
        >
          {useBrand().subscribeText}
        </div>
      </AbsoluteFill>
    </Bg>
  );
};

// --- whiteboard template ---------------------------------------------------------
const BoardIntro: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { u, portrait } = useLayout();
  const size = Math.min(portrait ? 130 : 190, (portrait ? 1900 : 3200) / Math.max(8, [...title].length)) * u;
  return (
    <Board>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", gap: 50 * u }}>
        <Written text={title} p={progress(frame, 5, 55)} size={size} />
        <svg width={900 * u} height={40 * u} viewBox="0 0 900 40">
          <path d="M 10 25 Q 450 40 890 18" fill="none" stroke="#FFB020" strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress(frame, 55, 75)} />
        </svg>
      </AbsoluteFill>
      <Img src={staticFile(useBrand().logo)} style={{ position: "absolute", right: 30 * u, bottom: 30 * u, width: 150 * u, borderRadius: 20 * u }} />
    </Board>
  );
};

const BoardScene: React.FC<{ scene: Scene; index: number }> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { u, portrait } = useLayout();
  const drawP = progress(frame, 18, 60);
  const eSize = emojiSize(scene.count) * u * 1.4;
  const r = 0.5 + drawP * 75; // circle wipe radius in %
  const angle = drawP * Math.PI * 4;
  const hSize = Math.min(headingSize(scene.heading), 230) * u;
  return (
    <Board>
      <AbsoluteFill style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", gap: (portrait ? 70 : 30) * u, padding: 60 * u }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 * u }}>
          <div style={{ fontFamily: HAND, fontSize: 70 * u, color: "#fff", background: scene.color, borderRadius: 999, width: 110 * u, height: 110 * u, display: "flex", alignItems: "center", justifyContent: "center", opacity: progress(frame, 0, 8) }}>
            {index + 1}
          </div>
          <Written text={scene.heading} p={progress(frame, 0, 18)} size={hSize} color={scene.color} />
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", inset: -30 * u, border: `${6 * u}px solid ${INK}`, borderRadius: "48% 52% 45% 55%", clipPath: `inset(0 ${100 - drawP * 100}% 0 0)` }} />
          <div style={{ display: "flex", gap: 20 * u, flexWrap: "wrap", justifyContent: "center", maxWidth: 1100 * u, padding: 20 * u, clipPath: `circle(${r}% at 50% 50%)` }}>
            {Array.from({ length: scene.count }).map((_, i) => (
              <div key={i} style={{ fontSize: eSize, lineHeight: 1.1, transform: `rotate(${Math.sin(frame / 12 + i) * 3}deg)` }}>
                {scene.emoji}
              </div>
            ))}
          </div>
          {drawP > 0 && drawP < 1 ? (
            <div style={{ position: "absolute", left: `${50 + Math.cos(angle) * 35 * drawP}%`, top: `${50 + Math.sin(angle) * 35 * drawP}%` }}>
              <Pen size={200 * u} />
            </div>
          ) : null}
        </div>
        <Written text={scene.caption} p={progress(frame, 62, 62 + Math.max(15, [...scene.caption].length * 1.2))} size={(portrait ? 84 : 104) * u} />
      </AbsoluteFill>
      <Img src={staticFile(useBrand().logo)} style={{ position: "absolute", right: 30 * u, bottom: 30 * u, width: 130 * u, borderRadius: 18 * u, opacity: 0.9 }} />
    </Board>
  );
};

// --- root ----------------------------------------------------------------------------
export const Video: React.FC<VideoProps> = ({ spec, brand, timeline, audio, music }) => {
  const { fps } = useVideoConfig();
  const board = spec.template === "whiteboard";
  return (
    <BrandContext.Provider value={brand}>
    <AbsoluteFill style={{ background: board ? "#FDFDFB" : "#2F8BE6" }}>
      {music ? <Audio src={staticFile(board ? "whiteboard.wav" : "music.wav")} loop volume={audio.intro ? 0.12 : 0.35} /> : null}
      {timeline.parts.map((part) => {
        const from = Math.round(part.start * fps);
        const len = Math.round(part.duration * fps);
        const scene = part.index !== undefined ? spec.scenes[part.index] : undefined;
        return (
          <Sequence key={part.key} from={from} durationInFrames={len} premountFor={fps}>
            <PartFade duration={part.duration}>
              {part.kind === "intro" ? (board ? <BoardIntro title={spec.title} /> : <CardsIntro title={spec.title} />) : null}
              {part.kind === "scene" && scene ? (board ? <BoardScene scene={scene} index={part.index!} /> : <CardsScene scene={scene} />) : null}
              {part.kind === "outro" ? <SubscribeOutro board={board} /> : null}
            </PartFade>
            {audio[part.key] ? (
              <Sequence from={6} layout="none">
                <Audio src={audio[part.key]} />
              </Sequence>
            ) : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
    </BrandContext.Provider>
  );
};
