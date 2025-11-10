import React, { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FadeText } from "./FadeText";
import { setValues } from "../store/gameUiSlice";
import { Z_INDEX } from "./functions/common";

/**
 * FadeTextGame component that displays fade text messages in the center of the screen
 * Manages a queue of messages with 0.1s delays between them (max 5 visible at once)
 */
export const FadeTextGame = React.memo(() => {
  const dispatch = useDispatch();
  const gameMessages = useSelector(state => state?.gameUi?.game?.fadeText?.game) || [];
  const [activeMessages, setActiveMessages] = useState([]);
  const nextMessageIdRef = useRef(0);
  const processedIndexRef = useRef(0);

  console.log("FadeTextGame render", gameMessages, activeMessages);

  useEffect(() => {
    // Reset if we've processed more than what's currently available
    if (processedIndexRef.current > gameMessages.length) {
      processedIndexRef.current = 0;
    }

    // Process new messages from fadeText list
    const newMessages = gameMessages.slice(processedIndexRef.current);

    if (newMessages.length > 0) {
      newMessages.forEach((text, index) => {
        const delay = index * 200; // 0.1s delay between messages
        const messageId = nextMessageIdRef.current++;

        setTimeout(() => {
          setActiveMessages(prev => [...prev, {
            id: messageId,
            text: text,
            delay: 0
          }]);
        }, delay);
      });

      processedIndexRef.current = gameMessages.length;
    }
  }, [gameMessages]);

  const handleMessageComplete = (messageId) => {
    setActiveMessages(prev => {
      const updated = prev.filter(msg => msg.id !== messageId);
      // Reset processed index and clear fadeText when all messages are done
      if (updated.length === 0) {
        processedIndexRef.current = 0;
        //dispatch(setValues({ updates: [["game", "fadeText", "game", []]] }));
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
        {activeMessages.map((message, index) => (
          <FadeText
            key={message.id}
            text={message.text}
            onComplete={() => handleMessageComplete(message.id)}
            delay={message.delay}
            className="text-white font-bold text-center absolute"
            style={{
              fontSize: "10dvh",
              padding: "2dvh 6dvh",
              background: "radial-gradient(in srgb-linear ellipse at center, rgb(0 0 0 / 0.90) 0%, rgb(0 0 0 / 0.00) 70%)",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, calc(-50% + ${(index - (activeMessages.length - 1) / 2) * 80}px))`,
              transition: "transform 0.3s ease-out"
            }}
          />
        ))}
      </div>
    </div>
  );
});
