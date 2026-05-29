import React, { useState, useRef, useEffect } from 'react';
import { convertToPercentage, Z_INDEX } from '../engine/functions/common';
import { useLayout } from '../engine/hooks/useLayout';
import MessageBox from '../messages/MessageBox';

const COLLAPSE_TRANSITION_MS = 300;
var delayBroadcast;

export const Dnc3DHudChat = React.memo(() => {
  const layout = useLayout();
  const [chatHover, setChatHover] = useState(false);
  // Delayed version of chatHover: becomes false only after the height transition
  // completes, so MessageLines scrolls to bottom on the final collapsed height.
  const [scrollHover, setScrollHover] = useState(false);
  const contextMenuOpenRef = useRef(false);

  useEffect(() => {
    if (chatHover) {
      setScrollHover(true);
    } else {
      const t = setTimeout(() => setScrollHover(false), COLLAPSE_TRANSITION_MS);
      return () => clearTimeout(t);
    }
  }, [chatHover]);

  const region = layout?.chat;
  if (!region) return null;

  const handleStartChatHover = () => {
    if (delayBroadcast) clearTimeout(delayBroadcast);
    delayBroadcast = setTimeout(() => setChatHover(true), 1000);
  };
  const handleStopChatHover = () => {
    if (contextMenuOpenRef.current) return;
    if (delayBroadcast) clearTimeout(delayBroadcast);
    setChatHover(false);
  };
  const handleContextMenu = () => {
    contextMenuOpenRef.current = true;
    const reset = () => { contextMenuOpenRef.current = false; };
    document.addEventListener('mousedown', reset, { once: true });
    document.addEventListener('keydown', reset, { once: true });
  };

  return (
    <div
      className="absolute"
      style={{
        left: convertToPercentage(region.left),
        top: convertToPercentage(region.top),
        width: convertToPercentage(region.width),
        height: convertToPercentage(region.height),
        zIndex: 10000,
        pointerEvents: 'auto',
      }}
    >
      <div
        className="absolute bottom-0 left-0"
        style={{
          height: chatHover ? '100dvh' : '100%',
          width: '100%',
          zIndex: chatHover ? Z_INDEX.ChatHover : 0,
          transition: 'height 300ms ease-out',
        }}
        onMouseEnter={handleStartChatHover}
        onMouseLeave={handleStopChatHover}
        onContextMenu={handleContextMenu}
      >
        <MessageBox hover={scrollHover} />
      </div>
    </div>
  );
});
