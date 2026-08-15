import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Work suitability levels, innate traits and partner skills are what justify a
// base-Pal recommendation, and they live only on each Pal's own page. Fetching
// 288 pages on every scheduled refresh would hammer the upstream site, so the
// result is cached in the repository and only missing Pals are fetched.

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = rootArg >= 0 && args[rootArg + 1] ? args[rootArg + 1] : process.cwd();
const force = args.includes("--force");
const limitArg = args.indexOf("--limit");
const limit = limitArg >= 0 && args[limitArg + 1] ? Number(args[limitArg + 1]) : Infinity;

const guidePath = join(root, ".work", "guide-data.json");
const cachePath = join(root, "site", "data", "pal-details.json");
const logPath = join(root, ".work", "pal-details.log");
const PAL_BASE = "https://www.palworld.tools/pals";
const REQUEST_DELAY_MS = 350;
const SCHEMA_VERSION = 1;

// palworld.tools labels; the Korean guide renders these names.
const WORK_LABELS = {
  "Kindling": "불 피우기",
  "Watering": "관개",
  "Planting": "파종",
  "Generating Electricity": "발전",
  "Handiwork": "손재주",
  "Gathering": "채집",
  "Lumbering": "벌목",
  "Mining": "채굴",
  "Medicine Production": "제약",
  "Cooling": "냉각",
  "Transporting": "운반",
  "Farming": "목장",
};

function decodeEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

// Recover the balanced JSON object that contains the anchor key.
function extractRecord(text, anchorKey) {
  const anchor = text.indexOf(`"${anchorKey}"`);
  if (anchor < 0) return null;
  let depth = 0;
  let start = -1;
  for (let index = anchor; index >= 0; index -= 1) {
    const character = text[index];
    if (character === "}") depth += 1;
    else if (character === "{") {
      if (depth === 0) { start = index; break; }
      depth -= 1;
    }
  }
  if (start < 0) return null;
  depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, index + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

// The embedded record carries internal passive codes; the readable names and
// descriptions are only rendered in the "Innate traits" block.
function parseInnateTraits(html) {
  const heading = html.indexOf("Innate traits");
  if (heading < 0) return [];
  const section = html.slice(heading, heading + 4000);
  const traits = [];
  const pattern = /<div class="font-extrabold text-\[13\.5px\]">([\s\S]*?)<\/div>\s*<div class="text-\[12px\][^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  let match;
  while ((match = pattern.exec(section))) {
    const name = stripTags(match[1]);
    const description = stripTags(match[2]);
    if (name) traits.push({ name, description });
  }
  return traits;
}

function normalizeWork(workSuitability) {
  const work = [];
  for (const [label, level] of Object.entries(workSuitability ?? {})) {
    const value = Number(level);
    if (!Number.isFinite(value) || value <= 0) continue;
    work.push({ work: label, label: WORK_LABELS[label] ?? label, level: value });
  }
  return work.sort((a, b) => b.level - a.level || a.work.localeCompare(b.work));
}

async function fetchPalDetail(slug) {
  const url = `${PAL_BASE}/${slug}`;
  const response = await fetch(url, {
    headers: { "user-agent": "palworld-guide/1.0 (+https://github.com/kms0539/palworld-guide)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  const html = await response.text();
  const record = extractRecord(decodeEntities(html), "workSuitability");
  if (!record) throw new Error(`work suitability payload not found: ${url}`);
  const work = normalizeWork(record.workSuitability);
  if (work.length === 0 && !record.flags?.towerBoss) {
    // Pure combat Pals legitimately have no work suitability; keep them with an
    // empty list rather than failing the whole refresh.
  }
  return {
    slug,
    name: String(record.name ?? ""),
    elements: Array.isArray(record.elements) ? record.elements : [],
    rarity: Number(record.rarity) || 0,
    work,
    bestWork: String(record.bestWork ?? ""),
    partnerSkill: record.partnerSkill?.name
      ? { name: String(record.partnerSkill.name), description: String(record.partnerSkill.desc ?? "").replace(/\s+/g, " ").trim() }
      : null,
    innateTraits: parseInnateTraits(html),
    craftSpeed: Number(record.stats?.craftSpeed) || 0,
    sourceUrl: url,
  };
}

async function atomicWrite(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp.${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

async function log(message) {
  await mkdir(dirname(logPath), { recursive: true });
  await writeFile(logPath, `${new Date().toISOString()} ${message}\n`, { encoding: "utf8", flag: "a" });
}

async function readCache() {
  try {
    const cache = JSON.parse(await readFile(cachePath, "utf8"));
    if (cache.schemaVersion !== SCHEMA_VERSION) throw new Error("unsupported pal detail cache schema");
    return cache;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return { schemaVersion: SCHEMA_VERSION, updatedAt: null, pals: {} };
  }
}

async function main() {
  const guide = JSON.parse(await readFile(guidePath, "utf8"));
  const cache = await readCache();
  const slugs = [...new Set(guide.pals.map((pal) => String(pal.slug)).filter(Boolean))];
  const pending = (force ? slugs : slugs.filter((slug) => !cache.pals[slug])).slice(0, limit);
  await log(`pal detail refresh started; known=${Object.keys(cache.pals).length} pending=${pending.length}`);

  let fetched = 0;
  const failures = [];
  for (const slug of pending) {
    try {
      cache.pals[slug] = await fetchPalDetail(slug);
      fetched += 1;
    } catch (error) {
      failures.push(`${slug}: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
  }

  // Drop cached Pals that no longer exist upstream so the file cannot grow stale.
  for (const slug of Object.keys(cache.pals)) {
    if (!slugs.includes(slug)) delete cache.pals[slug];
  }

  cache.updatedAt = new Date().toISOString();
  const covered = slugs.filter((slug) => cache.pals[slug]).length;
  // Persist whatever was fetched before judging coverage so a partial or
  // deliberately limited run still makes progress instead of discarding it.
  await atomicWrite(cachePath, cache);
  if (Number.isFinite(limit)) {
    await log(`limited run; coverage check skipped at ${covered}/${slugs.length}`);
  } else if (covered < slugs.length * 0.9) {
    throw new Error(`pal detail coverage too low: ${covered}/${slugs.length}`);
  }
  await log(`pal detail refresh completed; fetched=${fetched} covered=${covered}/${slugs.length} failures=${failures.length}`);
  if (failures.length) await log(`failures: ${failures.slice(0, 20).join(" | ")}`);
  console.log(`pal details: fetched=${fetched} covered=${covered}/${slugs.length} failures=${failures.length}`);
}

await main();
