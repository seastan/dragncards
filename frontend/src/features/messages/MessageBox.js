import React, { useState, useEffect } from "react";
import { useMessages } from "../../contexts/MessagesContext";
import { ChatDiv } from "./ChatDiv";
import { LogDiv } from "./LogDiv";
import { faComment, faRectangleList } from "@fortawesome/free-regular-svg-icons";
import { MessageBoxButton } from "./MessageBoxButton";
import { LogButtons } from "./LogButtons";
import { useSendLocalMessage } from "../engine/hooks/useSendLocalMessage";

export const MessageBox = ({ hover }) => {
  const newMessageObjects = useMessages();
  const sendLocalMessage = useSendLocalMessage();
  const [showingLog, setShowingLog] = useState(true);
  const [newChatMessageNotification, setNewChatMessageNotification] = useState(false);

  const [allLogMessageObjects, setAllLogMessageObjects] = useState([]);
  const [allChatMessageObjects, setAllChatMessageObjects] = useState([]);

  const displayedMessages = showingLog ? allLogMessageObjects : allChatMessageObjects;

  console.log("Rendering Chat", displayedMessages)

  const handleShowChatClick = () => {
    setShowingLog(false);
    setNewChatMessageNotification(false);
  } 
  const handleShowLogClick = () => {
    setShowingLog(true);
  } 


  useEffect(() => {
    const filteredNewChatMessageObjects = newMessageObjects?.filter(obj2 => obj2.sent_by !== -1 && !allChatMessageObjects.find(obj1 => obj1.shortcode === obj2.shortcode));
    const filteredNewLogMessageObjects = newMessageObjects?.filter(obj2 => obj2.sent_by === -1 && !allLogMessageObjects.find(obj1 => obj1.shortcode === obj2.shortcode));
    console.log("MessageBox useEffect", {newMessageObjects, filteredNewLogMessageObjects, allLogMessageObjects})

    if (newMessageObjects) {
      setAllChatMessageObjects([...allChatMessageObjects, ...filteredNewChatMessageObjects])
      if (showingLog) {
        setNewChatMessageNotification(filteredNewChatMessageObjects.length > 0)
        sendLocalMessage("New chat message recieved")
      }
    }
    if (newMessageObjects) setAllLogMessageObjects([...allLogMessageObjects, ...filteredNewLogMessageObjects])
  }, [newMessageObjects]);

  return (
    <div className="overflow-hidden h-full bg-gray-900">
      <div className="overflow-y-auto" style={{height: `calc(100% - 3dvh)`}}>
        {showingLog && <LogDiv hover={hover}/>}
        {!showingLog && <ChatDiv hover={hover}/>}
      </div>
      <div 
        className={`flex items-center float-left w-full text-white select-none`}
        style={{height: "3dvh", borderTop: "1px solid gray"}}
      >
        <div className="flex px-2">
          <MessageBoxButton selected={showingLog} clickCallback={handleShowLogClick} icon={faRectangleList}/>
          <MessageBoxButton selected={!showingLog} clickCallback={handleShowChatClick} icon={faComment} blink={newChatMessageNotification}/>
        </div>
        <div
          className={"h-full w-full px-2"}
          style={{borderLeft: "1px solid gray"}}
        >
          {showingLog && <LogButtons/>}
        </div>
      </div>
      {/* <div 
        className={`flex items-center justify-center float-left text-white ${showingLog ? "bg-gray-700" : "bg-gray-500"} hover:bg-gray-400 select-none`  }
        style={{height: "3dvh", width: "calc(50% - 1.5dvh)", animation: smoothScroll ? "glowing 1s infinite ease" : ""}}
        onClick={() => handleShowChatClick()}>
        Chat
      </div>
      <div 
        className="flex items-center justify-center float-left border-l text-white bg-gray-900 hover:bg-red-700" onClick={(e) => {e.stopPropagation(); downloadHTML(displayedMessages)}}
        style={{height: "3dvh", width: "2.99dvh", animation: smoothScroll ? "glowing 1s infinite ease" : ""}}>
          <FontAwesomeIcon icon={faDownload}/>
      </div> */}
    </div>

  );
};
export default React.memo(MessageBox);
