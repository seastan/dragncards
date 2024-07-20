import React, { useEffect, useState, useContext } from "react";
import { useMessages } from "../../contexts/MessagesContext";
import MessageLines from "./MessageLines";
import ChatInput from "./ChatInput";
import { useMessageTextToHtml } from "./MessageLine";
import BroadcastContext from "../../contexts/BroadcastContext";
import { PlayersInRoom } from "../engine/PlayersInRoom";

export const ChatDiv = ({ hover }) => {
  const {gameBroadcast, chatBroadcast} = useContext(BroadcastContext);
  const newMessageObjects = useMessages();
  const messageTextToHtml = useMessageTextToHtml();
  const [allChatMessageObjects, setAllChatMessageObjects] = useState([]);
  console.log("Rendering Chat", allChatMessageObjects)

  useEffect(() => {
    const filteredNewChatMessageObjects = newMessageObjects?.filter(obj2 => obj2.sent_by !== -1 && !allChatMessageObjects.find(obj1 => obj1.shortcode === obj2.shortcode));
    if (newMessageObjects) setAllChatMessageObjects([...allChatMessageObjects, ...filteredNewChatMessageObjects])
  }, [newMessageObjects]);

  const allChatMessageDivs = allChatMessageObjects.map((m, i) => {
    return <div className="pl-2 text-white">{messageTextToHtml(m.text)}</div>
  })
  console.log("allChatMessageDivs", allChatMessageDivs)

  return (
    <div className="flex" style={{height: "100%"}}>
      <div style={{height: "100%", width: "35%", borderRight: "1px solid gray"}}>
        <PlayersInRoom/>
      </div>
      <div className="flex flex-col" style={{height: "100%", width: "65%"}}>
        <div className="bg-gray-900 overflow-y-auto" style={{height: `calc(100% - 3dvh)`}}>
          <MessageLines hover={hover} messageDivs={allChatMessageDivs} />
        </div>
        <div className="text-center float-left" style={{height: "3dvh", width: "100%"}}>
          <ChatInput chatBroadcast={chatBroadcast}/>
        </div>
      </div>
    </div>

  )
}