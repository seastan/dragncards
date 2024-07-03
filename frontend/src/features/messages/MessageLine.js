import React from "react";
import { useGameDefinition } from "../engine/hooks/useGameDefinition";
import useProfile from "../../hooks/useProfile";
import { getPlayerIColor } from "../engine/functions/common";

export const useFormatLabelsInText = () => {
  const gameDef = useGameDefinition();
  const user = useProfile();
  const language = user?.language || "English";

  return (text) => {
    if (!text) return "";
    return text.replace(/id:([a-zA-Z0-9_\-]+(\.[a-zA-Z0-9_\-]+)*)/g, function(match, p1) {
      return gameDef?.labels?.[p1]?.[language] || p1;
    });
  }
}

export const useMessageTextToHtml = () => {
  const gameDef = useGameDefinition();
  const user = useProfile();
  const language = user?.language || "English";
  const formatLabelsInText = useFormatLabelsInText();
  console.log("useMessageTextToHtml 0");

  return (text) => {
    console.log("useMessageTextToHtml 1", text+'"');
    // Format labels first
    const labelsFormatted = formatLabelsInText(text);

    const regex = /\[player\d+\/[^\]]+\]/g; // Regex to match the pattern [playerN/Name]
    const parts = labelsFormatted.split(regex); // Split the text by these patterns

    // Find all matches for the pattern
    const matches = labelsFormatted.match(regex) || [];

    const aliasFormatted = parts.reduce((acc, part, index) => {
      acc.push(<span key={`text-${index}`}>{part}</span>);

      if (index < matches.length) {
        const match = matches[index];
        const playerIdentifier = match.match(/\[player\d+/)[0].slice(1); // Extracts 'playerN'
        const color = getPlayerIColor(playerIdentifier);
        const newMatch = match.replace("[player", "["); // Removes 'playerN' from the match
        acc.push(
          <span key={`player-${index}`} style={{color: color}}>
            {newMatch}
          </span>
        );
      }

      return acc;
    }, []);

    console.log("useMessageTextToHtml 2", aliasFormatted);

    return aliasFormatted;
  }
};


export const MessageLine = ({ message }) => {
  const cleanText = message?.text ? message.text.replace(/<\/?.+?>/ig, '') : "";
  const messageTextToHtml = useMessageTextToHtml();
  const processedText = messageTextToHtml(cleanText);

  return (
    <div className="ml-4" style={{fontFamily: "monospace", fontSize: "1.4vh"}}>
      <span className="text-white">{processedText}</span>
    </div>
  )

};
export default MessageLine;
