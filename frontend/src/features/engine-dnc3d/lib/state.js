export function createState(REGIONS) {
  // ── Cards ──────────────────────────────────────────────────────────────────
  const cards = [];

  // ── Stacks ─────────────────────────────────────────────────────────────────
  // A Stack is the drag unit: { id, cardIds: [parentId, ...attachmentIds] }
  // Every card belongs to exactly one stack (even singletons).
  const stacks = {};
  let _nextStackId = 0;

  function createStack(cardIds) {
    const id = _nextStackId++;
    const stack = { id, cardIds: [...cardIds] };
    stacks[id] = stack;
    cardIds.forEach((cid, idx) => {
      cards[cid].stackId = id;
      if (idx === 0) cards[cid].attachmentDirection = null;
    });
    return stack;
  }

  function destroyStack(stackId) {
    delete stacks[stackId];
  }

  // Splits a multi-card stack into N singleton stacks.
  // Removes the source stack from its region's stackIds.
  // Returns the new stackIds in order.
  function splitStack(stackId) {
    const stack = stacks[stackId];
    if (!stack) return [];
    const srcRegion = cards[stack.cardIds[0]].regionId;
    if (srcRegion) {
      const arr = regionState[srcRegion].stackIds;
      const idx = arr.indexOf(stackId);
      if (idx !== -1) arr.splice(idx, 1);
    }
    const newStackIds = stack.cardIds.map(cid => {
      const ns = { id: _nextStackId++, cardIds: [cid] };
      stacks[ns.id] = ns;
      cards[cid].stackId = ns.id;
      cards[cid].attachmentDirection = null;
      // regionId stays intact — callers will move/insert as needed
      return ns.id;
    });
    destroyStack(stackId);
    return newStackIds;
  }

  // Merges sourceStack's cards onto the end of targetStack.
  // Updates stackId and regionId for transferred cards.
  // Removes source from its old region's stackIds.
  // Destroys the source stack.
  function attachStack(sourceStackId, targetStackId, attachmentDirection) {
    const src = stacks[sourceStackId];
    const tgt = stacks[targetStackId];
    if (!src || !tgt) return;
    const srcRegion = cards[src.cardIds[0]].regionId;
    const tgtRegion = cards[tgt.cardIds[0]].regionId;
    if (srcRegion) {
      const arr = regionState[srcRegion].stackIds;
      const idx = arr.indexOf(sourceStackId);
      if (idx !== -1) arr.splice(idx, 1);
    }
    src.cardIds.forEach(cid => {
      tgt.cardIds.push(cid);
      cards[cid].stackId = targetStackId;
      cards[cid].regionId = tgtRegion;
      cards[cid].attachmentDirection = attachmentDirection;
    });
    destroyStack(sourceStackId);
  }

  // Moves a stack to a new region (pure state — callers call layoutRegion after).
  function moveStackToRegion(stackId, newRegionId) {
    const stack = stacks[stackId];
    if (!stack) return;
    const oldRegionId = cards[stack.cardIds[0]].regionId;
    if (oldRegionId) {
      const arr = regionState[oldRegionId].stackIds;
      const idx = arr.indexOf(stackId);
      if (idx !== -1) arr.splice(idx, 1);
    }
    stack.cardIds.forEach(cid => { cards[cid].regionId = newRegionId; });
    if (newRegionId) regionState[newRegionId].stackIds.push(stackId);
  }

  // ── Region state ────────────────────────────────────────────────────────────
  const regionState = Object.fromEntries(
    Object.keys(REGIONS).map(id => [id, { stackIds: [], scrollOffset: 0 }])
  );

  // ── Z-ordering ──────────────────────────────────────────────────────────────
  let _topZ = 10;
  function nextTopZ() { return ++_topZ; }

  return { cards, stacks, regionState, createStack, destroyStack, splitStack, attachStack, moveStackToRegion, nextTopZ };
}
