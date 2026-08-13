#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const args = process.argv.slice(2);
const rootArg = args.indexOf("--root");
const root = rootArg >= 0 && args[rootArg + 1] ? args[rootArg + 1] : process.cwd();
const sourcePath = join(root, ".work", "guide-data.json");
const destination = join(root, "site", "data", "guide-data.json");
const guide = JSON.parse(await readFile(sourcePath, "utf8"));

const publicGuide = {
  schemaVersion: guide.schemaVersion,
  generatedAt: guide.generatedAt,
  gameVersion: guide.gameVersion,
  freshness: guide.freshness,
  notices: guide.notices,
  sources: guide.sources,
  pals: guide.pals,
  roles: guide.roles,
  editorial: guide.editorial,
  builds: guide.builds,
  map: {
    bounds: guide.map.bounds,
    points: guide.map.points,
    counts: guide.map.counts,
  },
  publication: {
    scope: "guide-only",
    excludes: ["server status", "players", "IP addresses", "credentials", "Discord configuration"],
    generatedBy: "GitHub Actions without access to the home server",
  },
};

if (publicGuide.pals.length < 250 || publicGuide.map.points.length < 300 || !publicGuide.sources.some((source) => source.id === "map-collectables")) {
  throw new Error("public guide sanitization validation failed");
}

const serialized = `${JSON.stringify(publicGuide, null, 2)}\n`;
const forbidden = [/discordToken/i, /adminPassword/i, /192\.168\./, /player-registry/i];
for (const pattern of forbidden) {
  if (pattern.test(serialized)) throw new Error(`forbidden public data matched ${pattern}`);
}

await mkdir(join(root, "site", "data"), { recursive: true });
await writeFile(destination, serialized, "utf8");
process.stdout.write(`${JSON.stringify({ ok: true, destination, pals: publicGuide.pals.length, points: publicGuide.map.points.length })}\n`);
