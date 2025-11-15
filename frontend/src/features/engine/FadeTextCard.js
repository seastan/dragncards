import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FadeText } from "./FadeText";
import { setValues } from "../store/gameUiSlice";
import { useGameDefinition } from "./hooks/useGameDefinition";

/**
 * FadeTextCard component that displays fade text messages on top of a specific card
 * Manages a queue of messages for this card with 0.1s delays between them
 *
 * @param {string} cardId - The ID of the card to display text on
 */
export const FadeTextCard = React.memo(({ cardId }) => {
  const dispatch = useDispatch();
  const gameDef = useGameDefinition();
  const fadeText = useSelector(state => state.gameUi?.game?.fadeText);
  const cardMessages = useSelector(state => state?.gameUi?.game?.fadeText?.card?.[cardId]) || [];
  const [activeMessages, setActiveMessages] = useState([]);
  const nextMessageIdRef = useRef(0);
  const processedCountRef = useRef(0);

  useEffect(() => {
    // New batch of messages arrived, reset the index.
    processedCountRef.current = 0;

    // Process new messages from fadeText list
    const newMessages = cardMessages.slice(processedCountRef.current);

    if (newMessages.length > 0) {
      newMessages.forEach((text, index) => {
        const delay = index * 100; // 0.1s delay between messages
        const messageId = nextMessageIdRef.current++;

        setTimeout(() => {
          setActiveMessages(prev => [...prev, {
            id: messageId,
            text: text,
            delay: 0
          }]);
        }, delay);
      });

      processedCountRef.current = cardMessages.length;
    }
  }, [cardMessages]);

  // Count tokens in a message to adjust centering
  const countTokens = (text) => {
    const matches = text.match(/token:[a-zA-Z0-9_-]+/g);
    return matches ? matches.length : 0;
  };

  const handleMessageComplete = (messageId) => {
    setActiveMessages(prev => {
      const updated = prev.filter(msg => msg.id !== messageId);
      // Reset processed index and clear fadeText when all messages are done
      if (updated.length === 0) {
        processedCountRef.current = 0;
      }
      return updated;
    });
  };

  if (activeMessages.length === 0) return null;

  return (
    <div
      className="absolute w-full h-full"
      style={{
        pointerEvents: "none",
        top: 0,
        left: 0
      }}
    >
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
              fontSize: "3dvh",
              padding: "1dvh 3dvh",
              background: "radial-gradient(in srgb-linear ellipse at center, rgb(0 0 0 / 0.90) 0%, rgb(0 0 0 / 0.00) 75%)",
              top: "0",
              left: "50%",
              transform: `translate(calc(-50% - ${tokenOffset}em), ${index * 35}px)`,
              transition: "transform 0.3s ease-out"
            }}
          />
        );
      })}
    </div>
  );
});
