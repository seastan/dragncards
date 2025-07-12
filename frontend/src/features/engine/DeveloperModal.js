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
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { Z_INDEX } from "./functions/common";

const DeveloperModal = () => {
  const dispatch = useDispatch();
  dispatch(setTyping(true));
  const [input, setInput] = useState("");
  const doActionList = useDoActionList();

  const handleClick = () => {
    try {
      const parsedCode = JSON.parse(input);
      doActionList(parsedCode, "Custom Developer Code Execution");
    } catch (e) {
      alert("Invalid JSON");
    }
  };

  return (
    <Draggable handle=".handle">
      <div
        style={{ position: "absolute", zIndex: Z_INDEX.DeveloperModal }}
        className="w-[40vw] bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden"
      >
        {/* Title Bar */}
        <div className="handle flex justify-between items-center bg-gray-700 px-4 py-2 cursor-move">
          <span className="text-white font-semibold">Developer Tools</span>
          <button
            className="text-white hover:text-red-400 transition"
            onClick={() => dispatch(setShowModal(null))}
            aria-label="Close developer modal"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Code Editor */}
        <div className="p-4 bg-gray-800">
          <CodeMirror
            value={input}
            options={{
              lineNumbers: true,
              mode: { name: "javascript", json: true },
              theme: "default",
            }}
            onBeforeChange={(editor, data, value) => setInput(value)}
            className="border border-gray-600 rounded overflow-hidden"
          />
        </div>

        {/* Action Button */}
        <div className="flex justify-end p-4 bg-gray-800 border-t border-gray-700">
          <Button onClick={handleClick}>Run</Button>
        </div>
      </div>
    </Draggable>
  );
};

export default DeveloperModal;
