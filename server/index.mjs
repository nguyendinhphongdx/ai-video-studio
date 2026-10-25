// AI Video Studio web server: UI + JSON API + project files.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import * as pipe from "./pipeline.mjs";
import { llmConfigured, manualPrompt, briefPrompt, revisePrompt, parsePastedSpec } from "./ai.mjs";
import { ttsAvailable, VOICES, previewLine, PREVIEW_DIR } from "./tts.mjs";
import { TEMPLATES, FORMATS } from "./spec.mjs";
import { listBrands, loadBrand } from "./brand.mjs";
import { getLlmSettings, publicSettings, saveLlmSettings, previewLlmSettings, llmReady, PROVIDERS } from "./settings.mjs";
import { createLlm } from "./llm/index.mjs";

const PORT = Number(process.env.AVS_PORT || 3210);
export const BASE_URL = `http://localhost:${PORT}`;

const MIME = { ".ttf": "font/ttf", ".html": "text/html; charset=utf-8", ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".json": "application/json", ".md": "text/markdown; charset=utf-8", ".png": "image/png", ".js": "text/javascript" };

const send = (res, code, body) => {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });

// Fire-and-forget: the UI polls the project for progress.
const background = (promise) => promise.catch((e) => console.error(e));

function serveFile(req, res, file) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: "not found" });
  const size = fs.statSync(file).size;
  const type = MIME[path.extname(file)] ?? "application/octet-stream";
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { "content-type": type, "content-range": `bytes ${start}-${end}/${size}`, "accept-ranges": "bytes", "content-length": end - start + 1 });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { "content-type": type, "content-length": size, "accept-ranges": "bytes", "access-control-allow-origin": "*" });
  fs.createReadStream(file).pipe(res);
}

