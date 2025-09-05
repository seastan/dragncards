
import React, { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setMouseTopBottom, setDropdownMenu, setActiveCardId, setScreenLeftRight, setCardClicked, toggleMultiSelectCardId } from "../store/playerUiSlice";
import { useHandleTouchAction } from "./hooks/useHandleTouchAction";
import { useCardZIndex } from "./hooks/useCardZIndex";
import { useVisibleFace } from "./hooks/useVisibleFace";
import { useTouchAction } from "./hooks/useTouchAction";
import { useDoActionList } from "./hooks/useDoActionList";
import { useGetDefaultAction } from "./hooks/useGetDefaultAction";


export const CardMouseRegion = React.memo(({
    topOrBottom,
    cardId,
    isActive
}) => {
    const dispatch = useDispatch();
    const card = useSelector(state => state?.gameUi?.game?.cardById[cardId]);
    const visibleFace = useVisibleFace(cardId);
    const playerN = useSelector(state => state?.playerUi?.playerN);
    const touchMode = useSelector(state => state?.playerUi?.userSettings?.touchMode);
    const touchAction = useTouchAction();
    const dropdownMenuVisible = useSelector(state => state?.playerUi?.dropdownMenu?.visible);
    const zIndex = useCardZIndex(cardId);
    const handleTouchAction = useHandleTouchAction();
    const doActionList = useDoActionList();
    const getDefaultAction = useGetDefaultAction(cardId);
    const multiSelectEnabled = useSelector(state => state?.playerUi?.multiSelect?.enabled);

    const playerUi = useSelector(state => state?.playerUi);
    console.log("playerUiprint", playerUi)

    const lastTouchTime = useRef(0);

    const isRecentTouch = () => Date.now() - lastTouchTime.current < 500;

    const makeActive = (event) => {
        const screenLeftRight = event.clientX > (window.innerWidth/2) ? "right" : "left";
        dispatch(setActiveCardId(cardId));
        dispatch(setScreenLeftRight(screenLeftRight));
        dispatch(setMouseTopBottom(topOrBottom))
        dispatch(setCardClicked(true));
    }

    const handleSetDropDownMenu = () => {
        const dropdownMenu = {
            type: "card",
            cardId: card.id,
            title: visibleFace?.name,
            visible: true,
        }
        if (playerN) dispatch(setDropdownMenu(dropdownMenu));
    }

    const handleClick = (event) => {
        console.log("cardaction click", {card, touchMode, isActive, touchAction});
        event.stopPropagation(); 
        if (multiSelectEnabled) {
            // If multi-select is enabled, we don't want to make the card active
            dispatch(toggleMultiSelectCardId(cardId));
            return;
        }
        if (touchMode) {
            if (touchAction !== null) {
                handleTouchAction(card);
            } else if (isActive) {
                doActionList(getDefaultAction()?.actionList, "Default action for " + visibleFace?.name);
            } else {
                makeActive(event); 
                handleSetDropDownMenu();
            }
        } else {
            makeActive(event); 
            handleSetDropDownMenu();
        }
    }

    const handleContextMenu = (event) => {
        console.log("cardaction contextmenu", {card, touchMode, isActive, touchAction});
        event.preventDefault();
        event.stopPropagation(); 
        makeActive(event); 
        handleSetDropDownMenu();
    }

    const handleTouchStart = () => {
        lastTouchTime.current = Date.now();
    }
    
    const handleMouseOver = (event) => {
        if (isRecentTouch()) return;
        console.log("cardaction mouseover", card);
        event.stopPropagation();
        if (!dropdownMenuVisible) makeActive(event);
    }

    const regionStyle = {
        position: 'absolute',
        top: topOrBottom === "top" ? "0%" : "50%",
        width: '100%',
        height: '50%',
        zIndex: zIndex,
    }

    return (
        <div 
            style={regionStyle}
            onTouchStart={handleTouchStart}
            onMouseOver={handleMouseOver}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
        />  
    )
})