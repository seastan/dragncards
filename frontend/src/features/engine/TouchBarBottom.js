import React from "react";
import { useDispatch } from "react-redux";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { setMouseXY, setDropdownMenu } from "../store/playerUiSlice";
import { useDoActionList } from "./hooks/useDoActionList";
import { useGameL10n } from "./hooks/useGameL10n";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { dragnTouchButtons, useDoDragnHotkey } from "./hooks/useDragnHotkeys";
import { useTouchAction } from "./hooks/useTouchAction";
import { useSetTouchAction } from "./hooks/useSetTouchAction";

// Palette shared with the dnc3d HUD panels so the bar reads as part of the same
// UI rather than the separate widget it used to be.
const IDLE_BG      = "rgba(255,255,255,0.06)";
const IDLE_BORDER  = "1px solid rgba(255,255,255,0.09)";
const ADD_BG       = "#14532d";
const ADD_BORDER   = "#22c55e";
const SUB_BG       = "#7f1d1d";
const SUB_BORDER   = "#ef4444";

export const TouchButton = React.memo(({buttonObj, displayText}) => {
  const dispatch = useDispatch();
  const setTouchAction = useSetTouchAction();
  const touchAction = useTouchAction();
  const doActionList = useDoActionList();
  const doDragnHotkey = useDoDragnHotkey();

  const selected      = touchAction?.id === buttonObj?.id;
  const isToken       = buttonObj?.actionType === "token";
  // A selected token button toggles between "add one" and "remove one"; the
  // second press flips it to subtract rather than deselecting.
  const subtracting   = selected && touchAction?.doubleClicked;
  const accentBg      = subtracting ? SUB_BG     : ADD_BG;
  const accentBorder  = subtracting ? SUB_BORDER : ADD_BORDER;

  const handleClick = (event) => {
    event.stopPropagation();
    // When a touch button is pressed, remove any active card to dropdown menu
    dispatch(setDropdownMenu(null));
    dispatch(setMouseXY(null));
    // If it's a game function, just do it
    if (buttonObj?.actionType === "game") {
      buttonObj.isDragnButton ? doDragnHotkey(buttonObj?.actionList) : doActionList(buttonObj?.actionList, `Touch button action ${buttonObj.label}`);
    // If button is selected already, either change it from + to - or deselect it
    } else if (selected) {
      if (isToken && !touchAction.doubleClicked) {
        setTouchAction(
          {...touchAction, doubleClicked: true}
        )
      } else {
        setTouchAction(null);
      }
    }
    // Otherwise, select the button
    else setTouchAction(buttonObj);
  }

  const labelStyle = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  };

  // Token buttons stack their icon over their name instead of overlaying the two
  // (which made both unreadable). While selected, the icon dims and the +/- sign
  // takes its place, so the button says what the next tap will do.
  const content = isToken
    ? (
      <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.2dvh", width: "100%", minWidth: 0}}>
        <div style={{position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: "3.2dvh", width: "3.2dvh", flexShrink: 0}}>
          <img
            alt=""
            src={buttonObj.imageUrl}
            style={{height: "100%", width: "100%", objectFit: "contain", opacity: selected ? 0.25 : 1}}/>
          {selected &&
            <span style={{
              position: "absolute",
              fontSize: "3dvh",
              fontWeight: 700,
              lineHeight: 1,
              textShadow: "0 0.1dvh 0.3dvh rgba(0,0,0,0.9)",
            }}>
              {subtracting ? "−" : "+"}
            </span>}
        </div>
        <span style={labelStyle}>{displayText}</span>
      </div>
    )
    : <span style={labelStyle}>{displayText}</span>;

  return (
    <div
      onClick={handleClick}
      style={{
        flex: "1 1 0",
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 0.5dvh",
        borderRadius: "0.6dvh",
        background: selected ? accentBg : IDLE_BG,
        border: selected ? `1px solid ${accentBorder}` : IDLE_BORDER,
        boxShadow: selected ? `0 0 0.9dvh ${accentBorder}55` : "none",
        color: "white",
        fontSize: "1.4dvh",
        lineHeight: 1.1,
        textAlign: "center",
        cursor: "pointer",
        overflow: "hidden",
        transition: "background 0.12s, border-color 0.12s, box-shadow 0.12s",
        // Opts out of the browser's double-tap-to-zoom wait, which otherwise
        // delays every button press on the bar by ~300ms.
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}>
      {content}
    </div>
  )
})


export const TouchBarBottom = React.memo(() => {
  const gameDef = useGameDefinition();
  const gameL10n = useGameL10n();
  const siteL10n = useSiteL10n();

  if (!gameDef.touchBar) {
    return <div className="text-white p-2">Touch mode has not been configured for this game.</div>
  }

  return (
    <div
      className="select-none"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.4dvh",
        width: "100%",
        height: "100%",
        padding: "0.4dvh",
        boxSizing: "border-box",
        background: "linear-gradient(180deg, #1c1c23 0%, #101014 100%)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
      {gameDef.touchBar.map((row, rowIndex) => (
        <div key={rowIndex} style={{display: "flex", gap: "0.4dvh", flex: "1 1 0", minHeight: 0}}>
          {row.map((buttonObj, colIndex) => {
            var processedButtonObj = {...buttonObj};
            var displayText = gameL10n(buttonObj.label);
            if (buttonObj.actionType === "engine") {
              processedButtonObj = dragnTouchButtons[buttonObj.actionList];
              if (!processedButtonObj) return null;
              processedButtonObj.isDragnButton = true;
              displayText = siteL10n(processedButtonObj.label);
            }
            return (
              <TouchButton key={colIndex} buttonObj={processedButtonObj} displayText={displayText}/>
            )
          })}
        </div>
      ))}
    </div>
  )
})
