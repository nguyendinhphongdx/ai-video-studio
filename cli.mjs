#!/usr/bin/env node
// Command-line version of the studio flow, for batch work or running from Claude Code.
//   node cli.mjs "Bé học màu sắc" --brand kid-plazza --template cards --formats landscape,portrait --engines remotion,hyperframes
//   node cli.mjs --spec examples/be-hoc-mau-sac.json --yes
import { parseArgs } from "node:util";
import fs from "node:fs/promises";
import readline from "node:readline/promises";
import * as pipe from "./server/pipeline.mjs";
import { startServer, BASE_URL } from "./server/index.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    brand: { type: "string" },
    template: { type: "string", default: "cards" },
    formats: { type: "string", default: "landscape" },
    engines: { type: "string", default: "remotion" },
    scenes: { type: "string" },
    spec: { type: "string" },
    "no-music": { type: "boolean", default: false },
    yes: { type: "boolean", short: "y", default: false },
  },
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = async (q) => (values.yes ? "y" : (await rl.question(q)).trim());

const server = await startServer();
try {
  const specFromFile = values.spec ? JSON.parse(await fs.readFile(values.spec, "utf8")) : null;
  const idea = positionals.join(" ") || specFromFile?.title;
  if (!idea) throw new Error('Cần ý tưởng, ví dụ: node cli.mjs "Bé học màu sắc"');
  let p = await pipe.createProject({
    idea,
    brand: values.brand,
    template: specFromFile?.template ?? values.template,
    sceneCount: values.scenes,
    formats: values.formats.split(","),
    engines: values.engines.split(","),
    music: !values["no-music"],
  });
  console.log(`Dự án: ${p.id}`);

  p = specFromFile ? await pipe.setSpec(p.id, specFromFile, "Kịch bản từ file") : await pipe.generateScript(p.id);
  for (;;) {
    if (p.job?.error) throw new Error(p.job.error);
    console.log(`\n=== ${p.spec.title} (${p.spec.template}) ===`);
    console.log(`Mở đầu: ${p.spec.intro_narration}`);
    p.spec.scenes.forEach((s, i) => console.log(`${i + 1}. [${s.heading}] ${s.emoji}x${s.count} ${s.caption}\n   🎙 ${s.narration}`));
    console.log(`Kết: ${p.spec.outro_narration}`);
    const a = await ask("\nDuyệt kịch bản? (y = duyệt, hoặc gõ yêu cầu sửa): ");
    if (a.toLowerCase() === "y") break;
    p = await pipe.requestScriptChanges(p.id, a);
  }

  console.log("\nĐang lồng tiếng và render...");
  const timer = setInterval(async () => {
    const cur = await pipe.loadProject(p.id).catch(() => null);
    if (cur?.job) process.stdout.write(`\r  ${Math.round(cur.job.progress * 100)}%   `);
  }, 2000);
  p = await pipe.produce(p.id, { baseUrl: BASE_URL });
  clearInterval(timer);
  if (p.job?.error) throw new Error(p.job.error);
  console.log("\nVideo:");
  for (const r of p.renders) console.log(`  ${pipe.PROJECTS}/${p.id}/${r.file}`);

  const v = await ask("\nDuyệt video? (y = duyệt và tạo nội dung đăng bài, n = bỏ qua): ");
  if (v.toLowerCase() === "y") {
    await pipe.approveVideo(p.id);
    console.log(`Nội dung đăng bài: ${pipe.PROJECTS}/${p.id}/dang-bai.md`);
  }
} catch (e) {
  console.error(`\nLỗi: ${e.message}`);
  process.exitCode = 1;
} finally {
  rl.close();
  server.close();
}
