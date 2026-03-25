import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useVisibleFace } from "./hooks/useVisibleFace";
import { useVisibleFaceSrc } from "./hooks/useVisibleFaceSrc";
import { useActiveCardId } from "./hooks/useActiveCardId";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useTouchAction } from "./hooks/useTouchAction";
import { setActiveCardId } from "../store/playerUiSlice";
import { useActiveCard } from "./hooks/useActiveCard";
import { useLayout } from "./hooks/useLayout";
import { useCardRotation } from "./hooks/useCardRotation";
import { Z_INDEX } from "./functions/common";


export const GiantCard = React.memo(() => {
  const gameDef = useGameDefinition();
  const dispatch = useDispatch();
  const touchAction = useTouchAction();
  const touchMode = useSelector(state => state?.playerUi?.userSettings?.touchMode);
  const activeCardId = useActiveCardId();
  const activeCard = useActiveCard();
  const [initialActiveCard, setInitialActiveCard] = useState(activeCard);
  const visibleFace = useVisibleFace(activeCardId);
  const screenLeftRight = useSelector((state) => state?.playerUi?.screenLeftRight);
  const visibleFaceSrc = useVisibleFaceSrc(activeCardId);
  const dropdownMenu = useSelector(state => state?.playerUi?.dropdownMenu);

  console.log("Rendering GiantCard", visibleFace, visibleFaceSrc);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeCard && initialActiveCard && (activeCard.id === initialActiveCard.id) && (activeCard.groupId !== initialActiveCard.groupId)) {
      console.log("cardaction giant", activeCard, initialActiveCard);
      dispatch(setActiveCardId(null));
    } else {
      setInitialActiveCard(activeCard);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCard, dispatch]);

  const layout = useLayout();
  const cardRotation = useCardRotation(activeCardId);
  const showRotationOfActiveCard = layout?.showRotationOfActiveCard || [];
  const rotationStyle = showRotationOfActiveCard.includes(cardRotation)
    ? { transform: `rotate(${cardRotation}deg)` }
    : {};

  if (!visibleFace || !activeCardId || touchAction || (dropdownMenu && !touchMode)) return null;
  const cardType = visibleFace?.type;
  const zoomFactor = gameDef?.cardTypes?.[cardType]?.zoomFactor;
  let height = zoomFactor ? `${zoomFactor * 95}dvh` : "70dvh";

  if (visibleFace.height < visibleFace.width) height = "50dvh";

  return (
    <img
      alt=""
      className="absolute"
      src={visibleFaceSrc.src}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = visibleFaceSrc.default;
      }}
      style={{
        right: screenLeftRight === "left" ? "3%" : "",
        left: screenLeftRight === "right" ? "3%" : "",
        top: "0%",
        borderRadius: "5%",
        boxShadow: "0 0 50px 20px black",
        zIndex: Z_INDEX.GiantCard,
        height: height,
        ...rotationStyle,
      }}
    />
  )
});

export default GiantCard;