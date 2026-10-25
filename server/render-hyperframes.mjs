// HyperFrames renderer: writes the same spec as an editable HTML + GSAP project,
// then renders it with the HyperFrames CLI. The project folder stays on disk, so the
// person can open it in HyperFrames Studio (`npx hyperframes preview`) and tweak by hand.
import fs from "node:fs/promises";
import path from "node:path";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";

const ROOT = path.resolve(import.meta.dirname, "..");
const HF_VERSION = "0.8.192";
const run = promisify(execFile);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const r3 = (n) => Math.round(n * 1000) / 1000;

const shade = (hex, amt) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
};
const headingSize = (t) => {
  const len = [...t].length;
  return len <= 2 ? 380 : len <= 4 ? 250 : len <= 7 ? 170 : 120;
};
const emojiSize = (c) => (c <= 1 ? 300 : c <= 3 ? 210 : c <= 6 ? 160 : 120);

function partHtml(part, spec, brand, L) {
  const { u, portrait } = L;
  const id = `p-${part.key}`;
  const board = spec.template === "whiteboard";
  const attrs = `id="${id}" class="clip part" data-start="${r3(part.start)}" data-duration="${r3(part.duration)}" data-track-index="0"`;
  const logoCorner = board ? `<img class="corner-logo" src="assets/logo.png" style="width:${140 * u}px;border-radius:${18 * u}px" />` : "";

  if (part.kind === "intro") {
    if (board) {
      const size = Math.min(portrait ? 130 : 190, (portrait ? 1900 : 3200) / Math.max(8, [...spec.title].length)) * u;
      return `<div ${attrs}><div class="inner board center col" style="gap:${50 * u}px">
  <div class="written" style="font-size:${size}px">${esc(spec.title)}</div>
  <div class="underline" style="width:${900 * u}px;height:${10 * u}px"></div>
  ${logoCorner}</div></div>`;
    }
    const words = spec.title.split(" ").map((w, i) => `<span class="word" style="color:${["#FF4F6D", "#FFB020", "#3CC86A", "#7B61FF", "#00B8D9"][i % 5]};font-size:${130 * u}px">${esc(w)}</span>`).join("");
    return `<div ${attrs}><div class="inner sky center col" style="background:radial-gradient(circle at 50% 30%, #6EC6FF, #2F8BE6);gap:${40 * u}px;padding:${60 * u}px">
  <img class="logo" src="assets/logo.png" style="width:${520 * u}px;border-radius:${50 * u}px" />
  <div class="words" style="gap:0 ${30 * u}px">${words}</div></div></div>`;
  }

  if (part.kind === "outro") {
    return `<div ${attrs}><div class="inner ${board ? "board" : "sky"} center col" style="${board ? "" : "background:radial-gradient(circle at 50% 30%, #6EC6FF, #2F8BE6);"}gap:${40 * u}px">
  <img class="logo" src="assets/logo.png" style="width:${440 * u}px;border-radius:${40 * u}px" />
  <div class="bye ${board ? "" : "outlined"}" style="font-size:${84 * u}px;color:${board ? "#2B2B2B" : "#fff"}">${esc(brand.outroText)}</div>
  <div class="sub" style="font-size:${60 * u}px;padding:${16 * u}px ${56 * u}px;box-shadow:0 ${12 * u}px 0 #B00020">${esc(brand.subscribeText)}</div></div></div>`;
  }

  const sc = spec.scenes[part.index];
  const eSize = emojiSize(sc.count) * u * (board ? 1.4 : 1);
  const emojis = Array.from({ length: sc.count }, () => `<span class="emoji" style="font-size:${eSize}px">${sc.emoji}</span>`).join("");
  if (board) {
    const hSize = Math.min(headingSize(sc.heading), 230) * u;
    return `<div ${attrs}><div class="inner board center col" style="gap:${(portrait ? 70 : 30) * u}px;padding:${60 * u}px">
  <div class="row" style="gap:${30 * u}px"><div class="badge" style="background:${sc.color};font-size:${70 * u}px;width:${110 * u}px;height:${110 * u}px">${part.index + 1}</div>
  <div class="written heading" style="font-size:${hSize}px;color:${sc.color}">${esc(sc.heading)}</div></div>
  <div class="drawing" style="max-width:${1100 * u}px;gap:${20 * u}px;padding:${20 * u}px">${emojis}</div>
  <div class="written caption" style="font-size:${(portrait ? 84 : 104) * u}px">${esc(sc.caption)}</div>
  ${logoCorner}</div></div>`;
  }
  return `<div ${attrs}><div class="inner sky ${portrait ? "col" : "row"} center" style="background:radial-gradient(circle at 50% 30%, ${shade(sc.color, 0.15)}, ${shade(sc.color, -0.15)});padding:${80 * u}px ${100 * u}px;gap:${40 * u}px">
  <div class="heading outlined-big" style="font-size:${headingSize(sc.heading) * u}px;${portrait ? "" : `min-width:${560 * u}px;`}">${esc(sc.heading)}</div>
  <div class="col center" style="${portrait ? "" : "flex:1;"}gap:${40 * u}px">
    <div class="emojis" style="gap:${20 * u}px;max-width:${(portrait ? 900 : 1100) * u}px">${emojis}</div>
    <div class="caption outlined" style="font-size:${96 * u}px">${esc(sc.caption)}</div>
  </div></div></div>`;
}

