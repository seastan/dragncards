import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveCardId, setDropdownMenu, setMouseXY, setScreenLeftRight } from '../store/playerUiSlice';
import { createDnc3DEngine } from './lib/engine';
import { adaptRegions } from './adapters/regions';
import { adaptGameState } from './adapters/cards';
import { buildEngineCallbacks } from './adapters/actions';
import './Dnc3DTable.css';

// Wrapper component for the dnc3d engine.
//
// Sandbox mode (no game props): renders 20 demo cards in DEFAULT_REGIONS.
//
// Connected mode: pass game, layoutRegions, gameDef, language, doActionList.
// The engine is (re-)initialized whenever the card set changes (deck load).
// Incremental reconciliation for mid-game server updates is Phase 5.
export default function Dnc3DTable({
  tiltDeg      = 15,
  tableOpacity = 100,
  // Connected mode props — all optional; omitting them uses demo mode
  game,
  layoutRegions,
  gameDef,
  language,
  doActionList,
}) {
  const dispatch         = useDispatch();
  const observingPlayerN = useSelector(s => s?.playerUi?.observingPlayerN);
  const numPlayers       = useSelector(s => s?.gameUi?.game?.numPlayers);
  const cardSize         = useSelector(s => {
    const obs = s?.playerUi?.observingPlayerN;
    return s?.gameUi?.game?.playerData?.[obs]?.layout?.cardSize
        ?? s?.gameUi?.game?.layout?.cardSize
        ?? null;
  });
  const zoomFactor       = useSelector(s => (s?.playerUi?.userSettings?.zoomPercent ?? 100) / 100);

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
  const cardSizeRef        = useRef(cardSize);
  const zoomFactorRef      = useRef(zoomFactor);
  gameRef.current            = game;
  layoutRef.current          = layoutRegions;
  gameDefRef.current         = gameDef;
  languageRef.current        = language;
  doActionListRef.current    = doActionList;
  observingPlayerRef.current = observingPlayerN;
  numPlayersRef.current      = numPlayers;
  cardSizeRef.current        = cardSize;
  zoomFactorRef.current      = zoomFactor;

  // Re-initialize the engine whenever the card set changes.
  // This handles: switching to dnc3d after cards are loaded, and loading a
  // deck while already in dnc3d mode. cardCount is a stable numeric dep that
  // only changes on deck load — not on every card state update.
  const cardCount = Object.keys(game?.cardById || {}).length;

  useEffect(() => {
    const tiltEl = tiltRef.current;
    if (!tiltEl) return;

    const g  = gameRef.current;
    const lr = layoutRef.current;
    const connected = g && lr;

    let engineOptions = {};
    let initData      = {};

    if (connected) {
      const playerN    = observingPlayerRef.current;
      const nPlayers   = numPlayersRef.current;
      const gd         = gameDefRef.current;
      const regions = adaptRegions(lr, playerN, nPlayers);
      const { cardDescriptors, assignments, idMap } = adaptGameState(
        g, lr, gd, languageRef.current, playerN, nPlayers
      );
      const reverseIdMap = new Map([...idMap.entries()].map(([k, v]) => [v, k]));
      const callbacks    = buildEngineCallbacks(doActionListRef.current, reverseIdMap);
      // Derive default card dimensions from gameDef cardBacks (any back will do).
      const anyBack      = Object.values(gd?.cardBacks || {})[0];
      const cardDefaultH = anyBack?.height ?? 1.0;
      const cardDefaultW = anyBack?.width  ?? 0.72;
      engineOptions = {
        regions, ...callbacks,
        cardSize:        cardSizeRef.current,
        zoomFactor:      zoomFactorRef.current,
        cardDefaultH,
        cardDefaultW,
        onCardClick:    (engineId, clientX, clientY) => {
          const dcId = reverseIdMap.get(engineId);
          if (dcId == null) return;
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
        onCardHoverEnd: () => dispatch(setActiveCardId(null)),
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

    function handleResize() {
      engine.applyTilt(tiltEl, tiltDegRef.current);
      engine.onTiltUpdated();
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cleanup();
      window.removeEventListener('resize', handleResize);
      engineRef.current = null;
    };
  }, [cardCount]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="dnc3d-stage">
      <div className="dnc3d-tilt" ref={tiltRef}>
        <div className="dnc3d-table-surface" />
      </div>
    </div>
  );
}
