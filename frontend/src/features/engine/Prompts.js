import React, { useEffect, useState, useMemo } from "react";
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
import { clearMultiSelectCardIds, setMultiSelectEnabled, setTyping } from "../store/playerUiSlice";
import store from "../../store";

const promptStyle = {
  MozBoxShadow: '0 0 50px 20px black',
  WebkitBoxShadow: '0 0 50px 20px black',
  boxShadow: '0 0 50px 20px black',
}

const PromptInput = React.memo(({ 
  inputDetails,
  setPromptTextInput
 }) => {
  const dispatch = useDispatch();
  const multiSelect = useSelector(state => state.playerUi.multiSelect);
  const numSelected = multiSelect?.cardIds?.length || 0;

  if (inputDetails?.type == "text" || inputDetails?.type == "number") {
    return(
      <input
        type={inputDetails.type || "text"}
        name="promptInput"
        id="promptInput"
        placeholder={inputDetails?.placeholder}
        className="form-control w-full bg-gray-900 text-white border-0 h-full px-2"
        onFocus={event => dispatch(setTyping(true))}
        onBlur={event => dispatch(setTyping(false))}
        onChange={event => {setPromptTextInput(event.target.value)}}
      />
    )
  } else if (inputDetails?.type === "selectCards") {
    return (
      <div className="text-white">
        {numSelected === 0 
         ? <p className="m-1 p-1 rounded-lg text-center bg-gray-300 text-black">Click or tap a card to select it</p>
         : <p className="m-1 p-1 rounded-lg text-center bg-yellow-300 text-black">{`Cards selected: ${numSelected}`}</p>
        }
        {/* Render the card selection UI here, if needed */}
        {/* This could be a list of cards to select from, or any other UI element */}
      </div>
    );
  } else {
    return null; // or handle other input types if needed
  }
})

export const Prompt = React.memo(({
  promptIndex,
  promptId,
  message,
  input,
  options,
  uuid
}) => {
  const playerN = usePlayerN();
  const dispatch = useDispatch();
  const doActionList = useDoActionList();
  const gameL10n = useGameL10n();
  const setPluginSetting = useSetPluginSetting();
  const multiSelect = useSelector(state => state.playerUi.multiSelect);
  const [promptTextInput, setPromptTextInput] = useState(null);
  console.log("Rendering Prompt", uuid);

  const runCode = (code, description = null) => {

    dispatch(setPromptVisible({playerI: playerN, promptUuid: uuid, visible: false}));

    // Define the input, if any
    var promptInput = null;
    if (input && (input.type === "text" || input.type === "number")) {
      promptInput = promptTextInput;
    } else if (input && input.type === "selectCards") {
      promptInput = ["LIST"].concat(
        store.getState().playerUi.multiSelect.cardIds // Get the selected card IDs from the Redux store
      );
    }
    const defineInput = ["DEFINE", "$PROMPT_INPUT", promptInput];
    dispatch(clearMultiSelectCardIds()); // Clear multi-select after the prompt is handled

    // Compile the action list
    const promptCode = code || [];
    const actionList = [defineInput, promptCode];
    doActionList(actionList, `Prompt response: ${description}`)
  }

  const handleOptionClick = (option) => {
    runCode(option.code, gameL10n(option.label));
    if (option.dontShowAgain == true) {
      setPluginSetting("game", {dontShowAgainPromptIds: {[promptId]: true}});
    }
  }

  useEffect(() => {
    // Reset the promptTextInput when the prompt is re-rendered
    if (promptIndex === 0 && input && input?.type == "selectCards" && input?.autoSubmit?.numCards == multiSelect?.cardIds?.length) {
      runCode(input.autoSubmit.code, "Autosubmit"); // Automatically run the code if the number of selected cards matches the auto-submit criteria
    }
  }, [multiSelect]);

  return (
    <div className="p-2 bg-gray-600-90" style={{borderBottom: "1px solid black"}}>
      <div className="mb-2">{message}</div>
        {input && <PromptInput inputDetails={input} setPromptTextInput={setPromptTextInput} />}
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
  const dispatch = useDispatch();
  const multiSelect = useSelector(state => state.playerUi.multiSelect);
  const prompts = useVisiblePrompts();
  const sortedPromptIds = useMemo(() => {
    return Object.keys(prompts).sort((a,b) => prompts[a].timestamp - prompts[b].timestamp);
  }, [prompts]);
  console.log("Rendering Prompts", prompts);

  // After rendering the prompts, if the top prompt has a selectCards input, we should set the UI status to multi-select mode
  useEffect(() => {
    if (sortedPromptIds.length > 0) {
      const topPrompt = prompts[sortedPromptIds[0]];
      if (topPrompt && topPrompt.input && topPrompt.input.type === "selectCards" && !multiSelect.enabled) {
        dispatch(setMultiSelectEnabled(true));
      } else if (topPrompt && topPrompt.input && topPrompt.input.type !== "selectCards" && multiSelect.enabled) {
        dispatch(setMultiSelectEnabled(false));
        dispatch(clearMultiSelectCardIds());
      }
    } else if (multiSelect.enabled) {
      dispatch(setMultiSelectEnabled(false));
      dispatch(clearMultiSelectCardIds());
    }
  }, [sortedPromptIds, prompts]);
  

  // Check if all prompts have visible set to false
  if (Object.keys(prompts).length === 0) return null;

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
