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
}) => {
  const dispatch = useDispatch();

  // Redux selectors for card data
  const visibleFaceSrc = useVisibleFaceSrc(cardId);
  const imageSrc = getProxiedImageUrl(visibleFaceSrc?.src);
  const visibleFaceName = visibleFaceSrc?.name;
  const cardRotation = useCardRotation(cardId);
  const currentSide = useVisibleSide(cardId);
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
      cardWidth={7.14}
      cardHeight={10}
      isAttachmentHover={isAttachmentHover}
      attachmentIndicatorDirection={attachmentIndicatorDirection}
      onClick={handleClick}
      onHover={handleHover}
      onHoverEnd={handleHoverEnd}
      onPointerDownForDrag={onPointerDownForDrag}
    />
  );
};

export default R3FCardFromRedux;
