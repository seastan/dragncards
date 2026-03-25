import React from "react";
import { useGameDefinition } from "../engine/hooks/useGameDefinition";
import useProfile from "../../hooks/useProfile";
import { useRichText } from "./useRichText";

export const useFormatLabelsInText = () => {
  const gameDef = useGameDefinition();
  const user = useProfile();
  const language = user?.language || "English";

  return (text) => {
    if (!text) return "";
    return text.replace(/id:([a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)*)/g, function(match, p1) {
      return gameDef?.labels?.[p1]?.[language] || p1;
    });
  }
}

export const useMessageTextToHtml = () => {
  const richText = useRichText();
  return (text) => richText(text, { context: "log" });
};


export const MessageLine = ({ message }) => {
  const cleanText = message?.text ? message.text.replace(/<\/?.+?>/ig, '') : "";
  const messageTextToHtml = useMessageTextToHtml();
  const processedText = messageTextToHtml(cleanText);

  return (
    <div className="ml-4" style={{fontFamily: "monospace", fontSize: "1.4dvh"}}>
      <span className="text-white">{processedText}</span>
    </div>
  )

};
export default MessageLine;
