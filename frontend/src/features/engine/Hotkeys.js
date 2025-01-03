import React from "react";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Draggable from 'react-draggable';
import { useDispatch, useSelector } from "react-redux";
import { setShowHotkeys } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { keyDiv, keysDiv, Z_INDEX } from "./functions/common";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { dragnHotkeys } from "./hooks/useDragnHotkeys";

const windowClass = "insert-auto overflow-auto bg-gray-700 border max-w-lg rounded-lg outline-none text-white";
const windowStyle = {
  position:"absolute", 
  zIndex: Z_INDEX.Hotkeys, 
  right: "30px", 
  top: "200px", 
  width:"500px", 
  height: "600px",
}
const windowClassL = "insert-auto overflow-auto bg-gray-700 border rounded-lg outline-none text-white";
const windowStyleL = {
  position:"absolute", 
  zIndex: Z_INDEX.Hotkeys, 
  left: "3vw", 
  top: "3dvh", 
  width:"94vw", 
  height: "94dvh",
}
const col1Class = "w-1/3";
const col2Class = "w-2/3";

const processLabel = (label) => {
  const tokList = [];
  var currentTok = "";
  console.log("processLabel", label)
  const len = label.length;
  for (var i=0; i<len; i++) {
    if (i > len - 6) {
      currentTok += label.charAt(i);
    } else if (label.slice(i,i+5) === "icon(") {
      if (currentTok !== "") tokList.push(currentTok);
      currentTok = "";
      const remainder = label.slice(i);
      const nextClose = remainder.indexOf(")");
      const iconString = label.slice(i,nextClose+i+1);
      i += nextClose;
      tokList.push(iconString)
    } else {
      currentTok += label.charAt(i);
    }
  }
  if (currentTok !== "") tokList.push(currentTok);
  return tokList;
}

export const HotkeyTable = React.memo(({hotkeyList, l10n}) => {
  const siteL10n = useSiteL10n();
  if (hotkeyList) return(
    <table className="table-fixed rounded-lg w-full my-2">
      <tr className="bg-gray-800">
          <th className={col1Class}>{siteL10n("hotkeyTableKey")}</th>
          <th className={col2Class}>{siteL10n("hotkeyTableDescription")}</th>
      </tr>
      {hotkeyList.map((el, elIndex) => {
        if (el.hideFromTable) return null;
        const keysString = el.key
        const labelList = processLabel(l10n(el.label));
        return (
          <tr className={elIndex % 2 == 0 ? "bg-gray-500" : "bg-gray-600"}>
            <td className="p-1 text-center">
              {keysDiv(keysString)}
            </td>
            
            <td className="text-center" style={{fontSize: "1.5dvh"}}>
              {labelList.map((labelEl, _labelElIndex) => {
                if (labelEl.startsWith("icon(")) return <img className="m-auto h-6 inline-block" src={labelEl.slice(5,-1)}/> 
                else return labelEl
              })}
            </td>
          </tr>
        )
      })}
    </table>
  )
})

export const Hotkeys = React.memo(({}) => {
  const dispatch = useDispatch();
  const gameDef = useGameDefinition();
  const gameL10n = useGameL10n();
  const siteL10n = useSiteL10n();
  const showWindow = useSelector(state => state?.playerUi?.showHotkeys);
  const tabPressed = useSelector(state => state?.playerUi?.keypress?.Tab);
  if (!showWindow && !tabPressed) return;

  if (tabPressed) {
    return(
      <div className={windowClassL} style={windowStyleL}>
        <div className="w-full p-3 overflow-y-scroll">
          <div className="w-1/4 float-left p-1">
            <h2 className="mb-2">{siteL10n("tokenHotkeys")}</h2>
            <div
              className="w-full flex justify-center"
            >
            <img
              style={{
                width: "30dvh"
              }}
              src="https://dragncards-shared.s3.amazonaws.com/graphics/hover_mouse_tokens.png"/>
            </div>
            <HotkeyTable hotkeyList={gameDef?.hotkeys?.token} l10n={gameL10n}/>
            {siteL10n("holdCtrl")}
          </div>
          <div className="w-1/4 float-left p-1">
            <h2 className="mb-2">{siteL10n("cardHotkeys")}</h2>
            {siteL10n("hoverOverACard")}
            <HotkeyTable hotkeyList={gameDef?.hotkeys?.card} l10n={gameL10n}/>
          </div>
          <div className="w-1/4 float-left p-1">
            <h2 className="mb-2">{siteL10n("gameHotkeys")}</h2>
            <HotkeyTable hotkeyList={gameDef?.hotkeys?.game} l10n={gameL10n}/>
          </div>
          <div className="w-1/4 float-left p-1">
            <h2 className="mb-2">{siteL10n("dragnHotkeys")}</h2>
            <HotkeyTable hotkeyList={dragnHotkeys} l10n={siteL10n}/>
          </div>
        </div>
      </div>
    )
  }
  else {
    return(
      <Draggable>
        <div className={windowClass} style={windowStyle}>
          <div className="w-full bg-gray-500" style={{height: "25px"}}>
            <FontAwesomeIcon 
              className="ml-2" 
              icon={faTimes} 
              onMouseUp={() => dispatch(setShowHotkeys(false))} 
              onTouchStart={() => dispatch(setShowHotkeys(false))}/>
          </div>
          <div className="w-full p-3 overflow-y-scroll" style={{height: "523px"}}>
            <h2 className="mb-2">{siteL10n("tokenHotkeys")}</h2>
            {siteL10n("hoverOverTopBottom")}
            <HotkeyTable hotkeyList={gameDef?.hotkeys?.token} l10n={gameL10n}/>
            {siteL10n("holdCtrl")}
            <br />
            <h2 className="mb-2">{siteL10n("cardHotkeys")}</h2>
            {siteL10n("hoverOverACard.")}
            <HotkeyTable hotkeyList={gameDef?.hotkeys?.card} l10n={gameL10n}/>
            <br />
            <h2 className="mb-2">{siteL10n("gameHotkeys")}</h2>
            <HotkeyTable hotkeyList={gameDef?.hotkeys?.game} l10n={gameL10n}/>
            <h2 className="mb-2">{siteL10n("dragnHotkeys")}</h2>
            <HotkeyTable hotkeyList={dragnHotkeys} l10n={siteL10n}/>
          </div>
        </div>
      </Draggable>
    )
  }
})