async function handle(req, res) {
  const url = new URL(req.url, BASE_URL);
  const parts = url.pathname.split("/").filter(Boolean);
  const method = req.method;

  if (method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    return serveFile(req, res, path.join(pipe.ROOT, "ui/index.html"));
  }
  if (method === "GET" && parts[0] === "brands" && parts.length === 3) {
    const file = path.resolve(pipe.ROOT, "public", ...parts.map(decodeURIComponent));
    if (!file.startsWith(path.join(pipe.ROOT, "public", "brands") + path.sep)) return send(res, 403, { error: "forbidden" });
    return serveFile(req, res, file);
  }
  if (method === "GET" && parts[0] === "fonts" && parts.length === 2 && /^[\w-]+\.ttf$/.test(parts[1])) {
    return serveFile(req, res, path.join(pipe.ROOT, "public", parts[1]));
  }
  if (method === "GET" && parts[0] === "preview" && parts.length === 2 && /^[0-9a-f]{16}\.mp3$/.test(parts[1])) {
    return serveFile(req, res, path.join(PREVIEW_DIR, parts[1]));
  }
  if (method === "GET" && parts[0] === "files" && parts.length >= 3) {
    const file = path.resolve(pipe.PROJECTS, ...parts.slice(1).map(decodeURIComponent));
    if (!file.startsWith(pipe.PROJECTS + path.sep)) return send(res, 403, { error: "forbidden" });
    return serveFile(req, res, file);
  }
  if (parts[0] !== "api") return send(res, 404, { error: "not found" });

  if (method === "GET" && parts[1] === "config") {
    const llm = await getLlmSettings();
    return send(res, 200, { llmConfigured: llmReady(llm), llm: { provider: llm.provider, providerLabel: PROVIDERS[llm.provider].short, model: llm.model }, tts: await ttsAvailable(), templates: TEMPLATES, formats: FORMATS, voices: VOICES, brands: await listBrands() });
  }
  if (method === "POST" && parts[1] === "tts" && parts[2] === "preview") {
    const { text, voice } = await readBody(req);
    if (!text?.trim()) return send(res, 400, { error: "Chưa có lời đọc" });
    if (!(await ttsAvailable())) return send(res, 400, { error: "Giọng đọc đang tắt (chưa cài edge-tts)" });
    try {
      return send(res, 200, { url: `/preview/${await previewLine(text.trim().slice(0, 500), voice)}` });
    } catch (e) {
      console.error("[tts preview]", e?.detail ?? e);
      return send(res, 502, { error: e.message });
    }
  }
  if (parts[1] === "settings") {
    if (method === "GET" && parts.length === 2) return send(res, 200, await publicSettings());
    if (method === "POST" && parts.length === 2) {
      try {
        return send(res, 200, await saveLlmSettings((await readBody(req)).llm ?? {}));
      } catch (e) {
        return send(res, 400, { error: e.message });
      }
    }
    if (method === "POST" && parts[2] === "test") {
      // Tests the form's values (unsaved) on top of the saved settings.
      const body = await readBody(req);
      let llm;
      try {
        llm = await previewLlmSettings(body.llm ?? {});
      } catch (e) {
        return send(res, 200, { ok: false, error: e.message });
      }
      if (!llmReady(llm)) {
        const why = !llm.model ? "Chưa nhập model." : llm.provider === "openai-compatible" && !llm.baseUrl ? "Chưa nhập Base URL." : `Chưa có API key cho ${PROVIDERS[llm.provider].label}.`;
        return send(res, 200, { ok: false, error: why });
      }
      try {
        return send(res, 200, { ok: true, provider: llm.provider, model: await createLlm(llm).ping() });
      } catch (e) {
        const msg = String(e?.message ?? e);
        const where = llm.baseUrl || PROVIDERS[llm.provider].label;
        return send(res, 200, { ok: false, error: /connection error|ECONNREFUSED|fetch failed/i.test(msg) ? `Không kết nối được tới ${where}. Kiểm tra máy chủ đã chạy và Base URL đúng chưa.` : msg });
      }
    }
    return send(res, 404, { error: "not found" });
  }
  if (parts[1] !== "projects") return send(res, 404, { error: "not found" });

  if (parts.length === 2) {
    if (method === "GET") return send(res, 200, await pipe.listProjects());
    if (method === "POST") {
      const body = await readBody(req);
      if (!body.idea?.trim()) return send(res, 400, { error: "Cần nhập ý tưởng video" });
      const p = await pipe.createProject(body);
      if (await llmConfigured()) background(pipe.generateScript(p.id));
      return send(res, 200, p);
    }
  }

  const id = parts[2];
  const action = parts[3];
  if (method === "GET" && !action) return send(res, 200, await pipe.loadProject(id));
  if (method === "DELETE" && !action) {
    await pipe.deleteProject(id);
    return send(res, 200, { ok: true });
  }
  if (method === "GET" && action === "prompt") {
    const p = await pipe.loadProject(id);
    const feedback = url.searchParams.get("feedback");
    const user = p.spec && feedback ? revisePrompt(p.spec, feedback) : briefPrompt({ idea: p.idea, template: p.template, sceneCount: p.sceneCount });
    return send(res, 200, { prompt: manualPrompt(await loadBrand(p.brand), user) });
  }
  if (method !== "POST") return send(res, 405, { error: "method not allowed" });
  const body = await readBody(req);
  switch (action) {
    case "script":
      background(pipe.generateScript(id));
      return send(res, 200, { ok: true });
    case "spec": {
      const spec = typeof body.text === "string" ? parsePastedSpec(body.text) : body.spec;
      return send(res, 200, await pipe.setSpec(id, spec, body.note));
    }
    case "revise":
      background(pipe.requestScriptChanges(id, body.feedback));
      return send(res, 200, { ok: true });
    case "approve-script":
      background(pipe.produce(id, { baseUrl: BASE_URL }));
      return send(res, 200, { ok: true });
    case "approve-video":
      return send(res, 200, await pipe.approveVideo(id));
    case "reject-video":
      background(pipe.rejectVideo(id, body.feedback));
      return send(res, 200, { ok: true });
    case "settings": {
      const p = await pipe.loadProject(id);
      for (const k of ["formats", "engines", "voice", "music", "brand"]) if (body[k] !== undefined) p[k] = body[k];
      return send(res, 200, await pipe.saveProject(p));
    }
  }
  return send(res, 404, { error: "unknown action" });
}

export function startServer() {
  const server = http.createServer((req, res) =>
    handle(req, res).catch((e) => {
      console.error(e);
      send(res, 500, { error: String(e?.message ?? e) });
    }),
  );
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await startServer();
  console.log(`AI Video Studio: ${BASE_URL}`);
  const llm = await getLlmSettings();
  console.log(`AI kịch bản: ${llmReady(llm) ? `${PROVIDERS[llm.provider].label} · ${llm.model}` : "chưa cài đặt (⚙️ Cài đặt), dùng chế độ dán kịch bản"}`);
  console.log(`Giọng đọc: ${(await ttsAvailable()) ? "edge-tts" : "tắt (pip install edge-tts để bật)"}`);
}
