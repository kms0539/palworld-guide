import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { translateDescription } from "./trait-korean.mjs";


// Pal recommendations name traits and passive skills without saying what they do.
// This builds the catalogue once so the site can resolve any trait name to its
// effect, both in a browsable tab and in tooltips next to a recommendation.

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = rootArg >= 0 && args[rootArg + 1] ? args[rootArg + 1] : process.cwd();
const outputPath = join(root, "site", "data", "traits.json");
const logPath = join(root, ".work", "trait-catalog.log");
const namesPath = join(root, "site", "data", "trait-names-ko.json");
const SOURCE_URL = "https://www.palworld.tools/traits";
const SCHEMA_VERSION = 1;
const MIN_TRAITS = 60;

function decodeEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripTags(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function parseTraits(html) {
  const traits = [];
  const seen = new Set();
  // Each row exposes the trait name in a bold span and its effect in the muted
  // line underneath; the rating badge sits in the row's trailing cell.
  const namePattern = /<span class="font-extrabold text-\[14\.5px\][^"]*">([\s\S]*?)<\/span>/g;
  let match;
  while ((match = namePattern.exec(html))) {
    const name = stripTags(match[1]);
    if (!name || seen.has(name)) continue;
    const tail = html.slice(match.index, match.index + 2400);

    // A trait can carry several effects, each in its own element. Mark the
    // boundaries before stripping so they do not read as one run-on sentence.
    const descriptionHtml = (tail.match(/<div class="text-\[#97979d\] text-\[12px\] mt-\[3px\] leading-snug">([\s\S]*?)<\/div>\s*<div/) ?? [])[1]
      ?? (tail.match(/<div class="text-\[#97979d\] text-\[12px\] mt-\[3px\] leading-snug">([\s\S]*?)<\/div>/) ?? [])[1]
      ?? "";
    // Effects are separated by newlines in the source, so split before the
    // usual whitespace collapse or they read as one run-on sentence.
    const effects = decodeEntities(descriptionHtml.replace(/<[^>]*>/g, "\n"))
      .split(/\r?\n/)
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const description = effects.join(" · ");
    if (!description) continue;

    const ratingText = (tail.match(/<span[^>]*class="font-mono text-\[11px\] font-bold[^"]*"[^>]*>\s*([+-]?\d+)\s*<\/span>/) ?? [])[1];
    const rating = ratingText === undefined ? null : Number(ratingText);
    const stacks = /class="[^"]*cursor-help[^"]*"[^>]*>\s*stacks\s*</.test(tail) || /">stacks</.test(tail);
    const color = (tail.match(/--tc:(#[0-9a-fA-F]{3,8})/) ?? [])[1] ?? null;

    const korean = translateDescription(description);
    seen.add(name);
    traits.push({
      name,
      description,
      descriptionKo: korean.description,
      untranslated: korean.untranslated,
      rating: Number.isFinite(rating) ? rating : null,
      // A positive rating is a desirable trait; negatives are penalties players
      // breed away. Neutral entries keep a null rating.
      polarity: rating === null || !Number.isFinite(rating) ? "neutral" : rating > 0 ? "positive" : rating < 0 ? "negative" : "neutral",
      stacks,
      color,
    });
  }
  return traits;
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

// Korean names are a committed snapshot rather than a live fetch: palworld.gg
// paginates client-side, so a plain request only ever returns the first 60 of
// 161. scripts/README documents how to refresh it when the game adds passives.
async function readKoreanNames() {
  const snapshot = JSON.parse(await readFile(namesPath, "utf8"));
  if (snapshot.schemaVersion !== 1 || !snapshot.names) throw new Error("unsupported Korean name snapshot");
  return new Map(Object.entries(snapshot.names));
}

async function main() {
  const response = await fetch(SOURCE_URL, {
    headers: { "user-agent": "palworld-guide/1.0 (+https://github.com/kms0539/palworld-guide)" },
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${SOURCE_URL}`);
  const traits = parseTraits(await response.text());

  if (traits.length < MIN_TRAITS) throw new Error(`trait catalogue unexpectedly small: ${traits.length}`);
  if (!traits.some((trait) => trait.polarity === "positive") || !traits.some((trait) => trait.polarity === "negative")) {
    throw new Error("trait catalogue is missing positive or negative entries");
  }

  // Publishing an English effect line to a Korean guide is a silent regression,
  // so unseen wording fails the refresh instead of leaking through.
  const missing = traits.flatMap((trait) => trait.untranslated);
  if (missing.length > 0) {
    await log(`untranslated effects: ${[...new Set(missing)].join(" | ")}`);
    throw new Error(`${new Set(missing).size} trait effects have no Korean rule: ${[...new Set(missing)].slice(0, 5).join(" | ")}`);
  }
  for (const trait of traits) delete trait.untranslated;

  let koreanNames = new Map();
  try {
    koreanNames = await readKoreanNames();
  } catch (error) {
    await log(`Korean trait names unavailable, keeping English: ${error.message}`);
  }
  for (const trait of traits) trait.nameKo = koreanNames.get(trait.name) ?? "";
  const localized = traits.filter((trait) => trait.nameKo).length;
  await log(`Korean trait names: ${localized}/${traits.length} (snapshot has ${koreanNames.size})`);
  // A collapse means the snapshot drifted away from the effect catalogue.
  if (koreanNames.size > 0 && localized < traits.length * 0.6) {
    throw new Error(`Korean trait names covered only ${localized}/${traits.length}; refresh the snapshot`);
  }

  traits.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name));
  await atomicWrite(outputPath, {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    counts: {
      total: traits.length,
      positive: traits.filter((trait) => trait.polarity === "positive").length,
      negative: traits.filter((trait) => trait.polarity === "negative").length,
      localizedNames: traits.filter((trait) => trait.nameKo).length,
    },
    traits,
  });
  await log(`trait catalogue updated: ${traits.length} traits`);
  console.log(`traits: ${traits.length} (positive ${traits.filter((t) => t.polarity === "positive").length}, negative ${traits.filter((t) => t.polarity === "negative").length})`);
}

await main();
