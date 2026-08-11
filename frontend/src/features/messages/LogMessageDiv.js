import React, { useContext, useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useMessageTextToHtml } from "./MessageLine";
import { usePlainText } from "./useRichText";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleRight, faCopy } from "@fortawesome/free-regular-svg-icons";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import BroadcastContext from "../../contexts/BroadcastContext";

// Audio file for "shuffled" sound effect
//const shuffleSound = new Audio("https://www.soundjay.com/misc/shuffling-cards-6.mp3");

const copyTextToClipboard = (text) => {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  // Fallback for browsers/contexts without the async clipboard API
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand("copy");
    return Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  } finally {
    document.body.removeChild(textArea);
  }
};

export const LogMessageDiv = ({ delta, deltaIndex }) => {
  const { gameBroadcast, chatBroadcast } = useContext(BroadcastContext);
  const replayStep = useSelector(state => state?.playerUi?.replayStep);
  const messageTextToHtml = useMessageTextToHtml();
  const plainText = usePlainText();
  const [hover, setHover] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(copiedTimeoutRef.current), []);

  // useEffect(() => {
  //   shuffleSound.load();
  // }, []);

  // const handlePlaySound = (message) => {
  //   if (message.includes("shuffled")) {
  //     shuffleSound.play();
  //   }
  // };

  const logMessages = delta._delta_metadata?.log_messages || [];

  const handleCopy = (event) => {
    event.stopPropagation();
    const text = logMessages.map(m => plainText(m)).filter(t => t).join("\n");
    copyTextToClipboard(text).then(() => {
      setCopied(true);
      clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  return (
    <div
      className={(deltaIndex === replayStep ? "bg-gray-700" : "") + " hover:bg-gray-600 cursor-pointer text-white"}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setCopied(false); }}
      onClick={() => gameBroadcast("step_through", { options: { size: "index", index: deltaIndex } })}
    >
      <div className="flex">
        {hover && (
          <div className="flex items-center justify-center" style={{ width: "3dvh", paddingLeft: "0.5dvh" }}>
            <FontAwesomeIcon icon={faCircleRight} className="text-white" />
          </div>
        )}
        <div className="text-white pl-1" style={{ width: "100%" }}>
          {logMessages.map((m, i) => {
            //handlePlaySound(m); // Play sound if "shuffled" is in the message
            return <div key={i}>{messageTextToHtml(m)}</div>;
          })}
        </div>
        {hover && (
          <div
            className="flex items-center justify-center hover:text-gray-300"
            style={{ width: "3dvh", paddingRight: "0.5dvh" }}
            title="Copy log message"
            onClick={handleCopy}
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? "text-green-400" : "text-white"} />
          </div>
        )}
      </div>
    </div>
  );
};
