import React, { useContext, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useMessageTextToHtml } from "./MessageLine";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleRight } from "@fortawesome/free-regular-svg-icons";
import BroadcastContext from "../../contexts/BroadcastContext";

// Audio file for "shuffled" sound effect
//const shuffleSound = new Audio("https://www.soundjay.com/misc/shuffling-cards-6.mp3");

export const LogMessageDiv = ({ delta, deltaIndex }) => {
  const { gameBroadcast, chatBroadcast } = useContext(BroadcastContext);
  const replayStep = useSelector(state => state?.playerUi?.replayStep);
  const messageTextToHtml = useMessageTextToHtml();
  const [hover, setHover] = useState(false);

  // useEffect(() => {
  //   shuffleSound.load();
  // }, []);

  // const handlePlaySound = (message) => {
  //   if (message.includes("shuffled")) {
  //     shuffleSound.play();
  //   }
  // };

  return (
    <div
      className={(deltaIndex === replayStep ? "bg-gray-700" : "") + " hover:bg-gray-600 cursor-pointer text-white"}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => gameBroadcast("step_through", { options: { size: "index", index: deltaIndex } })}
    >
      <div className="flex">
        {hover && (
          <div className="flex items-center justify-center" style={{ width: "3dvh", paddingLeft: "0.5dvh" }}>
            <FontAwesomeIcon icon={faCircleRight} className="text-white" />
          </div>
        )}
        <div className="text-white pl-1" style={{ width: "100%" }}>
          {delta._delta_metadata?.log_messages.map((m, i) => {
            //handlePlaySound(m); // Play sound if "shuffled" is in the message
            return <div key={i}>{messageTextToHtml(m)}</div>;
          })}
        </div>
      </div>
    </div>
  );
};
