import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { FadeText } from "./FadeText";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { Z_INDEX } from "./functions/common";

/**
 * FadeTextPlayer component that displays fade text messages in the center of the screen
 * for the currently observing player
 * Manages a queue of messages with 0.1s delays between them (max 5 visible at once)
 */
export const FadeTextPlayer = React.memo(() => {
  const gameDef = useGameDefinition();
  const observingPlayerN = useSelector(state => state?.playerUi?.observingPlayerN);
  const playerMessages = useSelector(state => state?.gameUi?.game?.fadeText?.player?.[observingPlayerN]) || [];
  const [activeMessages, setActiveMessages] = useState([]);
  const nextMessageIdRef = useRef(0);
  const processedIndexRef = useRef(0);

  console.log("FadeTextPlayer render", observingPlayerN, playerMessages, activeMessages);

  useEffect(() => {
    console.log("FadeTextPlayer useEffect", observingPlayerN, playerMessages, activeMessages);
    // New batch of messages arrived, reset the index.
    processedIndexRef.current = 0;

    // Process new messages from fadeText list
    const newMessages = playerMessages.slice(processedIndexRef.current);

    if (newMessages.length > 0) {
      newMessages.forEach((text, index) => {
        const delay = index * 200; // 0.2s delay between messages
        const messageId = nextMessageIdRef.current++;

        setTimeout(() => {
          setActiveMessages(prev => [...prev, {
            id: messageId,
            text: text,
            delay: 0
          }]);
        }, delay);
      });

      processedIndexRef.current = playerMessages.length;
    }
  }, [playerMessages]);

  // Count tokens in a message to adjust centering
  const countTokens = (text) => {
    const matches = text.match(/token:[a-zA-Z0-9_-]+/g);
    return matches ? matches.length : 0;
  };

  const handleMessageComplete = (messageId) => {
    setActiveMessages(prev => {
      const updated = prev.filter(msg => msg.id !== messageId);
      // Reset processed index when all messages are done
      if (updated.length === 0) {
        processedIndexRef.current = 0;
      }
      return updated;
    });
  };

  if (activeMessages.length === 0) return null;

  return (
    <div
      className="absolute w-full h-full flex items-center justify-center"
      style={{
        zIndex: Z_INDEX.GiantCard + 1,
        pointerEvents: "none"
      }}
    >
      <div className="relative" style={{ height: "100%" }}>
        {activeMessages.map((message, index) => {
          const tokenCount = countTokens(message.text);
          const tokenOffset = tokenCount * 0.6; // Shift left by 0.6em per token
          return (
            <FadeText
              key={message.id}
              text={message.text}
              onComplete={() => handleMessageComplete(message.id)}
              delay={message.delay}
              gameDef={gameDef}
              className="text-white font-bold text-center absolute"
              style={{
                fontSize: "6dvh",
                padding: "2dvh 6dvh",
                background: "radial-gradient(in srgb-linear ellipse at center, rgb(0 0 0 / 0.90) 0%, rgb(0 0 0 / 0.00) 70%)",
                top: "50%",
                left: "50%",
                transform: `translate(calc(-50% - ${tokenOffset}em), calc(-50% + ${(index - (activeMessages.length - 1) / 2) * 8}dvh))`,
                transition: "transform 0.3s ease-out"
              }}
            />
          );
        })}
      </div>
    </div>
  );
});
