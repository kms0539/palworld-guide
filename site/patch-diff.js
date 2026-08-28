export function diffRecords(before = {}, after = {}) {
  const added = [], removed = [], changed = [];
  for (const id of Object.keys(after)) {
    if (!(id in before)) added.push(id);
    else if (JSON.stringify(before[id]) !== JSON.stringify(after[id])) changed.push(id);
  }
  for (const id of Object.keys(before)) if (!(id in after)) removed.push(id);
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort() };
}

export function createPatchReport(fromVersion, toVersion, sections) {
  const changes = Object.fromEntries(Object.entries(sections).map(([id, pair]) => [id, diffRecords(pair.before, pair.after)]));
  const totalChanges = Object.values(changes).reduce((sum, group) => sum + group.added.length + group.removed.length + group.changed.length, 0);
  return { schemaVersion: 1, fromVersion, toVersion, status: "requires-review", publishApproved: false, totalChanges, changes };
}
