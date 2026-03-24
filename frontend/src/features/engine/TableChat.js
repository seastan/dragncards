import React, { useState } from "react";
import { convertToPercentage, Z_INDEX } from "./functions/common";
import MessageBox from "../messages/MessageBox";

var delayBroadcast;

export const TableChat = React.memo(({
  region
}) => {
  const [chatHover, setChatHover] = useState(false);


  const handleStartChatHover = () => {
    if (delayBroadcast) clearTimeout(delayBroadcast);
    delayBroadcast = setTimeout(function() {
        setChatHover(true);
    }, 1000);
  }
  const handleStopChatHover = () => {
    if (delayBroadcast) clearTimeout(delayBroadcast);
    setChatHover(false);
  }

  return (
    <div className="absolute" 
      style={{
        left: convertToPercentage(region.left), 
        top: convertToPercentage(region.top), 
        width: convertToPercentage(region.width), 
        height: convertToPercentage(region.height)
      }}>
    <div
      className="absolute bottom-0 left-0"
      style={{
        height: chatHover ? "100dvh" : "100%",
        width: '100%',
        zIndex: chatHover ? Z_INDEX.ChatHover : 0,
        transition: "height 0.3s ease",
        borderRadius: chatHover ? "0" : "8px 8px 0 0",
        overflow: "hidden",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.5), -2px 0 12px rgba(0,0,0,0.3)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "none",
      }}
      onMouseEnter={() => handleStartChatHover()}
      onMouseLeave={() => handleStopChatHover()}>
      <MessageBox hover={chatHover}/>
    </div>
  </div>
  )
})