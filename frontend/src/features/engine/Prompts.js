import React from "react";
import { useSelector } from "react-redux";
import { usePlayerN } from "./hooks/usePlayerN";
import { keysDiv } from "./functions/common";
import { useDoActionList } from "./hooks/useDoActionList";
import { useGameL10n } from "./hooks/useGameL10n";

const promptStyle = {
  MozBoxShadow: '0 0 50px 20px black',
  WebkitBoxShadow: '0 0 50px 20px black',
  boxShadow: '0 0 50px 20px black',
}

export const Prompts = React.memo(({
}) => {
  const playerN = usePlayerN();
  const gameL10n = useGameL10n();
  const prompts = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.prompts) || {};
  const sortedPromptIds = Object.keys(prompts).sort((a,b) => prompts[a].timestamp - prompts[b].timestamp);
  const doActionList = useDoActionList();
  if (!prompts) return null;

  return (
    <div className="absolute text-white" 
      style={{
        left: "2%", 
        top: "2%", 
        width: "19%",
        zIndex: 3e7
      }}>
        {sortedPromptIds.map((promptKey, promptIndex) => {
          return(
            <div key={promptIndex} className="m-3 p-2 bg-gray-600-90 rounded" style={promptStyle}>
              <div className="mb-2">{prompts[promptKey]["message"]}</div>
                {prompts[promptKey]["options"] &&
                  <div className="">
                    {prompts[promptKey]["options"].map((option, index) => {
                      return(
                        <div key={index} className="m-1 p-1 rounded-lg bg-gray-800 hover:bg-red-800 cursor-default" onClick={() => doActionList(option.code)}>
                          {promptIndex === 0 && <span className="pr-2">{keysDiv(option.hotkey, "hover:bg-gray-500")}</span>}<span>{gameL10n(option.label)}</span>
                        </div>
                      )
                    })}
                  </div>
                }
            </div>
          )
        })}
  </div>
  )
})