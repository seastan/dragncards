import React, { useEffect, useState } from "react";
import styled, { keyframes, css } from "styled-components";

// Keyframe for fade in
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// Keyframe for fade out
const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const FadeTextContainer = styled.div`
  animation: ${props => {
    if (props.phase === 'fadeIn') {
      return css`${fadeIn} 0.2s ease-in forwards`;
    } else if (props.phase === 'fadeOut') {
      return css`${fadeOut} 0.2s ease-out forwards`;
    }
    return 'none';
  }};
  opacity: ${props => props.phase === 'hold' ? 1 : 0};
  pointer-events: none;
`;

/**
 * FadeText component that displays text with fade in, hold, and fade out animation
 *
 * @param {string} text - The text to display
 * @param {function} onComplete - Callback when animation completes
 * @param {number} delay - Delay before starting animation (in ms)
 * @param {object} style - Additional styles to apply
 * @param {string} className - Additional CSS classes
 */
export const FadeText = React.memo(({ text, onComplete, delay = 0, style = {}, className = "" }) => {
  const [phase, setPhase] = useState('fadeIn');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // Start animation after delay
    const startTimer = setTimeout(() => {
      setStarted(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    // Fade in phase
    setPhase('fadeIn');

    const fadeInTimer = setTimeout(() => {
      // Hold phase
      setPhase('hold');

      const holdTimer = setTimeout(() => {
        // Fade out phase
        setPhase('fadeOut');

        const fadeOutTimer = setTimeout(() => {
          // Animation complete
          if (onComplete) onComplete();
        }, 200); // Fade out duration

        return () => clearTimeout(fadeOutTimer);
      }, 300); // Hold duration

      return () => clearTimeout(holdTimer);
    }, 200); // Fade in duration

    return () => clearTimeout(fadeInTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  if (!started) return null;

  return (
    <FadeTextContainer
      phase={phase}
      style={style}
      className={className}
    >
      {text}
    </FadeTextContainer>
  );
});
