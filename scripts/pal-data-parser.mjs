function balancedObject(text, start) {
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
}

export function nextPayloadText(html) {
  const chunks = [];
  const scripts = /<script>self\.__next_f\.push\(([\s\S]*?)\)<\/script>/g;
  let match;
  while ((match = scripts.exec(html))) {
    try {
      const payload = JSON.parse(match[1]);
      for (const item of payload) {
        if (typeof item === "string") chunks.push(item);
      }
    } catch {
      // Next.js may emit non-data bootstrap chunks. They are unrelated to the
      // structured skill records and can be skipped safely.
    }
  }
  return chunks.join("\n");
}

export function parseSkillCatalogue(html) {
  const payload = nextPayloadText(html);
  const skills = new Map();
  const anchors = /\{"id":"[^"]+","name":"/g;
  let match;
  while ((match = anchors.exec(payload))) {
    const serialized = balancedObject(payload, match.index);
    if (!serialized) continue;
    try {
      const record = JSON.parse(serialized);
      if (!record.id || !record.name || !record.element || !Number.isFinite(record.power) || !Number.isFinite(record.cooldown)) continue;
      skills.set(record.id, {
        id: String(record.id),
        name: String(record.name),
        description: String(record.desc ?? "").replace(/\s+/g, " ").trim(),
        element: String(record.element),
        category: String(record.category ?? ""),
        power: Number(record.power),
        cooldown: Number(record.cooldown),
      });
    } catch {
      // A malformed upstream record is ignored and later exposed as an
      // unresolved internal ID instead of being guessed.
    }
  }
  return skills;
}

export function resolveMoves(moves, catalogue) {
  return (moves ?? []).map((entry) => {
    const id = typeof entry === "string" ? entry : entry.move;
    const skill = catalogue.get(id);
    return {
      id,
      level: typeof entry === "string" ? null : Number(entry.level),
      name: skill?.name ?? null,
      description: skill?.description ?? null,
      element: skill?.element ?? null,
      category: skill?.category ?? null,
      power: skill?.power ?? null,
      cooldown: skill?.cooldown ?? null,
    };
  });
}
