// Vietnamese voice-over. Default engine: Microsoft Edge TTS (free, no key) via the
// `edge-tts` command (pip install edge-tts). Set AVS_TTS=none to skip voice.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { parseMedia } from "@remotion/media-parser";
import { nodeReader } from "@remotion/media-parser/node";
import { narrationLines } from "./spec.mjs";

const run = promisify(execFile);

export const VOICES = {
  "vi-VN-HoaiMyNeural": "Hoài My (nữ, miền Bắc)",
  "vi-VN-NamMinhNeural": "Nam Minh (nam, miền Bắc)",
};

export async function ttsAvailable() {
  if (process.env.AVS_TTS === "none") return false;
  try {
    await run(process.env.AVS_EDGE_TTS || "edge-tts", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

export async function audioDuration(file) {
  const { durationInSeconds } = await parseMedia({
    src: file,
    reader: nodeReader,
    fields: { durationInSeconds: true },
    acknowledgeRemotionLicense: true,
  });
  return durationInSeconds ?? 0;
}

/**
 * Synthesises one mp3 per narration line into `dir`.
 * Returns { files: {key: absPath}, durations: {key: seconds} }.
 */
export async function synthesize(spec, dir, { voice = "vi-VN-HoaiMyNeural", rate = "-8%", onProgress } = {}) {
  await fs.mkdir(dir, { recursive: true });
  const lines = narrationLines(spec);
  const files = {};
  const durations = {};
  for (const [i, { key, text }] of lines.entries()) {
    if (!text?.trim()) continue;
    const out = path.join(dir, `${key}.mp3`);
    await run(process.env.AVS_EDGE_TTS || "edge-tts", ["--voice", voice, `--rate=${rate}`, "--text", text, "--write-media", out]);
    files[key] = out;
    durations[key] = await audioDuration(out);
    onProgress?.((i + 1) / lines.length);
  }
  return { files, durations };
}
