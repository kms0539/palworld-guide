export function createBreedingIndex(data) {
  const byId = new Map(data.pals.map((pal) => [pal.id, pal]));
  const pool = data.pals.filter((pal) => pal.inGenericPool).sort((a, b) => a.combiRank - b.combiRank || a.id.localeCompare(b.id));
  const special = new Map();
  for (const combo of data.specialCombos) {
    const key = pairKey(combo.parentAId, combo.parentBId);
    if (!special.has(key)) special.set(key, []);
    if (!special.get(key).includes(combo.childId)) special.get(key).push(combo.childId);
  }
  return { data, byId, pool, special };
}

export function pairKey(parentAId, parentBId) {
  return [parentAId, parentBId].sort().join("|");
}

export function breed(parentAId, parentBId, index) {
  const parentA = index.byId.get(parentAId);
  const parentB = index.byId.get(parentBId);
  if (!parentA || !parentB) return null;

  const specialChildren = index.special.get(pairKey(parentAId, parentBId));
  if (specialChildren?.length) return { childIds: [...specialChildren], kind: "special", targetRank: null, disputedTie: false };
  if (parentAId === parentBId) return { childIds: [parentAId], kind: "same-species", targetRank: parentA.combiRank, disputedTie: false };

  const targetRank = Math.floor((parentA.combiRank + parentB.combiRank + 1) / 2);
  let distance = Infinity;
  let candidates = [];
  for (const pal of index.pool) {
    const nextDistance = Math.abs(pal.combiRank - targetRank);
    if (nextDistance < distance) {
      distance = nextDistance;
      candidates = [pal];
    } else if (nextDistance === distance) {
      candidates.push(pal);
    }
  }
  if (candidates.length === 0) return null;
  const highestRank = Math.max(...candidates.map((pal) => pal.combiRank));
  const winners = candidates.filter((pal) => pal.combiRank === highestRank).sort((a, b) => a.id.localeCompare(b.id));
  return {
    childIds: [winners[0].id],
    kind: "formula",
    targetRank,
    disputedTie: candidates.some((pal) => pal.combiRank !== highestRank),
  };
}

export function findParentPairs(targetId, index, limit = 250) {
  if (!index.byId.has(targetId)) return [];
  const pairs = [];
  const pals = [...index.byId.values()];
  for (let left = 0; left < pals.length; left += 1) {
    for (let right = left; right < pals.length; right += 1) {
      const result = breed(pals[left].id, pals[right].id, index);
      if (result?.childIds.includes(targetId)) {
        pairs.push({ parentAId: pals[left].id, parentBId: pals[right].id, kind: result.kind, disputedTie: result.disputedTie });
      }
    }
  }
  return pairs.sort((a, b) => (a.kind === "special" ? -1 : 0) - (b.kind === "special" ? -1 : 0)
    || a.parentAId.localeCompare(b.parentAId) || a.parentBId.localeCompare(b.parentBId)).slice(0, limit);
}

export function findShortestPath(ownedIds, targetId, index, maxGenerations = 8) {
  const reachable = new Set(ownedIds.filter((id) => index.byId.has(id)));
  if (reachable.has(targetId)) return { generations: 0, steps: [], reachable: true };
  const recipe = new Map();
  const depth = new Map([...reachable].map((id) => [id, 0]));

  for (let generation = 1; generation <= maxGenerations; generation += 1) {
    const parents = [...reachable];
    const discovered = [];
    for (let left = 0; left < parents.length; left += 1) {
      for (let right = left; right < parents.length; right += 1) {
        const result = breed(parents[left], parents[right], index);
        for (const childId of result?.childIds ?? []) {
          if (reachable.has(childId) || discovered.includes(childId)) continue;
          discovered.push(childId);
          recipe.set(childId, { parentAId: parents[left], parentBId: parents[right], childId, kind: result.kind, disputedTie: result.disputedTie });
          depth.set(childId, generation);
        }
      }
    }
    for (const id of discovered) reachable.add(id);
    if (reachable.has(targetId)) {
      const required = new Map();
      const visit = (id) => {
        const step = recipe.get(id);
        if (!step || required.has(id)) return;
        visit(step.parentAId);
        visit(step.parentBId);
        required.set(id, step);
      };
      visit(targetId);
      return { generations: depth.get(targetId), steps: [...required.values()], reachable: true };
    }
    if (discovered.length === 0) break;
  }
  return { generations: null, steps: [], reachable: false };
}
