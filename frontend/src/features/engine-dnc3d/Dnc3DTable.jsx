import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveCardId, setDropdownMenu, setMouseTopBottom, setMouseXY, setScreenLeftRight, toggleMultiSelectCardId } from '../store/playerUiSlice';
import store from '../../store';
import { createDnc3DEngine } from './lib/engine';
import { playShuffleSound } from './lib/sound';
import { adaptRegions, gameL10n } from './adapters/regions';
import { adaptGameState } from './adapters/cards';
import { buildEngineCallbacks } from './adapters/actions';
import { useBrowseTopN } from '../engine/hooks/useBrowseTopN';
import { useTouchAction } from '../engine/hooks/useTouchAction';
import { useHandleTouchAction } from '../engine/hooks/useHandleTouchAction';
import { useGetDefaultActionForCard } from '../engine/hooks/useGetDefaultAction';
import { DefaultActionLabel } from '../engine/DefaultActionLabel';
import { convertToPercentage, Z_INDEX } from '../engine/functions/common';
import { TableButton } from '../engine/TableButton';
import { Alert } from '../engine/Alert';
import { Prompts } from '../engine/Prompts';
import { Tokens } from '../engine/Tokens';
import { MultiSelectOverlay } from '../engine/MultiSelectOverlay';
import { Dnc3DHudChat } from './Dnc3DHudChat';
import { Dnc3DHudBrowse } from './Dnc3DHudBrowse';
import { Dnc3DTokenExtrudeFilter } from './Dnc3DTokenExtrudeFilter';
import { FadeTextCard } from '../engine/FadeTextCard';
import { FadeTextPlayer } from '../engine/FadeTextPlayer';
import { TOKEN_EXTRUDE, TOKEN_EXTRUDE_FILTER_ID } from './lib/config';
import './Dnc3DTable.css';

// CSS `filter` value handed to each token's <img> when the extrusion prototype
// is on; null when off so the shared Token component renders unchanged.
const TOKEN_EXTRUDE_CSS = TOKEN_EXTRUDE ? `url(#${TOKEN_EXTRUDE_FILTER_ID})` : null;

function CardTokens({ cardId, aspectRatio }) {
  const isActive = useSelector(s => s?.playerUi?.activeCardId === cardId);
  // The token host hangs off liftEl, which never carries the card's rotateZ
  // (layout rotation + exhaust live on cardEl). The engine spins this host's
  // DOM element to match the card's full visual rotation (applyTokenHostRotation),
  // so the +/- regions turn with the card instead of staying screen-top/bottom.
  // The per-token label/extrude counter-rotation (reading Redux game rotation)
  // cancels the game portion back to upright/screen-down.
  // pointer-events:none keeps card hover/click alive through the full-card layer.
  return (
    <>
      <div className="absolute" style={{ inset: 0, pointerEvents: 'none' }}>
        <Tokens cardId={cardId} isActive={isActive} aspectRatio={aspectRatio} extrudeFilter={TOKEN_EXTRUDE_CSS} />
      </div>
      {/* Touch mode's "tap again to <action>" hint. Renders null outside touch
          mode, so this costs nothing on desktop. The token host is the only
          per-card DOM the React tree owns in this renderer, which makes it the
          mounting point for anything that has to sit on a specific card. */}
      <DefaultActionLabel cardId={cardId} counterRotate />
      <FadeTextCard cardId={cardId} />
      <MultiSelectOverlay cardId={cardId} />
    </>
  );
}

