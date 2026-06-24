import React from "react";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Draggable from 'react-draggable';
import { useDispatch, useSelector } from "react-redux";
import { setShowHotkeys } from "../store/playerUiSlice";
import { useGameL10n } from "./hooks/useGameL10n";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { Z_INDEX } from "./functions/common";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { dragnHotkeys } from "./hooks/useDragnHotkeys";

const windowStyle = {
  position: "absolute",
  zIndex: Z_INDEX.Hotkeys,
  right: "30px",
  top: "120px",
  width: "520px",
  height: "640px",
  maxHeight: "90dvh",
};
const col1Class = "w-1/3";
const col2Class = "w-2/3";

// A single modern keycap. Self-contained so the chunky shared `keysDiv`
// styling (still used by the deckbuilder/prompts) is left untouched.
const Kbd = ({ children }) => (
  <kbd className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border border-gray-600 border-b-2 bg-gray-700 px-2 py-1 font-mono text-lg font-medium leading-none text-gray-100 shadow-sm">
    {children}
  </kbd>
);

// Renders a "Ctrl+Shift+X"-style combo as keycaps joined by faint "+".
const Keys = ({ keysString }) => {
  let keys = keysString.split("+");
  if (keysString === "+") keys = ["+"];
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1">
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-xs text-gray-500">+</span>}
          <Kbd>{key}</Kbd>
        </React.Fragment>
      ))}
    </span>
  );
};

const SectionTitle = ({ children }) => (
  <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
    {children}
  </h2>
);

const HelpText = ({ children }) => (
  <p className="my-1 text-sm leading-snug text-gray-400">{children}</p>
);

const processLabel = (label) => {
  const tokList = [];
  var currentTok = "";
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
  if (!hotkeyList) return null;
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-gray-700">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr className="bg-gray-900 bg-opacity-50 text-gray-400">
            <th className={col1Class + " px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"}>{siteL10n("hotkeyTableKey")}</th>
            <th className={col2Class + " px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"}>{siteL10n("hotkeyTableDescription")}</th>
          </tr>
        </thead>
        <tbody>
          {hotkeyList.map((el, elIndex) => {
            if (el.hideFromTable) return null;
            const keysString = el.key;
            const labelList = processLabel(l10n(el.label));
            return (
              <tr key={elIndex} className="border-t border-gray-700 transition-colors hover:bg-gray-700 hover:bg-opacity-40">
                <td className="px-3 py-1 align-middle">
                  <Keys keysString={keysString} />
                </td>
                <td className="px-3 py-1 align-middle text-md leading-snug text-gray-200">
                  {labelList.map((labelEl, labelElIndex) => {
                    if (labelEl.startsWith("icon(")) return <img key={labelElIndex} className="inline-block align-middle" style={{height: "2.5rem"}} src={labelEl.slice(5,-1)}/>
                    return <React.Fragment key={labelElIndex}>{labelEl}</React.Fragment>
                  })}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
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
      <div
        className="fixed inset-0 flex items-start justify-center p-4"
        style={{ zIndex: Z_INDEX.Hotkeys, backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <div className="flex h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 text-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-700 bg-gray-900 bg-opacity-50 px-4 py-2.5">
            <h1 className="text-sm font-semibold tracking-wide">{siteL10n("hotkeys")}</h1>
          </div>
          <div
            className="flex-1 overflow-y-auto p-4"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", columnGap: "2rem", rowGap: "1rem", alignContent: "start" }}
          >
            <section>
              <SectionTitle>{siteL10n("tokenHotkeys")}</SectionTitle>
              <div className="mb-2 flex justify-center">
                <img
                  style={{ width: "30dvh" }}
                  src="https://dragncards-shared.s3.amazonaws.com/graphics/hover_mouse_tokens.png"/>
              </div>
              <HotkeyTable hotkeyList={gameDef?.hotkeys?.token} l10n={gameL10n}/>
              <HelpText>{siteL10n("holdCtrl")}</HelpText>
            </section>
            <section>
              <SectionTitle>{siteL10n("cardHotkeys")}</SectionTitle>
              <HelpText>{siteL10n("hoverOverACard")}</HelpText>
              <HotkeyTable hotkeyList={gameDef?.hotkeys?.card} l10n={gameL10n}/>
            </section>
            <section>
              <SectionTitle>{siteL10n("gameHotkeys")}</SectionTitle>
              <HotkeyTable hotkeyList={gameDef?.hotkeys?.game} l10n={gameL10n}/>
            </section>
            <section>
              <SectionTitle>{siteL10n("dragnHotkeys")}</SectionTitle>
              <HotkeyTable hotkeyList={dragnHotkeys} l10n={siteL10n}/>
            </section>
          </div>
        </div>
      </div>
    )
  }
  else {
    return(
      <Draggable handle=".drag-handle">
        <div
          className="flex flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 text-white shadow-2xl outline-none"
          style={windowStyle}
        >
          <div className="drag-handle flex cursor-move items-center justify-between border-b border-gray-700 bg-gray-900 bg-opacity-50 px-4 py-2.5">
            <h1 className="select-none text-sm font-semibold tracking-wide">{siteL10n("hotkeys")}</h1>
            <button
              type="button"
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              onMouseUp={() => dispatch(setShowHotkeys(false))}
              onTouchStart={() => dispatch(setShowHotkeys(false))}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3" style={{ touchAction: "pan-y" }}>
            <section className="mb-5">
              <SectionTitle>{siteL10n("tokenHotkeys")}</SectionTitle>
              <HelpText>{siteL10n("hoverOverTopBottom")}</HelpText>
              <HotkeyTable hotkeyList={gameDef?.hotkeys?.token} l10n={gameL10n}/>
              <HelpText>{siteL10n("holdCtrl")}</HelpText>
            </section>
            <section className="mb-5">
              <SectionTitle>{siteL10n("cardHotkeys")}</SectionTitle>
              <HelpText>{siteL10n("hoverOverACard")}</HelpText>
              <HotkeyTable hotkeyList={gameDef?.hotkeys?.card} l10n={gameL10n}/>
            </section>
            <section className="mb-5">
              <SectionTitle>{siteL10n("gameHotkeys")}</SectionTitle>
              <HotkeyTable hotkeyList={gameDef?.hotkeys?.game} l10n={gameL10n}/>
            </section>
            <section>
              <SectionTitle>{siteL10n("dragnHotkeys")}</SectionTitle>
              <HotkeyTable hotkeyList={dragnHotkeys} l10n={siteL10n}/>
            </section>
          </div>
        </div>
      </Draggable>
    )
  }
})