function timelineJs(spec, timeline) {
  const board = spec.template === "whiteboard";
  const lines = [];
  for (const part of timeline.parts) {
    const s = r3(part.start);
    const end = r3(part.start + part.duration);
    const sel = `#p-${part.key}`;
    lines.push(`tl.fromTo("${sel} .inner", { opacity: 0 }, { opacity: 1, duration: 0.25 }, ${s});`);
    lines.push(`tl.to("${sel} .inner", { opacity: 0, duration: 0.25 }, ${r3(end - 0.3)});`);
    if (part.kind === "intro") {
      if (board) {
        lines.push(`tl.fromTo("${sel} .written", { clipPath: "inset(-20% 100% -20% 0%)" }, { clipPath: "inset(-20% 0% -20% 0%)", duration: 1.6, ease: "none" }, ${r3(s + 0.15)});`);
        lines.push(`tl.fromTo("${sel} .underline", { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power2.out" }, ${r3(s + 1.8)});`);
      } else {
        lines.push(`tl.fromTo("${sel} .logo", { scale: 0, rotation: -8 }, { scale: 1, rotation: 0, duration: 0.9, ease: "back.out(2)" }, ${s});`);
        lines.push(`tl.fromTo("${sel} .word", { scale: 0 }, { scale: 1, duration: 0.6, ease: "back.out(3)", stagger: 0.15 }, ${r3(s + 0.5)});`);
      }
    } else if (part.kind === "outro") {
      lines.push(`tl.fromTo("${sel} .logo", { scale: 0 }, { scale: 1, duration: 0.7, ease: "back.out(2)" }, ${s});`);
      lines.push(`tl.fromTo("${sel} .bye", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, ${r3(s + 0.3)});`);
      lines.push(`tl.fromTo("${sel} .sub", { scale: 0 }, { scale: 1, duration: 0.6, ease: "back.out(3)" }, ${r3(s + 0.7)});`);
      lines.push(`tl.to("${sel} .sub", { scale: 1.07, duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: ${Math.max(1, Math.floor((part.duration - 1.6) / 0.35))} }, ${r3(s + 1.3)});`);
    } else if (board) {
      const sc = spec.scenes[part.index];
      lines.push(`tl.fromTo("${sel} .badge", { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, ${s});`);
      lines.push(`tl.fromTo("${sel} .heading", { clipPath: "inset(-20% 100% -20% 0%)" }, { clipPath: "inset(-20% 0% -20% 0%)", duration: 0.6, ease: "none" }, ${s});`);
      lines.push(`tl.fromTo("${sel} .drawing", { clipPath: "circle(0% at 50% 50%)" }, { clipPath: "circle(75% at 50% 50%)", duration: 1.4, ease: "power1.inOut" }, ${r3(s + 0.6)});`);
      lines.push(`tl.fromTo("${sel} .caption", { clipPath: "inset(-20% 100% -20% 0%)" }, { clipPath: "inset(-20% 0% -20% 0%)", duration: ${r3(Math.max(0.5, [...sc.caption].length * 0.04))}, ease: "none" }, ${r3(s + 2.1)});`);
    } else {
      lines.push(`tl.fromTo("${sel} .heading", { scale: 0, rotation: -10 }, { scale: 1, rotation: 0, duration: 0.7, ease: "back.out(2.5)" }, ${s});`);
      lines.push(`tl.fromTo("${sel} .emoji", { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(3)", stagger: 0.27 }, ${r3(s + 0.35)});`);
      lines.push(`tl.fromTo("${sel} .caption", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, ${r3(s + 0.8 + spec.scenes[part.index].count * 0.27)});`);
    }
  }
  return lines.join("\n      ");
}

