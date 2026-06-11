import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveCardId, setDropdownMenu, setMouseTopBottom, setMouseXY, setScreenLeftRight, toggleMultiSelectCardId } from '../store/playerUiSlice';
import store from '../../store';
import { createDnc3DEngine } from './lib/engine';
import { adaptRegions, gameL10n } from './adapters/regions';
import { adaptGameState } from './adapters/cards';
import { buildEngineCallbacks } from './adapters/actions';
import { useBrowseTopN } from '../engine/hooks/useBrowseTopN';
import { convertToPercentage, Z_INDEX } from '../engine/functions/common';
import { TableButton } from '../engine/TableButton';
import { Prompts } from '../engine/Prompts';
import { Tokens } from '../engine/Tokens';
import { MultiSelectOverlay } from '../engine/MultiSelectOverlay';
import { Dnc3DHudChat } from './Dnc3DHudChat';
import { Dnc3DHudBrowse } from './Dnc3DHudBrowse';
import './Dnc3DTable.css';

function CardTokens({ cardId, aspectRatio }) {
  const isActive = useSelector(s => s?.playerUi?.activeCardId === cardId);
  return (
    <>
      <Tokens cardId={cardId} isActive={isActive} aspectRatio={aspectRatio} />
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

  const [tokenPortals, setTokenPortals] = useState([]);

  const tiltRef    = useRef(null);
  const engineRef  = useRef(null);
  const idMapRef   = useRef(null);
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
        return `${r.groupId}|${r.type}|${r.layerIndex || 0}|${r.direction || ''}|${r.left}|${r.top}|${r.width}|${r.height}`;
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

    const engine = createDnc3DEngine(engineOptions);
    engineRef.current = engine;

    engine.applyTilt(tiltEl, tiltDegRef.current);
    const cleanup = engine.init(tiltEl, tiltDegRef.current, initData);

    if (connected && reverseIdMap) {
      const portals = engine.getCardElements().flatMap(({ id, frontEl, faceW, faceH }) => {
        const dcId = reverseIdMap.get(id);
        if (!dcId || !frontEl) return [];
        const aspectRatio = (faceW && faceH) ? faceW / faceH : 0.72;
        return [{ dcId, frontEl, aspectRatio }];
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
    } else {
      setTokenPortals([]);
    }

    function handleResize() {
      engine.applyTilt(tiltEl, tiltDegRef.current);
      engine.onTiltUpdated();
    }
    window.addEventListener('resize', handleResize);

    return () => {
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
      <div className="dnc3d-tilt" ref={tiltRef} />
      {game && <Dnc3DHudChat />}
      {game && <Dnc3DHudBrowse onFilterChange={handleBrowseFilterChange} />}
      {/* Player prompts — self-contained draggable overlay (reads visible prompts
          from Redux, renders null when there are none). Positioned relative to
          the stage, same as in the 2D TableLayout. */}
      {game && <Prompts />}
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
              zIndex: Z_INDEX.Modal,
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
      {tokenPortals.map(({ dcId, frontEl, aspectRatio }) =>
        createPortal(<CardTokens cardId={dcId} aspectRatio={aspectRatio} />, frontEl, dcId)
      )}
    </div>
  );
}
