import React, { useState } from "react";
import { useSelector } from "react-redux";
import { usePlayerN } from "./hooks/usePlayerN";
import { keysDiv } from "./functions/common";
import { useDoActionList } from "./hooks/useDoActionList";
import { useGameL10n } from "./hooks/useGameL10n";
import Draggable from "react-draggable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripLines } from "@fortawesome/free-solid-svg-icons";

const promptStyle = {
  MozBoxShadow: '0 0 50px 20px black',
  WebkitBoxShadow: '0 0 50px 20px black',
  boxShadow: '0 0 50px 20px black',
}

export const Prompt = React.memo(({
  message,
  options
}) => {
  const doActionList = useDoActionList();
  const gameL10n = useGameL10n();
  const [showPrompt, setShowPrompt] = useState(true);
  if (!showPrompt) return null;
  const handleOptionClick = (option) => {
    setShowPrompt(false);
    doActionList(option.code);
  }
  return (
    <div className="p-2 bg-gray-600-90" style={{borderBottom: "1px solid black"}}>
      <div className="mb-2">{message}</div>
        {options &&
          <div className="">
            {options.map((option, index) => {
              return(
                <div key={index} className="m-1 p-1 rounded-lg bg-gray-800 hover:bg-red-800 cursor-default" onClick={() => handleOptionClick(option)}>
                  <span className="pr-2">{keysDiv(option.hotkey, "hover:bg-gray-500")}</span><span>{gameL10n(option.label)}</span>
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
  const playerN = usePlayerN();
  const prompts = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.prompts) || {};
  const sortedPromptIds = Object.keys(prompts).sort((a,b) => prompts[a].timestamp - prompts[b].timestamp);
  if (Object.keys(prompts).length === 0) return null;

  return (
    <Draggable handle=".drag-handle">
      <div className="absolute text-white" 
        style={{
          ...promptStyle,
          left: "2%", 
          top: "2%", 
          width: "19%",
          zIndex: 3e7
        }}>
          {/* Add a drag handle here */}
          <div className="drag-handle p-1 cursor-move bg-gray-800 flex justify-center align-center">
            <FontAwesomeIcon icon={faGripLines} />
          </div>
          {sortedPromptIds.map((promptKey, promptIndex) => {
            return(
              <Prompt key={promptIndex} {...prompts[promptKey]} />
            )
          })}
      </div>
    </Draggable>
  )
})