export function buildHyperframesHtml({ spec, brand, timeline, width, height, voiceFiles, music }) {
  const L = { u: Math.min(width, height) / 1080, portrait: height > width };
  const audio = [];
  for (const part of timeline.parts) {
    if (voiceFiles[part.key]) {
      audio.push(`<audio id="vo-${part.key}" src="assets/vo/${part.key}.mp3" data-start="${r3(part.start + 0.2)}" data-track-index="2" data-volume="1"></audio>`);
    }
  }
  if (music) {
    audio.push(`<audio id="music" src="assets/music.mp3" data-start="0" data-duration="${r3(timeline.total)}" data-track-index="3" data-volume="${Object.keys(voiceFiles).length ? 0.12 : 0.35}"></audio>`);
  }
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${width}, height=${height}" />
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Baloo2"; src: url("assets/fonts/Baloo2.ttf"); font-weight: 400 800; }
      @font-face { font-family: "PatrickHand"; src: url("assets/fonts/PatrickHand-Regular.ttf"); }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: ${spec.template === "whiteboard" ? "#FDFDFB" : "#2F8BE6"}; }
      #root { width: 100%; height: 100%; position: relative; font-family: "Baloo2", sans-serif; }
      .part { position: absolute; inset: 0; }
      .inner { position: absolute; inset: 0; display: flex; overflow: hidden; }
      .center { align-items: center; justify-content: center; }
      .col { display: flex; flex-direction: column; align-items: center; }
      .row { display: flex; flex-direction: row; align-items: center; }
      .board { background: #FDFDFB; font-family: "PatrickHand", sans-serif; color: #2B2B2B; }
      .written { font-family: "PatrickHand", sans-serif; white-space: nowrap; line-height: 1.2; }
      .underline { background: #FFB020; border-radius: 99px; transform-origin: left center; }
      .badge { color: #fff; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
      .drawing, .emojis, .words { display: flex; flex-wrap: wrap; justify-content: center; }
      .drawing { border: 6px solid #2B2B2B; border-radius: 48% 52% 45% 55%; }
      .emoji { display: inline-block; line-height: 1.1; }
      .word { display: inline-block; font-weight: 800; text-shadow: -7px -7px 0 #fff, 7px -7px 0 #fff, -7px 7px 0 #fff, 7px 7px 0 #fff, 0 13px 0 rgba(0,0,0,.18); }
      .heading { text-align: center; font-weight: 800; line-height: 1.05; }
      .outlined-big { color: #fff; text-shadow: -12px -12px 0 #1E3A6B, 12px -12px 0 #1E3A6B, -12px 12px 0 #1E3A6B, 12px 12px 0 #1E3A6B, 0 18px 0 rgba(0,0,0,.18); }
      .outlined { color: #fff; font-weight: 800; text-align: center; text-shadow: -6px -6px 0 #1E3A6B, 6px -6px 0 #1E3A6B, -6px 6px 0 #1E3A6B, 6px 6px 0 #1E3A6B, 0 12px 0 rgba(0,0,0,.18); }
      .logo { box-shadow: 0 30px 60px rgba(0,0,0,.25); }
      .corner-logo { position: absolute; right: 30px; bottom: 30px; }
      .sub { background: #FF0033; color: #fff; font-weight: 800; border-radius: 999px; font-family: "Baloo2", sans-serif; }
      .bye { font-weight: 800; text-align: center; font-family: "Baloo2", sans-serif; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${r3(timeline.total)}" data-width="${width}" data-height="${height}">
      ${timeline.parts.map((p) => partHtml(p, spec, brand, L)).join("\n      ")}
      ${audio.join("\n      ")}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${timelineJs(spec, timeline)}
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}

/** Writes the HyperFrames project into `dir` (index.html + assets/). */
export async function writeHyperframesProject(dir, { spec, brand, timeline, width, height, voiceFiles, music }) {
  await fs.mkdir(path.join(dir, "assets/fonts"), { recursive: true });
  await fs.mkdir(path.join(dir, "assets/vo"), { recursive: true });
  const pub = path.join(ROOT, "public");
  await fs.copyFile(path.join(ROOT, "node_modules/gsap/dist/gsap.min.js"), path.join(dir, "assets/gsap.min.js"));
  await fs.copyFile(path.join(pub, brand.logo), path.join(dir, "assets/logo.png"));
  for (const f of ["Baloo2.ttf", "PatrickHand-Regular.ttf"]) await fs.copyFile(path.join(pub, f), path.join(dir, "assets/fonts", f));
  for (const [key, file] of Object.entries(voiceFiles)) await fs.copyFile(file, path.join(dir, "assets/vo", `${key}.mp3`));
  if (music) {
    const src = path.join(pub, spec.template === "whiteboard" ? "whiteboard.wav" : "music.wav");
    await run("ffmpeg", ["-y", "-loglevel", "error", "-stream_loop", "-1", "-i", src, "-t", String(timeline.total), "-af", `afade=t=out:st=${Math.max(0, timeline.total - 1.5)}:d=1.5`, "-b:a", "160k", path.join(dir, "assets/music.mp3")]);
  }
  await fs.writeFile(path.join(dir, "index.html"), buildHyperframesHtml({ spec, brand, timeline, width, height, voiceFiles, music }));
  await fs.writeFile(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "ai-video-studio-hf", private: true, type: "module", scripts: { dev: `npx --yes hyperframes@${HF_VERSION} preview`, render: `npx --yes hyperframes@${HF_VERSION} render` } }, null, 2),
  );
  return dir;
}

export function renderWithHyperframes(dir, outFile, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, HYPERFRAMES_SKIP_SKILLS: "1" };
    if (process.env.AVS_BROWSER) env.PRODUCER_HEADLESS_SHELL_PATH = process.env.AVS_BROWSER;
    const child = spawn("npx", ["--yes", `hyperframes@${HF_VERSION}`, "render", "-o", outFile], { cwd: dir, env, stdio: ["ignore", "pipe", "pipe"] });
    let log = "";
    const onData = (buf) => {
      const text = buf.toString();
      log = (log + text).slice(-8000);
      for (const m of text.matchAll(/@hf-progress (\{.*\})/g)) {
        try {
          onProgress?.(JSON.parse(m[1]).pct / 100);
        } catch {}
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("close", (code) => (code === 0 ? resolve(outFile) : reject(new Error(`HyperFrames render failed (exit ${code}):\n${log.slice(-1500)}`))));
  });
}
