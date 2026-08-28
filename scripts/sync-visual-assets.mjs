#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = rootArg >= 0 && args[rootArg + 1] ? args[rootArg + 1] : process.cwd();
const site = join(root, "site");
const palDirectory = join(site, "assets", "pals");
const visualDirectory = join(site, "assets", "visuals");
const dataPath = join(site, "data", "guide-data.json");
const manifestPath = join(site, "data", "visual-assets.json");

const PALDEX_COMMIT = "5a0f591582e91e2f9c294bcc6cb186ad87094523";
const PALDEX_RAW = `https://raw.githubusercontent.com/catrenelle/PalDex/${PALDEX_COMMIT}`;
const OFFICIAL_CDN = "https://cdn.getshifter.co/4cf51f4bd2c52300046e22057221adc8e88f21a9/uploads/2026";
const overrides = {
  "katress-ignis": "CatMage_Fire", tetroise: "CubeTurtle", "mau-cryst": "Bastet_Ice", mau: "Bastet",
};
// Palworld.gg's list image currently exposes the English alt text for Fuack,
// while its Korean partner-skill page and Korean databases identify it as 청부리.
const koreanNameOverrides = { fuack: "청부리" };

function cleanPalName(value) {
  return String(value).replace(/\s+(?:Lv\s*)?\d+(?:\.\d+)?\s*g?$/i, "").trim();
}

function decodeHtml(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, number) => String.fromCodePoint(Number.parseInt(number, 10)))
    .replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'");
}

