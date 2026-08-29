export class RecipeCycleError extends Error {
  constructor(path) {
    super(`recipe cycle: ${path.join(" -> ")}`);
    this.name = "RecipeCycleError";
    this.path = path;
  }
}

export function createItemIndex(data) {
  return {
    data,
    items: new Map(data.items.map((item) => [item.id, item])),
    structures: new Map(data.structures.map((structure) => [structure.id, structure])),
  };
}

function add(map, id, quantity) {
  map.set(id, (map.get(id) ?? 0) + quantity);
}

export function expandItemMaterials(itemId, quantity, index) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new RangeError("quantity must be a positive integer");
  if (!index.items.has(itemId)) throw new Error(`unknown item: ${itemId}`);
  const rawMaterials = new Map();
  const crafts = [];

  const visit = (id, required, path) => {
    const item = index.items.get(id);
    if (path.includes(id)) throw new RecipeCycleError([...path, id]);
    if (!item.recipe) {
      add(rawMaterials, id, required);
      return;
    }
    const batches = Math.ceil(required / item.recipe.outputQuantity);
    crafts.push({ itemId: id, required, batches, produced: batches * item.recipe.outputQuantity });
    for (const material of item.recipe.materials) visit(material.itemId, material.quantity * batches, [...path, id]);
  };

  visit(itemId, quantity, []);
  return { rawMaterials, crafts };
}

// The flat totals answer "what do I farm"; the tree answers "what do I craft on
// the way there". Both run the same batch math so their numbers never disagree.
export function buildCraftTree(itemId, quantity, index) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new RangeError("quantity must be a positive integer");
  if (!index.items.has(itemId)) throw new Error(`unknown item: ${itemId}`);

  const visit = (id, required, path) => {
    if (path.includes(id)) throw new RecipeCycleError([...path, id]);
    const item = index.items.get(id);
    if (!item?.recipe) return { itemId: id, required, depth: path.length, craftable: false, children: [] };
    const batches = Math.ceil(required / item.recipe.outputQuantity);
    const produced = batches * item.recipe.outputQuantity;
    return {
      itemId: id, required, depth: path.length, craftable: true,
      batches, produced, surplus: produced - required,
      outputQuantity: item.recipe.outputQuantity,
      stations: item.recipe.stations ?? [],
      children: item.recipe.materials.map((material) => visit(material.itemId, material.quantity * batches, [...path, id])),
    };
  };

  return visit(itemId, quantity, []);
}

export function buildStructureCraftTree(structureId, quantity, index) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new RangeError("quantity must be a positive integer");
  const structure = index.structures.get(structureId);
  if (!structure) throw new Error(`unknown structure: ${structureId}`);
  return {
    itemId: structureId, required: quantity, depth: 0, craftable: true, structure: true,
    batches: quantity, produced: quantity, surplus: 0, outputQuantity: 1, stations: [],
    children: (structure.materials ?? []).map((material) => buildCraftTree(material.itemId, material.quantity * quantity, index)),
  };
}

// Totals for "starting from nothing": raw materials to gather, plus how much of
// every intermediate item has to be crafted across all branches that need it.
export function summarizeCraftTree(tree) {
  const rawMaterials = new Map();
  const crafts = new Map();

  const walk = (node, isRoot) => {
    if (!node.craftable) {
      add(rawMaterials, node.itemId, node.required);
      return;
    }
    if (!isRoot) {
      const totals = crafts.get(node.itemId) ?? { required: 0, batches: 0, produced: 0 };
      totals.required += node.required;
      totals.batches += node.batches;
      totals.produced += node.produced;
      crafts.set(node.itemId, totals);
    }
    for (const child of node.children) walk(child, false);
  };

  walk(tree, true);
  return { rawMaterials, crafts };
}

export function expandStructureMaterials(structureId, quantity, index) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new RangeError("quantity must be a positive integer");
  const structure = index.structures.get(structureId);
  if (!structure) throw new Error(`unknown structure: ${structureId}`);
  const rawMaterials = new Map();
  const crafts = [];
  for (const material of structure.materials) {
    const expanded = expandItemMaterials(material.itemId, material.quantity * quantity, index);
    for (const [id, amount] of expanded.rawMaterials) add(rawMaterials, id, amount);
    crafts.push(...expanded.crafts);
  }
  return { rawMaterials, crafts };
}
