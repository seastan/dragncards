import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes, css } from "styled-components";

// Animation timings (ms)
export const FADE_IN_MS = 200;
export const FADE_OUT_MS = 200;
export const DEFAULT_HOLD_MS = 600;
// A hold duration of PERSISTENT_HOLD_MS means "stay until bumped by the next message"
export const PERSISTENT_HOLD_MS = -1;

/**
 * Normalizes a fadeText entry from the game state into {text, holdMs}.
 * Entries are either plain strings (no duration given) or
 * {text, duration} where duration is in seconds (-1 = stay until bumped).
 */
export const normalizeFadeMessage = (entry) => {
  if (typeof entry === "string") return { text: entry, holdMs: DEFAULT_HOLD_MS };
  const text = entry?.text ?? "";
  const duration = entry?.duration;
  if (typeof duration !== "number") return { text, holdMs: DEFAULT_HOLD_MS };
  if (duration < 0) return { text, holdMs: PERSISTENT_HOLD_MS };
  return { text, holdMs: duration * 1000 };
};

// Keyframe for fade in with scale
const fadeInScale = keyframes`
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

// Keyframe for fade out
const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

// Outer container for positioning (receives style prop)
const FadeTextContainer = styled.div`
  pointer-events: none;
`;

// Inner container for animation
const FadeTextInner = styled.div`
  animation: ${props => {
    if (props.phase === 'fadeIn') {
      return css`${fadeInScale} 0.2s ease-in forwards`;
    } else if (props.phase === 'fadeOut') {
      return css`${fadeOut} 0.2s ease-out forwards`;
    }
    return 'none';
  }};
  opacity: ${props => props.phase === 'hold' ? 1 : 0};
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  white-space: nowrap;
`;

/**
 * FadeText component that displays text with fade in, hold, and fade out animation
 * Supports inline token images via "token:<tokenId>" syntax
 *
 * @param {string} text - The text to display (can include "token:<tokenId>" patterns)
 * @param {function} onComplete - Callback when animation completes
 * @param {number} delay - Delay before starting animation (in ms)
 * @param {object} style - Additional styles to apply
 * @param {string} className - Additional CSS classes
 * @param {object} gameDef - Game definition object containing token definitions
 * @param {number} holdMs - How long to hold the text before fading out (in ms).
 *                          PERSISTENT_HOLD_MS (-1) holds until `dismissed` becomes true.
 * @param {boolean} dismissed - When true, fade out now (used to bump a persistent message)
 */
export const FadeText = React.memo(({ text, onComplete, delay = 0, style = {}, className = "", gameDef = null, holdMs = DEFAULT_HOLD_MS, dismissed = false }) => {
  const [phase, setPhase] = useState('fadeIn');
  const [started, setStarted] = useState(false);

  // Parse text and replace "token:<tokenId>" with token images
  const parseTextWithTokens = (text) => {
    if (!gameDef) return [{ type: 'text', content: text }];

    const parts = [];
    const regex = /token:([a-zA-Z0-9_-]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before the token
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }

      // Add the token
      const tokenId = match[1];
      const tokenDef = gameDef.tokens?.[tokenId];
      if (tokenDef && tokenDef.imageUrl) {
        parts.push({ type: 'token', tokenId, imageUrl: tokenDef.imageUrl });
      } else {
        // If token not found, keep the original text
        parts.push({ type: 'text', content: match[0] });
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  const contentParts = parseTextWithTokens(text);

  // Keep the latest onComplete without restarting the animation timers
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    // Start animation after delay
    const startTimer = setTimeout(() => {
      setStarted(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    const timers = [];

    // Fade in phase
    setPhase('fadeIn');

    timers.push(setTimeout(() => {
      // Hold phase
      setPhase('hold');

      // Persistent messages hold until they are dismissed by the next message
      if (holdMs < 0) return;

      timers.push(setTimeout(() => {
        // Fade out phase
        setPhase('fadeOut');

        timers.push(setTimeout(() => {
          // Animation complete
          if (onCompleteRef.current) onCompleteRef.current();
        }, FADE_OUT_MS));
      }, holdMs));
    }, FADE_IN_MS));

    return () => timers.forEach(clearTimeout);
  }, [started, holdMs]);

  // Bumped by a newer message: fade out early
  useEffect(() => {
    if (!started || !dismissed) return;

    setPhase('fadeOut');

    const fadeOutTimer = setTimeout(() => {
      if (onCompleteRef.current) onCompleteRef.current();
    }, FADE_OUT_MS);

    return () => clearTimeout(fadeOutTimer);
  }, [started, dismissed]);

  if (!started) return null;

  return (
    <FadeTextContainer
      style={style}
      className={className}
    >
      <FadeTextInner phase={phase}>
        {contentParts.map((part, index) => {
          if (part.type === 'text') {
            return <span key={index}>{part.content}</span>;
          } else if (part.type === 'token') {
            return (
              <img
                key={index}
                src={part.imageUrl}
                alt={part.tokenId}
                style={{
                  display: 'inline-block',
                  height: '1em',
                  verticalAlign: 'middle',
                  margin: '0 0.1em'
                }}
              />
            );
          }
          return null;
        })}
      </FadeTextInner>
    </FadeTextContainer>
  );
});
