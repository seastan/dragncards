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
    const sides = card.sides || {};
    const sideKeys = Object.keys(sides);
    const frontSide = card.currentSide || sideKeys[0] || 'A';
    const backSide  = sideKeys.find(s => s !== frontSide) || frontSide;
    const angle = frontSide !== 'A' ? 180 : 0;
    const frontFace = sides[frontSide] || {};
    const faceW = frontFace.width  || gameDef?.cardBacks?.[frontFace.name]?.width  || null;
    const faceH = frontFace.height || gameDef?.cardBacks?.[frontFace.name]?.height || null;
    return {
      id: i,
      frontImageUrl: resolveImageUrl(sides[frontSide], gameDef, language),
      backImageUrl:  resolveImageUrl(sides[backSide],  gameDef, language),
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

    assignments[groupId] = stacks;
  });

  return { cardDescriptors, assignments, idMap };
}