function parsePalworldGgPage(html, localePrefix) {
  const result = [];
  const anchorPattern = new RegExp(`<a[^>]+href="/${localePrefix}pal/([^"?#]+)"[\\s\\S]*?</a>`, "gi");
  for (const match of html.matchAll(anchorPattern)) {
    const image = match[0].match(/<img[^>]+full_palicon\/T_([^"?&]+?)_icon_normal\.png[^>]*>/i);
    if (!image) continue;
    const alt = image[0].match(/\balt="([^"]+)"/i)?.[1] ?? "";
    result.push({ slug: decodeURIComponent(match[1]), code: image[1], name: decodeHtml(alt).trim() });
  }
  return result;
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "kms0539-palworld-guide-assets/1.0 (+https://github.com/kms0539/palworld-guide)" },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

function verifyImage(buffer, extension, url) {
  const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer.at(-2) === 0xff && buffer.at(-1) === 0xd9;
  const webp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if ((extension === ".png" && !png) || (extension === ".jpg" && !jpeg) || (extension === ".webp" && !webp)) {
    throw new Error(`invalid ${extension} asset: ${url}`);
  }
}

async function sha256(buffer) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(buffer).digest("hex");
}

async function saveImage(url, destination) {
  const extension = destination.slice(destination.lastIndexOf(".")).toLowerCase();
  const buffer = await fetchBuffer(url);
  verifyImage(buffer, extension, url);
  await writeFile(destination, buffer);
  return { bytes: buffer.length, sha256: await sha256(buffer) };
}

async function runPool(items, worker, concurrency = 12) {
  let index = 0;
  const results = new Array(items.length);
  async function next() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return results;
}

const guide = JSON.parse(await readFile(dataPath, "utf8"));
await mkdir(palDirectory, { recursive: true });
await mkdir(visualDirectory, { recursive: true });

const [spawnResponse, bossResponse, englishNamesResponse, koreanNamesResponse] = await Promise.all([
  fetch(`${PALDEX_RAW}/data/pal_spawn_locations_static.json`),
  fetch(`${PALDEX_RAW}/data/bosses_static.json`),
  fetch("https://palworld.gg/pals", { headers: { "User-Agent": "kms0539-palworld-guide/1.0 (+https://github.com/kms0539/palworld-guide)" } }),
  fetch("https://palworld.gg/ko/pals", { headers: { "User-Agent": "kms0539-palworld-guide/1.0 (+https://github.com/kms0539/palworld-guide)" } }),
]);
if (!spawnResponse.ok || !bossResponse.ok) throw new Error("PalDex metadata download failed");
if (!englishNamesResponse.ok || !koreanNamesResponse.ok) throw new Error("Korean Pal name source download failed");
const spawnData = await spawnResponse.json();
const bossData = await bossResponse.json();
const englishNames = parsePalworldGgPage(await englishNamesResponse.text(), "");
const koreanNames = parsePalworldGgPage(await koreanNamesResponse.text(), "ko/");
const codeBySlug = new Map(englishNames.map((entry) => [entry.slug, entry.code]));
const koreanNameByCode = new Map(koreanNames.map((entry) => [entry.code, entry.name]));
const iconByName = new Map(Object.values(spawnData).map((entry) => [entry.name, entry.icon]));
for (const entry of bossData) {
  if (entry.category === "pal" && !iconByName.has(entry.name)) iconByName.set(entry.name, entry.icon);
}

const palJobs = guide.pals.map((pal) => {
  const name = cleanPalName(pal.name);
  const icon = iconByName.get(name) ?? (overrides[pal.slug] ? `Pal_${overrides[pal.slug]}.png` : "");
  const palworldGgCode = codeBySlug.get(pal.slug);
  if (!icon && !palworldGgCode) return { ...pal, name, missing: true };
  return {
    ...pal,
    name,
    icon: icon || `Pal_${palworldGgCode}.png`,
    sourceProvider: icon ? "PalDex" : "Palworld.gg",
    sourceUrl: icon
      ? `${PALDEX_RAW}/frontend/assets/boss_icons/${encodeURIComponent(icon)}`
      : `https://palworld.gg/images/full_palicon/T_${encodeURIComponent(palworldGgCode)}_icon_normal.png`,
    destination: join(palDirectory, `${pal.slug}.png`),
  };
});

const downloaded = await runPool(palJobs.filter((job) => !job.missing), async (job) => {
  const file = await saveImage(job.sourceUrl, job.destination);
  return [job.slug, { path: `./assets/pals/${job.slug}.png`, name: job.name, sourceProvider: job.sourceProvider, ...file }];
});
const palAssets = Object.fromEntries(downloaded);
if (Object.keys(palAssets).length < 260) {
  const missing = palJobs.filter((job) => job.missing).map((job) => job.slug);
  throw new Error(`pal image coverage too small (${Object.keys(palAssets).length}); missing: ${missing.join(", ")}`);
}
const localizedNames = Object.fromEntries(guide.pals.map((pal) => {
  const job = palJobs.find((candidate) => candidate.slug === pal.slug);
  const code = job?.icon?.replace(/^Pal_/, "").replace(/\.png$/i, "") ?? codeBySlug.get(pal.slug);
  return [pal.slug, koreanNameOverrides[pal.slug] ?? koreanNameByCode.get(code) ?? cleanPalName(pal.name)];
}));
if (Object.values(localizedNames).filter((name) => /[가-힣]/.test(name)).length < 260) {
  throw new Error("Korean Pal name coverage is unexpectedly small");
}

const fixedAssets = [
  { id: "world-map", url: `${PALDEX_RAW}/frontend/assets/map.webp`, destination: join(visualDirectory, "palworld-map.webp"), path: "./assets/visuals/palworld-map.webp" },
  { id: "world-tree-map", url: `${PALDEX_RAW}/frontend/assets/tree.webp`, destination: join(visualDirectory, "palworld-world-tree.webp"), path: "./assets/visuals/palworld-world-tree.webp" },
  { id: "official-hero", url: `${OFFICIAL_CDN}/03/img-features-01.jpg`, destination: join(visualDirectory, "official-hero.jpg"), path: "./assets/visuals/official-hero.jpg" },
  { id: "official-adventure", url: `${OFFICIAL_CDN}/03/img-features-02.jpg`, destination: join(visualDirectory, "official-adventure.jpg"), path: "./assets/visuals/official-adventure.jpg" },
  { id: "official-anubis", url: `${OFFICIAL_CDN}/03/img-anubis-01.png`, destination: join(visualDirectory, "official-anubis.png"), path: "./assets/visuals/official-anubis.png" },
];
const fixedResults = await runPool(fixedAssets, async (asset) => {
  const file = await saveImage(asset.url, asset.destination);
  return [asset.id, { path: asset.path, sourceUrl: asset.url, ...file }];
}, 4);

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  pals: palAssets,
  koreanNames: localizedNames,
  missingPalImages: palJobs.filter((job) => job.missing).map((job) => ({ slug: job.slug, name: job.name })),
  visuals: Object.fromEntries(fixedResults),
  attribution: [
    { name: "PalDex", url: `https://github.com/catrenelle/PalDex/tree/${PALDEX_COMMIT}`, license: "MIT", usage: "펠 아이콘과 월드 지도 텍스처" },
    { name: "Pocketpair 공식 Palworld 사이트", url: "https://www.pocketpair.jp/games/palworld/", license: "공식 홍보 자료 · 게임 및 캐릭터 저작권은 Pocketpair에 있음", usage: "상단 및 소개 이미지" },
    { name: "Palworld.gg 펠 도감", url: "https://palworld.gg/ko/pals", license: "게임 이미지의 저작권은 Pocketpair에 있음", usage: "최신 펠 아이콘 보완 및 한글 명칭 대조" },
  ],
};
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ ok: true, pals: Object.keys(palAssets).length, fixedAssets: fixedResults.length, manifest: basename(manifestPath) })}\n`);
