
import React from "react";
import useLongPress from "./hooks/useLongPress";
import { useDispatch, useSelector } from "react-redux";
import { setMouseTopBottom, setDropdownMenu, setActiveCardId, setScreenLeftRight, setCardClicked } from "../store/playerUiSlice";
import { useHandleTouchAction } from "./hooks/useHandleTouchAction";
import { useCardZIndex } from "./hooks/useCardZIndex";
import { useVisibleFace } from "./hooks/useVisibleFace";
import { useTouchAction } from "./hooks/useTouchAction";


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
        console.log("cardaction click", card);
        event.stopPropagation(); 
        if (touchMode) {
            if (touchAction !== null || isActive) {
                handleTouchAction(card);
            } else {
                makeActive(event); 
                handleSetDropDownMenu();
            }
        } else {
            handleSetDropDownMenu();
        }
    }
    
    const handleMouseOver = (event) => {
        console.log("cardaction mouseover", card);
        event.stopPropagation();
        if (!dropdownMenuVisible) makeActive(event);
        //setIsActive(true);
    }

    const onLongPress = (event) => {
        event.preventDefault();
        handleSetDropDownMenu();
    };

    // const defaultOptions = {
    //     shouldPreventDefault: true,
    //     delay: 800,
    // };

    //const longPress = useLongPress(onLongPress, handleClick, defaultOptions);
    const regionStyle = {
        position: 'absolute',
        top: topOrBottom === "top" ? "0%" : "50%",
        width: '100%',
        height: '50%',
        zIndex: zIndex,
    }

    // if (touchMode) {
    //     return(
    //         <div 
    //             {...longPress}
    //             style={regionStyle}
    //             onMouseOver={event => !isActive && !touchAction && makeActive(event)}
    //         />
    // )} else 
    return (
        <div 
            style={regionStyle}
            onMouseOver={event =>  handleMouseOver(event)}
            onClick={event => handleClick(event)}
        />  
    )
})