/**
 * PixiCardFromRedux - Redux-to-props bridge for a single card in the PixiJS view.
 *
 * Reads card data from Redux and passes everything to PixiCardSprite.
 * Has NO drag logic — that lives in PixiStack.
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PixiCardSprite } from './PixiCardSprite';
import { useVisibleFaceSrc } from '../../engine/hooks/useVisibleFaceSrc';
import { useVisibleSide } from '../../engine/hooks/useVisibleSide';
import { useCardRotation } from '../../engine/hooks/useCardRotation';
import { getProxiedTextureUrl } from '../hooks/useCardTexture';
import { setActiveCardId, setScreenLeftRight, setDropdownMenu, setCardClicked, setMouseXY, setMouseTopBottom } from '../../store/playerUiSlice';
import { getCardDimsPx } from '../utils/regionUtils';

// Track last known side for each card across remounts so flip animation can detect changes
const prevSideMap = new Map();

export const PixiCardFromRedux = ({
  cardId,
  stackId,
  groupId,
  region,
  x,
  y,
  cardIndexInStack = 0,
  baseZIndex = 0,
  isDragging = false,
  onPointerDownForDrag = null,
  isAttachmentHover = false,
  tableHeight,
}) => {
  const dispatch = useDispatch();

  const visibleFaceSrc = useVisibleFaceSrc(cardId);
  const imageSrc = getProxiedTextureUrl(visibleFaceSrc?.src);
  const cardRotation = useCardRotation(cardId);
  const visibleSide = useVisibleSide(cardId);
  const currentSide = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.currentSide);
  const previousSide = prevSideMap.get(cardId);

  useEffect(() => {
    prevSideMap.set(cardId, currentSide);
  }, [cardId, currentSide]);

  const card = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]);
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const activeCardId = useSelector(state => state?.playerUi?.activeCardId);
  const isActive = activeCardId === cardId;

  // Card pixel dimensions
  const sideData = card?.sides?.[visibleSide];
  const { cardWidth, cardHeight } = useMemo(
    () => getCardDimsPx(sideData, tableHeight),
    [sideData, tableHeight]
  );

  // Hover
  const handlePointerOver = useCallback((e) => {
    dispatch(setActiveCardId(cardId));
    const clientX = e.global?.x ?? e.clientX;
    if (clientX !== undefined) {
      dispatch(setScreenLeftRight(clientX > window.innerWidth / 2 ? 'right' : 'left'));
      dispatch(setMouseTopBottom('bottom'));
    }
  }, [dispatch, cardId]);

  const handlePointerOut = useCallback(() => {
    dispatch(setActiveCardId(null));
  }, [dispatch]);

  // Click
  const handleClick = useCallback((e) => {
    const clientX = e.global?.x ?? e.clientX;
    const clientY = e.global?.y ?? e.clientY;
    if (clientX !== undefined) {
      dispatch(setMouseXY({ x: clientX, y: clientY }));
      dispatch(setActiveCardId(cardId));
      dispatch(setScreenLeftRight(clientX > window.innerWidth / 2 ? 'right' : 'left'));
    }
    dispatch(setCardClicked(true));
    if (playerN) {
      const visibleFaceName = card?.sides?.[visibleSide]?.name || cardId;
      dispatch(setDropdownMenu({
        type: 'card',
        cardId,
        title: visibleFaceName,
        visible: true,
      }));
    }
  }, [dispatch, cardId, playerN, card, visibleSide]);

  if (!card) return null;

  return (
    <PixiCardSprite
      cardId={cardId}
      x={x}
      y={y}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      imageSrc={imageSrc}
      rotation={cardRotation}
      currentSide={currentSide}
      previousSide={previousSide}
      isActive={isActive}
      isDragging={isDragging}
      isAttachmentHover={isAttachmentHover}
      cardIndexInStack={cardIndexInStack}
      onPointerDown={onPointerDownForDrag}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    />
  );
};

export default PixiCardFromRedux;
