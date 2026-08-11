import React, { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { FadeText, normalizeFadeMessage, PERSISTENT_HOLD_MS, FADE_IN_MS, FADE_OUT_MS } from "./FadeText";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { Z_INDEX } from "./functions/common";

// Grace period so the rendered animation finishes before the message is dropped
const REMOVAL_GRACE_MS = 100;

/**
 * FadeTextPlayer component that displays fade text messages in the center of the screen
 * for the currently observing player
 * Manages a queue of messages with 0.1s delays between them (max 5 visible at once)
 *
 * Messages are queued per player rather than for the observing player only, so that
 * switching seats (or switching who you are looking at) shows what that player sees.
 * This matters for messages that hold until bumped, since game.fadeText is cleared at
 * the start of every action and can no longer be replayed after that.
 */
export const FadeTextPlayer = React.memo(() => {
  const gameDef = useGameDefinition();
  const observingPlayerN = useSelector(state => state?.playerUi?.observingPlayerN);
  const fadeTextPlayerMap = useSelector(state => state?.gameUi?.game?.fadeText?.player);
  const [messagesByPlayer, setMessagesByPlayer] = useState({});
  const nextMessageIdRef = useRef(0);
  const processedListRef = useRef({});
  const persistentIdRef = useRef({});

  const removeMessage = (playerI, messageId) => {
    setMessagesByPlayer(prev => {
      const prevMessages = prev[playerI] || [];
      const updated = prevMessages.filter(msg => msg.id !== messageId);
      if (updated.length === prevMessages.length) return prev;
      return { ...prev, [playerI]: updated };
    });
  };

  useEffect(() => {
    const playerMap = fadeTextPlayerMap || {};

    Object.entries(playerMap).forEach(([playerI, entries]) => {
      if (!Array.isArray(entries) || entries.length === 0) return;

      // The map identity changes on every game update, so only queue a list once
      if (processedListRef.current[playerI] === entries) return;
      processedListRef.current[playerI] = entries;

      entries.forEach((entry, index) => {
        const delay = index * 200; // 0.2s delay between messages
        const messageId = nextMessageIdRef.current++;
        const { text, holdMs } = normalizeFadeMessage(entry);

        setTimeout(() => {
          // A new message bumps the one that was holding until bumped. There is at most
          // one of those per player, since every message bumps it.
          const bumpedId = persistentIdRef.current[playerI];
          persistentIdRef.current[playerI] = holdMs === PERSISTENT_HOLD_MS ? messageId : null;

          setMessagesByPlayer(prev => {
            const prevMessages = prev[playerI] || [];
            return {
              ...prev,
              [playerI]: [
                ...prevMessages.map(msg => msg.id === bumpedId ? { ...msg, dismissed: true } : msg),
                {
                  id: messageId,
                  text: text,
                  holdMs: holdMs,
                  dismissed: false,
                  delay: 0
                }
              ]
            };
          });

          // Messages queued for a player nobody is observing are never mounted, so their
          // lifetime cannot depend on the animation reporting back that it finished
          if (bumpedId != null) {
            setTimeout(() => removeMessage(playerI, bumpedId), FADE_OUT_MS + REMOVAL_GRACE_MS);
          }
          if (holdMs !== PERSISTENT_HOLD_MS) {
            setTimeout(
              () => removeMessage(playerI, messageId),
              FADE_IN_MS + holdMs + FADE_OUT_MS + REMOVAL_GRACE_MS
            );
          }
        }, delay);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fadeTextPlayerMap]);

  // Count tokens in a message to adjust centering
  const countTokens = (text) => {
    const matches = text.match(/token:[a-zA-Z0-9_-]+/g);
    return matches ? matches.length : 0;
  };

  const activeMessages = messagesByPlayer[observingPlayerN] || [];

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
              onComplete={() => removeMessage(observingPlayerN, message.id)}
              delay={message.delay}
              holdMs={message.holdMs}
              dismissed={message.dismissed}
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
