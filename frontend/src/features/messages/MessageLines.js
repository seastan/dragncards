import React, { useRef, useEffect } from "react";
import { useSelector } from "react-redux";


export const MessageLines = ({ hover, messageDivs }) => {
  const touchMode = useSelector(state => state?.playerUi?.userSettings?.touchMode);
  const bottomRef = useRef();
  console.log("Rendering MessageLines", messageDivs)

  const isUserZoomedIn = () => {
    if (window.visualViewport) {
      return window.visualViewport.scale > 1;
    }
    return window.innerWidth !== window.outerWidth || window.innerHeight !== window.outerHeight;
  };

  const scrollToBottom = () => {
    if (bottomRef?.current)
      bottomRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  useEffect(() => {
    if (!isUserZoomedIn()) scrollToBottom();
  }, [messageDivs, hover, touchMode])

  return (
    <div>
      {messageDivs}
      <div ref={bottomRef} className="list-bottom"></div>
    </div>
  );

};
export default MessageLines;


// import React from "react";
// import ScrollToBottom from "react-scroll-to-bottom";
// import ChatMessagesInner from "./ChatMessagesInner";
// import { ChatMessage } from "elixir-backend";
// import cx from "classnames";

// interface Props {
//   messages: Array<ChatMessage>;
//   className?: string;
// }

// export const ChatMessages: React.FC<Props> = ({ messages, className }) => {
//   return (
//     // <ScrollToBottom
//     //   className={cx(
//     //     "bg-gray-700 rounded p-2 overflow-hidden",
//     //     className
//     //   )}
//     // >
//       <ChatMessagesInner messages={messages} />
//     // </ScrollToBottom>
//   );
// };
// export default ChatMessages;
