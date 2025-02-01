import React, { useState } from "react";
import Draggable from "react-draggable";
import { Controlled as CodeMirror } from "react-codemirror2";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import { useDispatch } from "react-redux";
import { setShowModal, setTyping } from "../store/playerUiSlice";
import Button from "../../components/basic/Button";
import { useDoActionList } from "./hooks/useDoActionList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWindowClose, faX } from "@fortawesome/free-solid-svg-icons";
import { faXmark } from "@fortawesome/free-regular-svg-icons";
import { Z_INDEX } from "./functions/common";

const DeveloperModal = () => {
  const dispatch = useDispatch();
  dispatch(setTyping(true));
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const doActionList = useDoActionList();

  const handleClick = () => {
    try {
      const parsedCode = JSON.parse(input);
      setCode(parsedCode);
      doActionList(parsedCode);
    } catch (e) {
      alert("Invalid JSON");
    }
  };

  return (
    <Draggable handle=".handle">
      <div style={{ position: "absolute", zIndex: Z_INDEX.DeveloperModal, cursor: "move", width: "40vw" }}>
        <div className="handle flex justify-between items-center bg-gray-500" style={{ width: '100%', cursor: 'move', height: '40px' }}>
          <div> {/* Title or draggable area content */} </div>
          <div className="p-2 hover:bg-red-600" onClick={() => dispatch(setShowModal(null))}>
            <span className="text-white font-bold">X</span>
          </div>
        </div>
        <CodeMirror
          value={input}
          options={{
            lineNumbers: true,
            mode: { name: "javascript", json: true },
          }}
          onBeforeChange={(editor, data, value) => {
            setInput(value);
          }}
          className="h-full"
        />
        <Button onClick={handleClick}>Run</Button>
      </div>
    </Draggable>
  
  );  
};

export default DeveloperModal;
