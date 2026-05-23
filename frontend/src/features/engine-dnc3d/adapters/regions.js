// Converts a dragncards layout.regions object into the dnc3d REGIONS format.
// dragncards coordinates are 0-1 fractions (or "5%"/"1/20" strings).
// dnc3d uses 0-100 numbers.

function toPercent(val) {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val * 100;
  if (typeof val === 'string') {
    if (val.endsWith('%')) return parseFloat(val);
    const m = val.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
    if (m) return (parseFloat(m[1]) / parseFloat(m[2])) * 100;
    return parseFloat(val) * 100;
  }
  return 0;
}

// Mirrors the substitution logic from useFormatGroupId / useFormatGroupId.js.
// observingPlayerN is a string like "player1"; numPlayers is an integer.
export function formatGroupId(groupId, observingPlayerN, numPlayers) {
  if (!groupId || !observingPlayerN) return groupId;
  const playerIndex = parseInt(observingPlayerN.replace('player', '')) - 1;

  // {playerN+X} / {playerN-X} — relative player offset
  const relPattern = /\{playerN([+-]\d+)\}/g;
  if (relPattern.test(groupId)) {
    return groupId.replace(/\{playerN([+-]\d+)\}/g, (_, offset) => {
      const n = numPlayers || 1;
      return `player${((playerIndex + parseInt(offset)) % n) + 1}`;
    });
  }
  // playerN+X / playerN-X without braces
  const relNoBrace = /playerN([+-]\d+)/g;
  if (relNoBrace.test(groupId)) {
    return groupId.replace(/playerN([+-]\d+)/g, (_, offset) => {
      const n = numPlayers || 1;
      return `player${((playerIndex + parseInt(offset)) % n) + 1}`;
    });
  }
  // Plain {playerN} and playerN
  groupId = groupId.replace(/\{playerN\}/g, observingPlayerN);
  groupId = groupId.replace(/playerN/g, observingPlayerN);
  return groupId;
}

// Maps dragncards region types to dnc3d region types.
// dnc3d supports: 'free' | 'row' | 'fan' | 'pile'
const TYPE_MAP = {
  free: 'free',
  row:  'row',
  fan:  'fan',
  pile: 'pile',
  // dragncards aliases
  hand: 'fan',
};

export function adaptRegions(layoutRegions, observingPlayerN, numPlayers, groupById = {}) {
  if (!layoutRegions) return {};
  const regions = {};
  Object.entries(layoutRegions).forEach(([, region]) => {
    if (region.visible === false) return;
    const rawGroupId = region.groupId;
    if (!rawGroupId) return;
    const groupId = formatGroupId(rawGroupId, observingPlayerN, numPlayers);
    const type = TYPE_MAP[region.type] || 'free';
    const tableLabel = groupById[groupId]?.tableLabel || null;
    regions[groupId] = {
      left:   toPercent(region.left),
      top:    toPercent(region.top),
      width:  toPercent(region.width),
      height: toPercent(region.height),
      type,
      ...(tableLabel             ? { label:             tableLabel }             : {}),
      ...(region.direction       ? { direction:         region.direction }       : {}),
      ...(region.layerIndex      ? { layerIndex:         region.layerIndex }      : {}),
      ...(region.backgroundColor ? { backgroundColor:   region.backgroundColor } : {}),
    };
  });
  return regions;
}

// Returns just the toPercent helper for use in other modules.
export { toPercent };
