// Project pipeline: idea -> script (AI) -> [human approves] -> voice -> render -> [human approves] -> publish kit.
import fs from "node:fs/promises";
import path from "node:path";
import { writeScript, reviseScript, hasApiKey } from "./ai.mjs";
import { synthesize, ttsAvailable } from "./tts.mjs";
import { buildTimeline, FORMATS, normalizeSpec } from "./spec.mjs";
import { loadBrand, defaultBrandId } from "./brand.mjs";
import { renderWithRemotion } from "./render-remotion.mjs";
import { writeHyperframesProject, renderWithHyperframes } from "./render-hyperframes.mjs";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const PROJECTS = process.env.AVS_PROJECTS || path.join(ROOT, "projects");

// status: draft -> script_review -> producing -> video_review -> approved  (error at any step)
const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "video";

const dirOf = (id) => path.join(PROJECTS, id);

export async function listProjects() {
  await fs.mkdir(PROJECTS, { recursive: true });
  const ids = await fs.readdir(PROJECTS);
  const out = [];
  for (const id of ids) {
    try {
      out.push(await loadProject(id));
    } catch {}
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loadProject(id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("bad id");
  return JSON.parse(await fs.readFile(path.join(dirOf(id), "project.json"), "utf8"));
}

export async function saveProject(p) {
  p.updatedAt = new Date().toISOString();
  await fs.mkdir(dirOf(p.id), { recursive: true });
  const file = path.join(dirOf(p.id), "project.json");
  await fs.writeFile(file + ".tmp", JSON.stringify(p, null, 2));
  await fs.rename(file + ".tmp", file);
  return p;
}

const log = (p, msg) => (p.log = [...(p.log ?? []), { at: new Date().toISOString(), msg }].slice(-50));

export async function createProject({ idea, brand, template = "cards", sceneCount, formats = ["landscape"], engines = ["remotion"], voice, music = true }) {
  brand = (await loadBrand(brand || (await defaultBrandId()))).id;
  voice ??= (await loadBrand(brand)).voice;
  const now = new Date();
  const id = `${now.toISOString().slice(0, 10)}-${slug(idea)}-${now.getTime().toString(36).slice(-4)}`;
  const p = { id, idea, brand, template, sceneCount, formats, engines, voice, music, status: "draft", createdAt: now.toISOString(), spec: null, renders: [], job: null };
  log(p, `Tạo dự án: ${idea}`);
  return saveProject(p);
}

/** Runs `fn` as the project's background job, recording progress and errors on disk. */
async function job(p, step, fn) {
  p.job = { step, progress: 0, error: null };
  await saveProject(p);
  let last = 0;
  const progress = async (v) => {
    p.job.progress = v;
    if (Date.now() - last > 1000) {
      last = Date.now();
      await saveProject(p);
    }
  };
  try {
    await fn(progress);
    p.job = null;
  } catch (e) {
    p.job = { step, progress: 0, error: String(e?.message ?? e) };
    p.status = p.status === "producing" ? "script_review" : p.status;
    log(p, `Lỗi ở bước ${step}: ${p.job.error}`);
  }
  return saveProject(p);
}

export async function generateScript(id) {
  const p = await loadProject(id);
  if (!hasApiKey()) throw new Error("Chưa có ANTHROPIC_API_KEY. Dùng chế độ dán kịch bản (copy prompt sang Claude rồi dán JSON lại).");
  return job(p, "script", async () => {
    p.spec = await writeScript(await loadBrand(p.brand), { idea: p.idea, template: p.template, sceneCount: p.sceneCount });
    p.status = "script_review";
    log(p, "AI đã viết xong kịch bản, chờ duyệt");
  });
}

export async function setSpec(id, spec, note = "Đã cập nhật kịch bản") {
  const p = await loadProject(id);
  p.spec = normalizeSpec(spec);
  p.template = p.spec.template;
  p.status = "script_review";
  log(p, note);
  return saveProject(p);
}

export async function requestScriptChanges(id, feedback) {
  const p = await loadProject(id);
  if (!hasApiKey()) throw new Error("Chưa có ANTHROPIC_API_KEY để AI sửa kịch bản.");
  return job(p, "revise", async () => {
    p.spec = await reviseScript(await loadBrand(p.brand), p.spec, feedback);
    p.status = "script_review";
    log(p, `AI đã sửa kịch bản theo yêu cầu: ${feedback}`);
  });
}

/** After the person approves the script: voice-over, then every requested engine x format. */
export async function produce(id, { baseUrl }) {
  const p = await loadProject(id);
  if (!p.spec) throw new Error("Chưa có kịch bản");
  p.status = "producing";
  p.renders = [];
  log(p, "Đã duyệt kịch bản, bắt đầu sản xuất");
  return job(p, "produce", async (progress) => {
    const dir = dirOf(id);
    let voice = { files: {}, durations: {} };
    if (await ttsAvailable()) {
      voice = await synthesize(p.spec, path.join(dir, "audio"), { voice: p.voice, onProgress: (v) => progress(v * 0.15) });
      log(p, `Đã lồng tiếng ${Object.keys(voice.files).length} đoạn`);
    } else {
      log(p, "Bỏ qua lồng tiếng (chưa cài edge-tts hoặc AVS_TTS=none)");
    }
    const brand = await loadBrand(p.brand);
    const timeline = buildTimeline(p.spec, voice.durations);
    p.duration = timeline.total;
    const tasks = p.engines.flatMap((engine) => p.formats.map((format) => ({ engine, format })));
    await fs.mkdir(path.join(dir, "renders"), { recursive: true });
    for (const [i, { engine, format }] of tasks.entries()) {
      const { width, height } = FORMATS[format];
      const outFile = path.join(dir, "renders", `${slug(p.spec.title)}-${format}-${engine}.mp4`);
      const sub = (v) => progress(0.15 + ((i + v) / tasks.length) * 0.85);
      if (engine === "remotion") {
        const audio = Object.fromEntries(Object.keys(voice.files).map((k) => [k, `${baseUrl}/files/${id}/audio/${k}.mp3`]));
        await renderWithRemotion({ spec: p.spec, brand, timeline, audio, width, height, music: p.music }, outFile, { onProgress: sub });
      } else {
        const hfDir = path.join(dir, `hyperframes-${format}`);
        await writeHyperframesProject(hfDir, { spec: p.spec, brand, timeline, width, height, voiceFiles: voice.files, music: p.music });
        await renderWithHyperframes(hfDir, outFile, { onProgress: sub });
      }
      p.renders.push({ engine, format, file: path.relative(dir, outFile) });
      log(p, `Render xong ${engine} ${FORMATS[format].label}`);
      await saveProject(p);
    }
    p.status = "video_review";
    log(p, "Video đã sẵn sàng, chờ duyệt");
  });
}

/** Final approval: write the publish kit (titles, descriptions, hashtags per platform). */
export async function approveVideo(id) {
  const p = await loadProject(id);
  const { youtube, facebook, tiktok } = p.spec.publish;
  const files = p.renders.map((r) => `- ${r.file} (${r.engine}, ${FORMATS[r.format].label})`).join("\n");
  const md = `# ${p.spec.title}

## Video
${files}

## YouTube
**Tiêu đề:** ${youtube.title}

**Mô tả:**
${youtube.description}

**Tags:** ${youtube.tags.join(", ")}

## Facebook
${facebook.post}

## TikTok / Reels / Shorts
${tiktok.caption} ${tiktok.hashtags.join(" ")}
`;
  await fs.writeFile(path.join(dirOf(id), "dang-bai.md"), md);
  p.status = "approved";
  log(p, "Đã duyệt video. Bộ nội dung đăng bài: dang-bai.md");
  return saveProject(p);
}

export async function rejectVideo(id, feedback) {
  const p = await loadProject(id);
  p.status = "script_review";
  log(p, `Video bị trả lại: ${feedback}`);
  await saveProject(p);
  return feedback?.trim() && hasApiKey() ? requestScriptChanges(id, feedback) : p;
}
