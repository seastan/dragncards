import { formatGroupId } from './regions';
import { normalizeAttachDirection } from '../lib/config';

// Converts any dragncards coordinate format (number, "50%", "1/20") to a 0-1 fraction.
// Format-only — no coordinate-system conversion.
function parseFrac(val) {
  if (val == null) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    if (val.endsWith('%')) { const n = parseFloat(val); return isNaN(n) ? null : n / 100; }
    const m = val.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (m) return parseFloat(m[1]) / parseFloat(m[2]);
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }
  return null;
}

// Converts a stack.left/top position value to a 0-1 tilt-relative fraction.
// Number values are already tilt-relative (stored by 3D drag in onCardMove).
// String values ("50%", "1/20") are region-relative (2D engine / game def) —
// convert using the enclosing region's tilt-relative bounds.
function stackPosToFrac(val, regionOrigin, regionSize) {
  if (val == null) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const pct = parseFrac(val);
  if (pct == null) return null;
  return regionOrigin + pct * regionSize;
}

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
//   cardDescriptors — array of { id, frontImageUrl, backImageUrl, angle,
//                     faceW, faceH, borderColor } indexed 0..N, one per card
//                     in game.cardById
//   assignments     — { [groupId]: [{ cardIds: [int,...], attachmentDirections, lookingUnder, fracX, fracY }] }
//   idMap           — Map<dcCardId, dnc3dIndex> for mapping action callbacks back
export function adaptGameState(game, layoutRegions, gameDef, language, observingPlayerN, numPlayers) {
  const { cardById = {}, stackById = {}, groupById = {} } = game || {};

  // 1. Build an integer index mapping for EVERY card in the game, not just the
  //    ones currently in a region this player renders. A card living in a region
  //    this player doesn't show (e.g. another player's hand) still gets an engine
  //    element so that when it later moves into a rendered region (e.g. the shared
  //    table) reconcile can reveal it. Cards that start outside a rendered region
  //    are created hidden (see init) and parked until they move into one.
  const allCardIds = Object.keys(cardById);
  const idMap = new Map(allCardIds.map((dcId, i) => [dcId, i]));

  // 2. Build card descriptors for every card
  const cardDescriptors = allCardIds.map((dcId, i) => {
    const card = cardById[dcId];
    const sides    = card.sides || {};
    const sideKeys = Object.keys(sides);
    // Front face element always holds side A; back face element always holds side B.
    // angle 0 → front visible (A), angle 180 → back visible (B).
    const sideA = sideKeys.includes('A') ? 'A' : (sideKeys[0] || 'A');
    const sideB = sideKeys.find(s => s !== sideA) || sideA;
    // The observing player peeking at a face-down card sees its front (side A).
    const peeking = !!(observingPlayerN && card.peeking && card.peeking[observingPlayerN]);
    const visibleSide = peeking ? sideA : (card.currentSide || sideA);
    const angle = (visibleSide !== sideA) ? 180 : 0;
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
      borderColor: card.borderColor || null,
      // Whether the current face has a triggerable automation ability — drives
      // the lightning-bolt affordance shown on hover (mirrors the 2D AbilityButton).
      hasAbility: currentFace.ability !== undefined && currentFace.ability !== null,
    };
  });

  // 3. Build assignments keyed by groupId (with playerN substitution). Only
  //    groups with a visible region get assignments; every other card stays
  //    parked (regionId null) and hidden until it moves into a rendered region.
  const assignments = {};
  Object.entries(layoutRegions || {}).forEach(([, region]) => {
    if (region.visible === false) return;
    const rawGroupId = region.groupId;
    if (!rawGroupId) return;
    const groupId = formatGroupId(rawGroupId, observingPlayerN, numPlayers);
    if (!groupById[groupId]) return;

    const group = groupById[groupId];
    const stacks = [];

    // Region bounds as 0-1 tilt-relative fractions, for converting region-relative
    // string positions (from 2D engine / game def) to tilt-relative fractions.
    const rLeft = parseFrac(region.left)   ?? 0;
    const rTop  = parseFrac(region.top)    ?? 0;
    const rW    = parseFrac(region.width)  ?? 1;
    const rH    = parseFrac(region.height) ?? 1;

    (group.stackIds || []).forEach(stackId => {
      const stack = stackById[stackId];
      if (!stack) return;

      const dnc3dCardIds = (stack.cardIds || [])
        .map(dcId => idMap.get(dcId))
        .filter(id => id !== undefined);
      if (!dnc3dCardIds.length) return;

      const attachmentDirections = (stack.cardIds || []).slice(1)
        .map(dcId => normalizeAttachDirection(cardById[dcId]?.attachmentDirection));

      stacks.push({
        cardIds: dnc3dCardIds,
        attachmentDirections,
        lookingUnder: !!stack.lookingUnder,
        fracX: stackPosToFrac(stack.left, rLeft, rW),
        fracY: stackPosToFrac(stack.top,  rTop,  rH),
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
