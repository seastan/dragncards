import { formatGroupId } from './regions';

// Resolves a card face's imageUrl using the gameDef prefix/language system,
// mirroring the logic in useVisibleFaceSrc without needing React hooks.
export function resolveImageUrl(face, gameDef, language) {
  if (!face) return null;
  const srcBase = face.imageUrl;
  if (!srcBase) {
    // No url → card back
    return gameDef?.cardBacks?.[face.name]?.imageUrl || null;
  }
  if (srcBase.startsWith('http')) return srcBase;
  // Suffix path: prepend language-specific or default prefix
  const srcLanguage = gameDef?.imageUrlPrefix?.[language]
    ? gameDef.imageUrlPrefix[language] + srcBase
    : null;
  const srcDefault = gameDef?.imageUrlPrefix?.Default
    ? gameDef.imageUrlPrefix.Default + srcBase
    : null;
  return srcLanguage || srcDefault || null;
}

// Converts dragncards game state into the format expected by the dnc3d engine's init.
//
// Returns:
//   cardDescriptors — array of { id, frontImageUrl, backImageUrl, angle }
//                     indexed 0..N, one per card in game.cardById
//   assignments     — { [groupId]: [{ cardIds: [int,...], attachmentDirections, fracX, fracY }] }
//   idMap           — Map<dcCardId, dnc3dIndex> for mapping action callbacks back
export function adaptGameState(game, layoutRegions, gameDef, language, observingPlayerN, numPlayers) {
  const { cardById = {}, stackById = {}, groupById = {} } = game || {};

  // 1. Determine which groups have a visible layout region.
  //    Cards in groups without a region are not rendered at all.
  const visibleGroupIds = new Set();
  Object.values(layoutRegions || {}).forEach(region => {
    if (region.visible === false || !region.groupId) return;
    visibleGroupIds.add(formatGroupId(region.groupId, observingPlayerN, numPlayers));
  });

  // 2. Build integer index mapping for visible cards only
  const visibleCardIds = Object.keys(cardById).filter(
    dcId => visibleGroupIds.has(cardById[dcId]?.groupId)
  );
  const idMap = new Map(visibleCardIds.map((dcId, i) => [dcId, i]));

  // 3. Build card descriptors for visible cards
  const cardDescriptors = visibleCardIds.map((dcId, i) => {
    const card = cardById[dcId];
    const sides    = card.sides || {};
    const sideKeys = Object.keys(sides);
    // Front face element always holds side A; back face element always holds side B.
    // angle 0 → front visible (A), angle 180 → back visible (B).
    const sideA = sideKeys.includes('A') ? 'A' : (sideKeys[0] || 'A');
    const sideB = sideKeys.find(s => s !== sideA) || sideA;
    const angle = (card.currentSide && card.currentSide !== sideA) ? 180 : 0;
    const currentFace = sides[card.currentSide || sideA] || {};
    const faceW = currentFace.width  || gameDef?.cardBacks?.[currentFace.name]?.width  || null;
    const faceH = currentFace.height || gameDef?.cardBacks?.[currentFace.name]?.height || null;
    return {
      id: i,
      frontImageUrl: resolveImageUrl(sides[sideA], gameDef, language),
      backImageUrl:  resolveImageUrl(sides[sideB],  gameDef, language),
      angle,
      faceW,
      faceH,
    };
  });

  // 4. Build assignments keyed by groupId (with playerN substitution)
  const assignments = {};
  Object.entries(layoutRegions || {}).forEach(([, region]) => {
    if (region.visible === false) return;
    const rawGroupId = region.groupId;
    if (!rawGroupId) return;
    const groupId = formatGroupId(rawGroupId, observingPlayerN, numPlayers);
    if (!groupById[groupId]) return;

    const group = groupById[groupId];
    const stacks = [];

    (group.stackIds || []).forEach(stackId => {
      const stack = stackById[stackId];
      if (!stack) return;

      const dnc3dCardIds = (stack.cardIds || [])
        .map(dcId => idMap.get(dcId))
        .filter(id => id !== undefined);
      if (!dnc3dCardIds.length) return;

      const attachmentDirections = (stack.cardIds || []).slice(1).map(dcId => {
        const dir = cardById[dcId]?.attachmentDirection;
        return (dir === 'left' || dir === 'right') ? dir : 'right';
      });

      stacks.push({
        cardIds: dnc3dCardIds,
        attachmentDirections,
        fracX: stack.left  ?? null,
        fracY: stack.top   ?? null,
      });
    });

    // dragncards stores a pile's top card at stackIds[0], but the dnc3d pile
    // layout renders the LAST slot at the highest stackZ (visual top). Reverse so
    // the game's top card maps to the engine's top slot — otherwise the top card
    // sits at the visual bottom and draws appear to originate from underneath the pile.
    assignments[groupId] = region.type === 'pile' ? stacks.reverse() : stacks;
  });

  return { cardDescriptors, assignments, idMap };
}
