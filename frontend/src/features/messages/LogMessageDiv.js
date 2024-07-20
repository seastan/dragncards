import React, { useContext, useState } from "react";
import { useSelector } from "react-redux";
import { useMessageTextToHtml } from "./MessageLine";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleRight } from "@fortawesome/free-regular-svg-icons";
import BroadcastContext from "../../contexts/BroadcastContext";

export const LogMessageDiv = ({ delta, deltaIndex }) => {
  const {gameBroadcast, chatBroadcast} = useContext(BroadcastContext);
  const replayStep = useSelector(state => state?.playerUi?.replayStep);
  const messageTextToHtml = useMessageTextToHtml();
  const [hover, setHover] = useState(false);
  return(
    <div
      className={(deltaIndex === replayStep ? "bg-gray-700" : "") + " hover:bg-gray-600 cursor-pointer text-white"}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => gameBroadcast("step_through", {options: {size: "index", index: deltaIndex}})}
    >
      <div className="flex">
        {hover && <div className="flex items-center jusitfy-center" style={{width: "3dvh", paddingLeft: "0.5dvh"}}>
          <FontAwesomeIcon icon={faCircleRight} className="text-white"/>
        </div>}
        <div className="text-white pl-1" style={{width: "100%"}}>
          {delta._delta_metadata?.log_messages.map((m, i) => {
            return <div key={i}>{messageTextToHtml(m)}</div>
          })}
        </div>
      </div>
    </div>
  ) 

};

