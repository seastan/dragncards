/**
 * R3FCardFromRedux - Redux-to-props bridge for a single card
 *
 * Reads card data from Redux (image, rotation, side, tokens) and passes
 * everything to R3FCardMesh. Has NO drag logic — that lives in R3FStack.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { R3FCardMesh } from './R3FCardMesh';
import { useVisibleFaceSrc } from '../../engine/hooks/useVisibleFaceSrc';
import { useVisibleFace } from '../../engine/hooks/useVisibleFace';
import { useVisibleSide } from '../../engine/hooks/useVisibleSide';
import { useCardRotation } from '../../engine/hooks/useCardRotation';
import { useGameDefinition } from '../../engine/hooks/useGameDefinition';
import { getProxiedImageUrl } from '../utils/imageProxy';
import { setActiveCardId, setScreenLeftRight, setDropdownMenu, setCardClicked, setMouseXY, setMouseTopBottom } from '../../store/playerUiSlice';

// Track the last known visible side for each card across component remounts
// so cross-region drops can detect that a side change occurred
const prevSideMap = new Map();

/**
 * R3FCardFromRedux - Gets card data from Redux and renders an R3FCardMesh
 */
export const R3FCardFromRedux = ({
  cardId,
  stackId,
  groupId,
  region,
  localPosition = [0, 0, 0],
  cardIndexInStack = 0,
  baseZIndex = 0,
  isDragging = false,
  onPointerDownForDrag = null,
  isAttachmentHover = false,
  attachmentIndicatorDirection = null,
  attachmentEdges = null,
  stackIndex = 0,
}) => {
  const dispatch = useDispatch();

  // Redux selectors for card data
  const visibleFaceSrc = useVisibleFaceSrc(cardId);
  const imageSrc = getProxiedImageUrl(visibleFaceSrc?.src);
  const visibleFace = useVisibleFace(cardId);
  const visibleFaceName = visibleFace?.name;
  const cardRotation = useCardRotation(cardId);
  // visibleSide accounts for peeking; currentSide is the card's actual flipped state.
  // The flip animation should only trigger on actual side changes, not peeking changes.
  const visibleSide = useVisibleSide(cardId);
  const currentSide = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.currentSide);
  const previousSide = prevSideMap.get(cardId);

  useEffect(() => {
    prevSideMap.set(cardId, currentSide);
  }, [cardId, currentSide]);

  const card = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]);
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const gameDef = useGameDefinition();
  const activeCardId = useSelector(state => state?.playerUi?.activeCardId);

  // Token data
  const tokens = card?.tokens || {};
  const tokenDefinitions = useMemo(() => {
    const defs = gameDef?.tokens || {};
    const proxiedDefs = {};
    for (const [key, def] of Object.entries(defs)) {
      proxiedDefs[key] = {
        ...def,
        imageUrl: def.imageUrl ? getProxiedImageUrl(def.imageUrl) : null,
      };
    }
    return proxiedDefs;
  }, [gameDef?.tokens]);

  // Handle hover - set active card ID and screen position for GiantCard
  const handleHover = useCallback((id, event) => {
    dispatch(setActiveCardId(id));
    const clientX = event?.nativeEvent?.clientX ?? event?.clientX;
    if (clientX !== undefined) {
      const screenLeftRight = clientX > (window.innerWidth / 2) ? "right" : "left";
      dispatch(setScreenLeftRight(screenLeftRight));
    }
    const uv = event?.uv;
    if (uv) {
      const topBottom = uv.y > 0.5 ? "top" : "bottom";
      dispatch(setMouseTopBottom(topBottom));
    }
  }, [dispatch]);

  // Handle hover end
  const handleHoverEnd = useCallback(() => {
    dispatch(setActiveCardId(null));
  }, [dispatch]);

  // Handle click - open card menu
  const handleClick = useCallback((id, event) => {
    const clientX = event?.clientX;
    const clientY = event?.clientY;

    if (clientX !== undefined && clientY !== undefined) {
      dispatch(setMouseXY({ x: clientX, y: clientY }));
    }

    dispatch(setActiveCardId(id));
    if (clientX !== undefined) {
      const screenLeftRight = clientX > (window.innerWidth / 2) ? "right" : "left";
      dispatch(setScreenLeftRight(screenLeftRight));
    }
    dispatch(setCardClicked(true));

    if (playerN) {
      const dropdownMenu = {
        type: "card",
        cardId: id,
        title: visibleFaceName || id,
        visible: true,
      };
      dispatch(setDropdownMenu(dropdownMenu));
    }
  }, [dispatch, playerN, visibleFaceName]);

  if (!card) return null;

  const label = card.sides?.A?.name || cardId;
  const hashCode = cardId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const fallbackColor = `hsl(${Math.abs(hashCode) % 360}, 60%, 40%)`;

  const isActive = activeCardId === cardId;

  // Compute 3D card dimensions from the card side's width/height ratio.
  // The longer dimension is always BASE_CARD_SIZE (10) world units so all
  // cards fit the same visual footprint regardless of orientation.
  const BASE_CARD_SIZE = 10;
  const sideData = card?.sides?.[visibleSide];
  const rawW = sideData?.width;
  const rawH = sideData?.height;
  const cardAspect = rawW && rawH ? rawW / rawH : 0.714;
  const isLandscape = cardAspect > 1;
  const r3fCardWidth = isLandscape ? BASE_CARD_SIZE : BASE_CARD_SIZE * cardAspect;
  const r3fCardHeight = isLandscape ? BASE_CARD_SIZE / cardAspect : BASE_CARD_SIZE;

  return (
    <R3FCardMesh
      cardId={cardId}
      localPosition={localPosition}
      cardIndexInStack={cardIndexInStack}
      baseZIndex={baseZIndex}
      imageSrc={imageSrc}
      color={fallbackColor}
      label={label}
      rotation={cardRotation}
      currentSide={currentSide}
      previousSide={previousSide}
      tokens={tokens}
      tokenDefinitions={tokenDefinitions}
      isActive={isActive}
      isDragging={isDragging}
      cardWidth={r3fCardWidth}
      cardHeight={r3fCardHeight}
      isAttachmentHover={isAttachmentHover}
      attachmentIndicatorDirection={attachmentIndicatorDirection}
      attachmentEdges={attachmentEdges}
      onClick={handleClick}
      onHover={handleHover}
      onHoverEnd={handleHoverEnd}
      onPointerDownForDrag={onPointerDownForDrag}
      stackIndex={stackIndex}
    />
  );
};

export default R3FCardFromRedux;
