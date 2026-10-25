// Channel brands: each folder in public/brands/<id>/ holds brand.json + logo.png.
// Add a channel by copying a folder and editing it.
import fs from "node:fs/promises";
import path from "node:path";

const BRANDS = path.resolve(import.meta.dirname, "../public/brands");

const DEFAULTS = {
  audience: "khán giả Việt Nam",
  style: "câu ngắn, dễ hiểu, giọng thân thiện",
  outroText: "Hẹn gặp lại nhé!",
  subscribeText: "🔔 ĐĂNG KÝ KÊNH",
  hashtags: [],
  voice: "vi-VN-HoaiMyNeural",
};

export async function listBrands() {
  const ids = (await fs.readdir(BRANDS, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  return Promise.all(ids.sort().map(loadBrand));
}

export async function loadBrand(id) {
  if (!/^[a-z0-9-]+$/.test(id ?? "")) throw new Error(`Tên kênh không hợp lệ: ${id}`);
  const data = JSON.parse(await fs.readFile(path.join(BRANDS, id, "brand.json"), "utf8"));
  return { ...DEFAULTS, ...data, id, name: data.name ?? id, logo: `brands/${id}/logo.png` };
}

export async function defaultBrandId() {
  if (process.env.AVS_BRAND) return process.env.AVS_BRAND;
  return (await listBrands())[0]?.id;
}
