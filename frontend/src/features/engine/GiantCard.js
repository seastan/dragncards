import React, { useEffect, useRef, useState } from "react";
import useProfile from "../../hooks/useProfile";
import { useDispatch, useSelector } from "react-redux";
import { useVisibleFace } from "./hooks/useVisibleFace";
import { useVisibleFaceSrc } from "./hooks/useVisibleFaceSrc";
import { useActiveCardId } from "./hooks/useActiveCardId";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useTouchAction } from "./hooks/useTouchAction";
import { setActiveCardId } from "../store/playerUiSlice";
import { useActiveCard } from "./hooks/useActiveCard";


export const GiantCard = React.memo(() => {
  const gameDef = useGameDefinition();
  const dispatch = useDispatch();
  const touchAction = useTouchAction();
  const activeCardId = useActiveCardId();
  const activeCard = useActiveCard();
  const [initialActiveCard, setInitialActiveCard] = useState(activeCard);
  const visibleFace = useVisibleFace(activeCardId);
  const screenLeftRight = useSelector((state) => state?.playerUi?.screenLeftRight);
  const visibleFaceSrc = useVisibleFaceSrc(activeCardId);

  console.log("Rendering GiantCard", visibleFace, visibleFaceSrc);

  useEffect(() => {
    if (activeCard && initialActiveCard && (activeCard.id == initialActiveCard.id) && (activeCard.groupId !== initialActiveCard.groupId)) {
      console.log("cardaction giant", activeCard, initialActiveCard);
      dispatch(setActiveCardId(null));
    } else {
      setInitialActiveCard(activeCard);
    }
  }, [activeCard, dispatch]);

  if (!visibleFace || !activeCardId || touchAction) return null;

  const cardType = visibleFace?.type;
  const zoomFactor = gameDef?.cardTypes?.[cardType]?.zoomFactor;
  let height = zoomFactor ? `${zoomFactor * 95}dvh` : "70dvh";

  if (visibleFace.height < visibleFace.width) height = "50dvh";

  return (
    <img
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
        zIndex: 1e6,
        height: height,
      }}
    />
  )
});

export default GiantCard;