// Wrapper component for the dnc3d engine.
//
// Sandbox mode (no game props): renders 20 demo cards in DEFAULT_REGIONS.
//
// Connected mode: pass game, layoutRegions, gameDef, language, doActionList.
// The engine is (re-)initialized whenever the card set changes (deck load).
// Incremental reconciliation for mid-game server updates is Phase 5.
export default function Dnc3DTable({
  tiltDeg      = 25,
  tableOpacity = 100,
  // Connected mode props — all optional; omitting them uses demo mode
  game,
  layoutRegions,
  layoutTextBoxes,
  layoutTableButtons,
  gameDef,
  language,
  doActionList,
}) {
  const dispatch         = useDispatch();
  const browseTopN       = useBrowseTopN();
  const touchMode        = useSelector(s => !!s?.playerUi?.userSettings?.touchMode);
  const touchAction      = useTouchAction();
  const handleTouchAction     = useHandleTouchAction();
  const getDefaultActionForCard = useGetDefaultActionForCard();
  const observingPlayerN = useSelector(s => s?.playerUi?.observingPlayerN);
  const numPlayers       = useSelector(s => s?.gameUi?.game?.numPlayers);
  const cardSize         = useSelector(s => {
    const obs = s?.playerUi?.observingPlayerN;
    return s?.gameUi?.game?.playerData?.[obs]?.layout?.cardSize
        ?? s?.gameUi?.game?.layout?.cardSize
        ?? null;
  });
  const zoomFactor       = useSelector(s => (s?.playerUi?.userSettings?.zoomPercent ?? 100) / 100);
  const tableBackgroundUrl = useSelector(s => {
    const userBg = s?.playerUi?.userSettings?.backgroundUrl;
    if (userBg && userBg !== '') return userBg;
    return null;
  }) || gameDef?.backgroundUrl || null;

  const browseGroupId = useSelector(s => s?.gameUi?.game?.playerData?.[observingPlayerN]?.browseGroup?.id);
  const multiSelectEnabled = useSelector(s => s?.playerUi?.multiSelect?.enabled);
  // Set by the backend (via the SHUFFLE_GROUP gui_update broadcast) whenever a
  // group is shuffled. The nonce changes every shuffle so the effect refires.
  const dnc3dShuffle = useSelector(s => s?.playerUi?.dnc3dShuffle);
  // The hotkey overlay (held Tab) covers the table; while it's up the engine
  // should drop its hover glow rather than strand it on a card the cursor can no
  // longer reach.
  const hotkeyOverlayOpen = useSelector(s => !!s?.playerUi?.keypress?.Tab);

  const [tokenPortals, setTokenPortals] = useState([]);

  const tiltRef         = useRef(null);
  const engineRef       = useRef(null);
  const idMapRef        = useRef(null);
  // Tracks dcCardIds seen on the previous init so we can detect newly-spawned
  // cards on subsequent re-inits and give them the spawn-drop animation.
  // null on first render so first-load cards don't all animate simultaneously.
  const prevCardIdsRef  = useRef(null);
  // Tracks the nonce of the most recently handled (or committed-to) shuffle signal
  // so stale dnc3dShuffle in Redux can't re-trigger the riffle on later re-inits.
  const lastShuffleNonceRef = useRef(null);
  const tiltDegRef = useRef(tiltDeg);
  tiltDegRef.current = tiltDeg;

  // Live refs — always hold the latest prop values so the engine-init effect
  // can read them without needing to be listed as deps (which would cause
  // re-initialization on every Redux tick).
  const gameRef            = useRef(game);
  const layoutRef          = useRef(layoutRegions);
  const gameDefRef         = useRef(gameDef);
  const languageRef        = useRef(language);
  const doActionListRef    = useRef(doActionList);
  const observingPlayerRef = useRef(observingPlayerN);
  const numPlayersRef      = useRef(numPlayers);
  const cardSizeRef           = useRef(cardSize);
  const zoomFactorRef         = useRef(zoomFactor);
  const tableBackgroundUrlRef = useRef(tableBackgroundUrl);
  const browseGroupIdRef      = useRef(browseGroupId);
  const multiSelectEnabledRef = useRef(multiSelectEnabled);
  const touchModeRef          = useRef(touchMode);
  const touchActionRef        = useRef(touchAction);
  const handleTouchActionRef  = useRef(handleTouchAction);
  const getDefaultActionRef   = useRef(getDefaultActionForCard);
  gameRef.current            = game;
  layoutRef.current          = layoutRegions;
  gameDefRef.current         = gameDef;
  languageRef.current        = language;
  doActionListRef.current    = doActionList;
  observingPlayerRef.current = observingPlayerN;
  numPlayersRef.current      = numPlayers;
  cardSizeRef.current           = cardSize;
  zoomFactorRef.current         = zoomFactor;
  tableBackgroundUrlRef.current = tableBackgroundUrl;
  browseGroupIdRef.current      = browseGroupId;
  multiSelectEnabledRef.current = multiSelectEnabled;
  touchModeRef.current          = touchMode;
  touchActionRef.current        = touchAction;
  handleTouchActionRef.current  = handleTouchAction;
  getDefaultActionRef.current   = getDefaultActionForCard;

  // Re-initialize the engine whenever the card set changes.
  // This handles: switching to dnc3d after cards are loaded, and loading a
  // deck while already in dnc3d mode. cardCount is a stable numeric dep that
  // only changes on deck load — not on every card state update.
  const cardCount = Object.keys(game?.cardById || {}).length;

  // Re-initialize when the visible region set / geometry changes too. Toggling
  // an overlay region on doesn't change cardCount (game.cardById holds every
  // card regardless of which regions are visible), and the engine only builds
  // DOM + cards for groups that have a visible region — so without this the
  // newly-toggled region (and its cards) would never appear. The key captures
  // each visible region's group, type, layer and geometry; the observing player
  // and player count affect groupId resolution, so they're folded in too.
  const regionsKey = useMemo(() => {
    const regions = layoutRegions || {};
    return Object.keys(regions)
      .map(k => {
        const r = regions[k];
        if (r?.visible === false || !r?.groupId) return null;
        return `${r.groupId}|${r.type}|${r.layerIndex || 0}|${r.direction || ''}|${r.rotation || 0}|${r.left}|${r.top}|${r.width}|${r.height}`;
      })
      .filter(Boolean)
      .sort()
      .join(';') + `#${observingPlayerN}#${numPlayers}`;
  }, [layoutRegions, observingPlayerN, numPlayers]);

  useEffect(() => {
    const tiltEl = tiltRef.current;
    if (!tiltEl) return;

    const g  = gameRef.current;
    const lr = layoutRef.current;
    const connected = g && lr;

    let engineOptions = {};
    let initData      = {};

    let reverseIdMap = null;

    if (connected) {
      const playerN    = observingPlayerRef.current;
      const nPlayers   = numPlayersRef.current;
      const gd         = gameDefRef.current;
      const regions = adaptRegions(lr, playerN, nPlayers, g?.groupById || {}, gd, languageRef.current);
      const { cardDescriptors, assignments, idMap } = adaptGameState(
        g, lr, gd, languageRef.current, playerN, nPlayers
      );
      reverseIdMap = new Map([...idMap.entries()].map(([k, v]) => [v, k]));
      const callbacks    = buildEngineCallbacks(doActionListRef.current, reverseIdMap);
      // Derive default card dimensions from gameDef cardBacks (any back will do).
      const anyBack      = Object.values(gd?.cardBacks || {})[0];
      const cardDefaultH = anyBack?.height ?? 1.0;
      const cardDefaultW = anyBack?.width  ?? 0.72;
      engineOptions = {
        regions, ...callbacks,
        playerN:            observingPlayerRef.current,
        cardSize:           cardSizeRef.current,
        zoomFactor:         zoomFactorRef.current,
        tableBackgroundUrl: tableBackgroundUrlRef.current,
        touchMode:          touchModeRef.current,
        cardDefaultH,
        cardDefaultW,
        onCardClick:    (engineId, clientX, clientY) => {
          const dcId = reverseIdMap.get(engineId);
          if (dcId == null) return;
          // Multi-select mode (e.g. a selectCards prompt): a click toggles the
          // card's membership in the selection instead of activating it / opening
          // the card menu — mirrors CardMouseRegion.handleClick in the 2D engine.
          if (multiSelectEnabledRef.current) {
            dispatch(toggleMultiSelectCardId(dcId));
            return;
          }
          const card = gameRef.current?.cardById?.[dcId];
          console.log('dnc3d card click', card);
          const title = card?.sides?.[card?.currentSide]?.name || '';
          // Touch mode: same three-way branch as CardMouseRegion.handleClick in
          // the 2D engine, so the touch bar and default actions behave
          // identically in both renderers.
          //   1. A touch-bar action is armed → apply it to the tapped card.
          //   2. The card is already active → run its default action.
          //   3. Otherwise → activate it and open its menu (the branch below).
          // The 2D engine's step 2 relies on hover having made the card active;
          // with no hover on a touchscreen, step 3's own dispatch is what arms it,
          // so the first tap selects and the second acts.
          if (touchModeRef.current && card) {
            if (touchActionRef.current) {
              handleTouchActionRef.current(card);
              return;
            }
            if (store.getState().playerUi?.activeCardId === dcId) {
              const defaultAction = getDefaultActionRef.current(card);
              if (defaultAction?.actionList) {
                doActionListRef.current(defaultAction.actionList, `Default action for ${title}`);
                return;
              }
            }
          }
          dispatch(setMouseXY({ x: clientX, y: clientY }));
          dispatch(setActiveCardId(dcId));
          dispatch(setScreenLeftRight(clientX > window.innerWidth / 2 ? 'right' : 'left'));
          dispatch(setDropdownMenu({ type: 'card', cardId: dcId, title, visible: true }));
        },
        onCardHover:    (engineId, clientX) => {
          const dcId = reverseIdMap.get(engineId);
          if (dcId == null) return;
          dispatch(setActiveCardId(dcId));
          dispatch(setScreenLeftRight(clientX < window.innerWidth / 2 ? 'left' : 'right'));
        },
        onCardHoverEnd: () => {
          if (!store.getState().playerUi?.dropdownMenu) dispatch(setActiveCardId(null));
        },
        onCardHoverTopBottom: (topBottom) => {
          dispatch(setMouseTopBottom(topBottom));
        },
        onDragStart: () => {
          dispatch(setActiveCardId(null));
        },
        getCardName: (engineId) => {
          const dcId = reverseIdMap.get(engineId);
          if (dcId == null) return '';
          const card = gameRef.current?.cardById?.[dcId];
          return card?.sides?.[card?.currentSide]?.name || '';
        },
        onGroupBrowse: (groupId) => browseTopN(groupId, 'All'),
        onGroupMenu:   (groupId, clientX, clientY) => {
          const group = gameRef.current?.groupById?.[groupId];
          if (!group) return;
          const title = gameL10n(group.label, gameDefRef.current, languageRef.current);
          dispatch(setMouseXY({ x: clientX, y: clientY }));
          dispatch(setDropdownMenu({ type: 'group', group, title }));
        },
      };
      initData      = { cards: cardDescriptors, assignments };
      idMapRef.current = idMap;
    } else {
      idMapRef.current = null;
    }

    // Detect cards that are new since the last init so we can spawn-animate them
    // after init. null prevCardIdsRef means this is the very first load — skip
    // animating to avoid all cards dropping in simultaneously on game start.
    const currCardIdSet = new Set(Object.keys(g?.cardById || {}));
    const newDcCardIds = prevCardIdsRef.current !== null
      ? [...currCardIdSet].filter(id => !prevCardIdsRef.current.has(id))
      : [];
    prevCardIdsRef.current = currCardIdSet;

    const engine = createDnc3DEngine(engineOptions);
    engineRef.current = engine;

    engine.applyTilt(tiltEl, tiltDegRef.current);
    const cleanup = engine.init(tiltEl, tiltDegRef.current, initData);

    if (connected && reverseIdMap) {
      const portals = engine.getCardElements().flatMap(({ id, tokenHostEl, faceW, faceH }) => {
        const dcId = reverseIdMap.get(id);
        if (!dcId || !tokenHostEl) return [];
        const aspectRatio = (faceW && faceH) ? faceW / faceH : 0.72;
        return [{ dcId, tokenHostEl, aspectRatio }];
      });
      setTokenPortals(portals);

      // Re-open browse if it was open before this rebuild (e.g. the user toggled
      // an overlay region while browsing). The browse effect below only fires on
      // browseGroupId changes, so it won't re-open browse after a re-init on its
      // own — Redux still holds the same browseGroupId. Keep it open until the
      // user explicitly closes it.
      if (browseGroupIdRef.current && idMapRef.current && gameRef.current) {
        engine.openBrowse(browseGroupIdRef.current, gameRef.current, idMapRef.current);
      }

      // Seed the targeting/arrow overlay from current state. The reconcile effect
      // (dep: [game]) won't re-fire on a pure re-init since `game` is unchanged,
      // so without this an active target/arrow would vanish until the next tick.
      if (idMapRef.current && gameRef.current) {
        engine.syncOverlay(gameRef.current, idMapRef.current);
      }

      // Spawn-animate any cards that didn't exist on the previous init.
      if (newDcCardIds.length > 0 && idMapRef.current) {
        const newEngineIds = newDcCardIds
          .map(dcId => idMapRef.current.get(dcId))
          .filter(i => i !== undefined);
        if (newEngineIds.length > 0) {
          engine.spawnCards(newEngineIds);
          // If a dnc3dShuffle signal arrived before this re-init (gui_update_all
          // can beat state_update due to Phoenix's intercept queue), the shuffle
          // effect fired against the old engine (stackIds=0) and bailed without
          // committing to a nonce. Pick it up here and defer past spawn (~600ms).
          const ps = store.getState().playerUi?.dnc3dShuffle;
          if (ps?.groupId && ps.nonce !== lastShuffleNonceRef.current) {
            lastShuffleNonceRef.current = ps.nonce;
            const groupId = ps.groupId;
            setTimeout(() => {
              if (engineRef.current !== engine) return;
              engine.animatePileShuffle(groupId, () => playShuffleSound());
            }, 600);
          }
        }
      }
    } else {
      setTokenPortals([]);
    }

    function handleResize() {
      engine.applyTilt(tiltEl, tiltDegRef.current);
      engine.onTiltUpdated();
    }
    window.addEventListener('resize', handleResize);

    return () => {
      // Despawn-animate cards that were removed from cardById before the engine
      // tears down. prevCardIdsRef still holds the old set (updated in the body
      // above, which hasn't run yet). gameRef.current is already the new state.
      const oldSet = prevCardIdsRef.current;
      if (oldSet && engineRef.current && idMapRef.current) {
        const newSet = new Set(Object.keys(gameRef.current?.cardById || {}));
        const removedDcIds = [...oldSet].filter(id => !newSet.has(id));
        if (removedDcIds.length > 0) {
          const removedEngineIds = removedDcIds
            .map(id => idMapRef.current.get(id))
            .filter(i => i !== undefined);
          if (removedEngineIds.length > 0) engineRef.current.despawnCards(removedEngineIds);
        }
      }
      setTokenPortals([]);
      cleanup();
      window.removeEventListener('resize', handleResize);
      engineRef.current = null;
    };
  }, [cardCount, regionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open / close browse region in the engine ───────────────────────────────
  // Declared BEFORE the reconcile effect so that on a tick where browse opens
  // (e.g. clicking the eye), the cards are moved into '_browse' before reconcile
  // processes the same tick. Otherwise a peeking-triggered flip would fire while
  // the cards are still in their home (pile) region and collide with the move —
  // the cards flip in place and openBrowse then skips them (they're animating).
  useEffect(() => {
    const engine = engineRef.current;
    const idMap  = idMapRef.current;
    if (!engine) return;
    if (browseGroupId && idMap && gameRef.current) {
      engine.openBrowse(browseGroupId, gameRef.current, idMap);
    } else {
      engine.closeBrowse(gameRef.current, idMap);
    }
  }, [browseGroupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reconcile engine state with Redux on every game change ─────────────────
  // Handles rotation, flip, and position updates without a full re-init.
  // Card-set changes (deck load) are handled by the cardCount effect above.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !game || !idMapRef.current) return;
    engine.reconcile(game, idMapRef.current);
  }, [game]);

  // ── Play a shuffle riffle (+ sound) when a group is shuffled ────────────────
  // animatePileShuffle is a no-op for non-pile groups and returns whether it
  // actually ran a riffle, so the sound only plays when there's a visual.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !dnc3dShuffle?.groupId) return;
    // Skip if we already committed to handling this exact shuffle (e.g. the
    // re-init effect already scheduled a post-spawn retry for the same nonce).
    if (dnc3dShuffle.nonce === lastShuffleNonceRef.current) return;
    const result = engine.animatePileShuffle(dnc3dShuffle.groupId, () => playShuffleSound());
    // 'deferred' means the engine scheduled a _spawning retry (with our onStart
    // callback), so sound will play automatically. true means it started now.
    // false means stackIds=0 (wrong engine) — leave nonce uncommitted so the
    // re-init effect can pick it up.
    if (result !== false) lastShuffleNonceRef.current = dnc3dShuffle.nonce;
  }, [dnc3dShuffle]);

  // ── Track the touchMode setting ────────────────────────────────────────────
  // Touch mode can be flipped mid-game from Settings (or from the first-run
  // prompt), so the engine is told about the change rather than only reading it
  // at init — the init effect only re-runs on deck/region changes.
  useEffect(() => {
    engineRef.current?.setTouchMode(touchMode);
  }, [touchMode]);

  // ── Suppress hover glow while the hotkey overlay (Tab) is open ──────────────
  // On open the engine drops the glow + active card; on close it re-derives hover
  // from the cursor's current position, so the card under the pointer re-lights.
  useEffect(() => {
    engineRef.current?.setHoverSuppressed(hotkeyOverlayOpen);
  }, [hotkeyOverlayOpen]);

  // ── Respond to tilt angle changes ──────────────────────────────────────────
  useEffect(() => {
    const tiltEl = tiltRef.current;
    const engine = engineRef.current;
    if (!tiltEl || !engine) return;
    engine.setCurrentDeg(tiltDeg);
    engine.applyTilt(tiltEl, tiltDeg);
    engine.onTiltUpdated();
  }, [tiltDeg]);

  // ── Respond to table opacity changes ───────────────────────────────────────
  useEffect(() => {
    const tiltEl = tiltRef.current;
    const engine = engineRef.current;
    if (!tiltEl || !engine) return;
    engine.applyTableOpacity(tiltEl, tableOpacity / 100);
  }, [tableOpacity]);

  // ── Filter callback from the HUD browse panel ──────────────────────────────
  const handleBrowseFilterChange = useCallback((filteredIndices) => {
    engineRef.current?.updateBrowseFilter(filteredIndices);
  }, []);

  return (
    <div className="dnc3d-stage">
      {TOKEN_EXTRUDE && <Dnc3DTokenExtrudeFilter />}
      <div className="dnc3d-tilt" ref={tiltRef} />
      {game && <Dnc3DHudChat />}
      {game && <Dnc3DHudBrowse onFilterChange={handleBrowseFilterChange} />}
      {/* Player prompts — self-contained draggable overlay (reads visible prompts
          from Redux, renders null when there are none). Positioned relative to
          the stage, same as in the 2D TableLayout. */}
      {game && <Alert />}
      {game && <Prompts />}
      {game && <FadeTextPlayer />}
      {/* Hover TextBox overlays — screen-space, positioned relative to the stage.
          Like the other 3D engines (pixi/r3f), only hover textboxes are drawn:
          non-hover ones live on the tilted table surface, which this renderer
          doesn't place flat overlays onto. */}
      {layoutTextBoxes && Object.entries(layoutTextBoxes).map(([id, tb]) => {
        if (tb.visible === false || !tb.hover) return null;
        const customStyle = tb.style || {};
        return (
          <div
            key={id}
            className="absolute flex border border-gray-500 justify-center items-center text-gray-400 bg-gray-700 text-nowrap overflow-hidden"
            style={{
              left: convertToPercentage(tb.left),
              top: convertToPercentage(tb.top),
              width: convertToPercentage(tb.width),
              height: convertToPercentage(tb.height),
              pointerEvents: 'none',
              zIndex: Z_INDEX.TextBoxHover,
              ...customStyle,
            }}>
            {gameL10n(tb.label, gameDef, language)}
          </div>
        );
      })}
      {/* Table buttons — screen-space controls positioned relative to the stage.
          TableButton is self-contained (its own playerN / doActionList / l10n
          hooks), and at Z_INDEX.TableButton it floats above the tilted table
          layer so it stays clickable in 3D. */}
      {layoutTableButtons && Object.entries(layoutTableButtons).map(([id, tableButton]) => {
        if (tableButton.visible === false) return null;
        return <TableButton key={id} tableButton={tableButton} />;
      })}
      {tokenPortals.map(({ dcId, tokenHostEl, aspectRatio }) =>
        createPortal(<CardTokens cardId={dcId} aspectRatio={aspectRatio} />, tokenHostEl, dcId)
      )}
    </div>
  );
}
