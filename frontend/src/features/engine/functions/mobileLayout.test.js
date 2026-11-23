import { buildMobileLayout, selectLayout } from './mobileLayout';
import { validateSchema } from '../../myplugins/validate/validateGameDef';
import { getGameDefSchema } from '../../myplugins/validate/getGameDefSchema';

const mobileLayout = {
  cardSize: 18,
  rowSpacing: 3,
  regions: {
    sharedStaging: { groupId: 'sharedStagingArea', type: 'row', left: 0, top: 0, width: 1, height: '1/5' },
    playerNPlay1:  { groupId: 'playerNPlay1', type: 'row', left: 0, top: '2/5', width: 1, height: '1/5' },
    playerNHand:   { groupId: 'playerNHand', type: 'fan', left: 0, top: '4/5', width: 1, height: '1/5', perspective: 'self' },
    sharedSetAside:{ groupId: 'sharedSetAside', type: 'fan', left: 0, top: '1/5', width: 1, height: '1/5', visible: false },
  },
};

const liveLayout = {
  cardSize: 13,
  rowSpacing: 4,
  chat: { left: 0, top: 0, width: 0.2, height: 0.2 },
  regions: {
    sharedSetAside: { groupId: 'sharedSetAside', type: 'fan', left: 0, top: 0, width: 0.1, height: 0.5, visible: true },
  },
};

const state = (overrides = {}) => ({
  playerUi: { mobileUI: true, playerN: 'player1', observingPlayerN: 'player2', ...overrides },
  gameUi: { game: { layout: liveLayout, playerData: { player2: { layout: liveLayout } } } },
});

describe('buildMobileLayout', () => {
  const built = buildMobileLayout(mobileLayout, liveLayout, 'player1');

  test('pins perspective:self regions to the viewer seat', () => {
    expect(built.regions.playerNHand.groupId).toBe('player1Hand');
  });

  test('leaves viewed-player regions for observingPlayerN substitution', () => {
    expect(built.regions.playerNPlay1.groupId).toBe('playerNPlay1');
  });

  test('takes region visibility from the live layout', () => {
    expect(built.regions.sharedSetAside.visible).toBe(true);
  });

  test('syncVisibility:false keeps the mobile value', () => {
    const optOut = { ...mobileLayout, regions: { ...mobileLayout.regions, sharedSetAside: { ...mobileLayout.regions.sharedSetAside, syncVisibility: false } } };
    expect(buildMobileLayout(optOut, liveLayout, 'player1').regions.sharedSetAside.visible).toBe(false);
  });

  test('uses its own cardSize, has no table chat, and is flagged mobile', () => {
    expect(built.cardSize).toBe(18);
    expect(built.chat).toBeNull();
    expect(built.isMobile).toBe(true);
  });
});

describe('selectLayout', () => {
  test('returns the live layout when mobile UI is off', () => {
    expect(selectLayout(state({ mobileUI: false }), { mobileLayout })).toBe(liveLayout);
  });

  test('returns the live layout when the plugin has no mobileLayout', () => {
    expect(selectLayout(state(), {})).toBe(liveLayout);
  });

  test('returns a stable mobile layout across calls with the same inputs', () => {
    const s = state();
    const a = selectLayout(s, { mobileLayout });
    const b = selectLayout(s, { mobileLayout });
    expect(a.isMobile).toBe(true);
    expect(a).toBe(b);
  });
});

describe('mobileLayout schema', () => {
  const schema = getGameDefSchema({}).mobileLayout;
  const gameDef = { groups: { sharedStagingArea: {}, sharedSetAside: {}, player1Play1: {}, player1Hand: {} } };

  test('accepts a mobile layout without a chat box', () => {
    const errors = [];
    validateSchema(gameDef, 'gameDef.mobileLayout', mobileLayout, schema, errors);
    expect(errors.filter(e => !/groupId/i.test(e))).toEqual([]);
  });

  test('rejects an unknown perspective', () => {
    const bad = { ...mobileLayout, regions: { x: { ...mobileLayout.regions.playerNHand, perspective: 'everyone' } } };
    const errors = [];
    validateSchema(gameDef, 'gameDef.mobileLayout', bad, schema, errors);
    expect(errors.some(e => /perspective/.test(e))).toBe(true);
  });
});

describe('top banner text box', () => {
  const ml = {
    cardSize: 12,
    regions: { a: { groupId: 'g', type: 'row', left: 0, top: 0, width: 1, height: '1/2' },
               b: { groupId: 'h', type: 'row', left: 0, top: '50%', width: 1, height: 0.5 } },
    textBoxes: { banner: { label: '', left: 0, top: 0, width: 1, height: '10%', hover: true } },
  };
  test('squeezes regions below a visible banner', () => {
    const built = buildMobileLayout(ml, { textBoxes: { banner: { visible: true, label: 'hi' } } }, 'player1');
    expect(built.regions.a.top).toBeCloseTo(0.1);
    expect(built.regions.a.height).toBeCloseTo(0.45);
    expect(built.regions.b.top).toBeCloseTo(0.55);
  });
  test('leaves regions alone while the banner is hidden', () => {
    const built = buildMobileLayout(ml, { textBoxes: { banner: { visible: false } } }, 'player1');
    expect(built.regions.a.top).toBe(0);
    expect(built.regions.b.top).toBe('50%');
  });
});
