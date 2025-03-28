import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { usePlayerN } from "./hooks/usePlayerN";
import { keysDiv, Z_INDEX } from "./functions/common";
import { useDoActionList } from "./hooks/useDoActionList";
import { useGameL10n } from "./hooks/useGameL10n";
import Draggable from "react-draggable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripLines } from "@fortawesome/free-solid-svg-icons";
import { setPromptVisible } from "../store/gameUiSlice";
import { useSetPluginSetting } from "./hooks/useSetPluginSetting";
import { useVisiblePrompts } from "./hooks/useVisiblePrompts";

const promptStyle = {
  MozBoxShadow: '0 0 50px 20px black',
  WebkitBoxShadow: '0 0 50px 20px black',
  boxShadow: '0 0 50px 20px black',
}

export const Prompt = React.memo(({
  promptIndex,
  promptId,
  message,
  options,
  uuid
}) => {
  const playerN = usePlayerN();
  const dispatch = useDispatch();
  const doActionList = useDoActionList();
  const gameL10n = useGameL10n();
  const setPluginSetting = useSetPluginSetting();
  console.log("Rendering Prompt", uuid);
  const handleOptionClick = (option) => {
    dispatch(setPromptVisible({playerI: playerN, promptUuid: uuid, visible: false}));
    doActionList(option.code);
    if (option.dontShowAgain == true) {
      setPluginSetting("game", {dontShowAgainPromptIds: {[promptId]: true}});
    }
  }
  return (
    <div className="p-2 bg-gray-600-90" style={{borderBottom: "1px solid black"}}>
      <div className="mb-2">{message}</div>
        {options &&
          <div className="">
            {options.map((option, index) => {
              return(
                <div key={index} className="m-1 p-1 rounded-lg bg-gray-800 hover:bg-red-800 cursor-default" onClick={() => handleOptionClick(option)}>
                  {promptIndex === 0 && option.hotkey && <span>{keysDiv(option.hotkey, "hover:bg-gray-500")}</span>}
                  <span className="pl-2">{gameL10n(option.label)}</span>
                </div>
              )
            })}
          </div>
        }
    </div>
  )
})

export const Prompts = React.memo(({
}) => {
  const prompts = useVisiblePrompts();
  const sortedPromptIds = Object.keys(prompts).sort((a,b) => prompts[a].timestamp - prompts[b].timestamp);
  // Check if all prompts have visible set to false
  if (Object.keys(prompts).length === 0) return null;
  console.log("Rendering Prompts", prompts);

  return (
    <Draggable handle=".drag-handle">
      <div className="absolute text-white" 
        style={{
          ...promptStyle,
          left: "2%", 
          top: "4%", 
          width: "19%",
          zIndex: Z_INDEX.Prompts,
        }}>
          {/* Add a drag handle here */}
          <div className="drag-handle p-1 cursor-move bg-gray-800 flex justify-center align-center">
            <FontAwesomeIcon icon={faGripLines} />
          </div>
          {sortedPromptIds.map((promptKey, promptIndex) => {
            if (prompts[promptKey].visible === false) return null;
            return(
              <Prompt 
                key={promptIndex} 
                promptIndex={promptIndex} 
                promptId={promptKey}
                {...prompts[promptKey]} 
              />
            )
          })}
      </div>
    </Draggable>
  )
})
