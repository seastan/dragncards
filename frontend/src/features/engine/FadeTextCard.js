import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FadeText } from "./FadeText";
import { setValues } from "../store/gameUiSlice";

/**
 * FadeTextCard component that displays fade text messages on top of a specific card
 * Manages a queue of messages for this card with 0.1s delays between them
 *
 * @param {string} cardId - The ID of the card to display text on
 */
export const FadeTextCard = React.memo(({ cardId }) => {
  const dispatch = useDispatch();
  const cardMessages = useSelector(state => state?.gameUi?.game?.fadeText?.card?.[cardId]) || [];
  const [activeMessages, setActiveMessages] = useState([]);
  const nextMessageIdRef = useRef(0);
  const processedCountRef = useRef(0);

  useEffect(() => {
    // Reset if we've processed more than what's currently available
    if (processedCountRef.current > cardMessages.length) {
      processedCountRef.current = 0;
    }

    // Process new messages from fadeText list
    const newMessagesCount = cardMessages.length - processedCountRef.current;

    if (newMessagesCount > 0) {
      const newMessages = cardMessages.slice(processedCountRef.current);

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

  const handleMessageComplete = (messageId) => {
    setActiveMessages(prev => {
      const updated = prev.filter(msg => msg.id !== messageId);
      // Reset processed index and clear fadeText when all messages are done
      if (updated.length === 0) {
        processedCountRef.current = 0;
        dispatch(setValues({ updates: [["game", "fadeText", "card", cardId, []]] }));
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
      {activeMessages.map((message, index) => (
        <FadeText
          key={message.id}
          text={message.text}
          onComplete={() => handleMessageComplete(message.id)}
          delay={message.delay}
          className="text-white font-bold text-center absolute"
          style={{
            fontSize: "3dvh",
            padding: "1dvh 10dvh",
            background: "radial-gradient(in srgb-linear ellipse at center, rgb(0 0 0 / 0.90) 0%, rgb(0 0 0 / 0.00) 75%)",
            top: "0",
            left: "50%",
            transform: `translate(-50%, ${index * 35}px)`,
            transition: "transform 0.3s ease-out"
          }}
        />
      ))}
    </div>
  );
});
