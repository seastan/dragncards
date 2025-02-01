import React, { useContext, useState } from "react";
import { convertToPercentage, Z_INDEX } from "./functions/common";
import BroadcastContext from "../../contexts/BroadcastContext";
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
      style={{height: chatHover ? "100dvh" : "100%", width:'100%', zIndex: chatHover ? Z_INDEX.ChatHover : 0}}
      onMouseEnter={() => handleStartChatHover()}
      onMouseLeave={() => handleStopChatHover()}>
      <MessageBox hover={chatHover}/>
    </div>
  </div>
  )
})