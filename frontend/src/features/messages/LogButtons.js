import React, { useContext, useState } from "react";
import { faCaretLeft, faCaretRight, faDownload, faFastBackward, faFastForward } from "@fortawesome/free-solid-svg-icons";
import { MessageBoxButton } from "./MessageBoxButton";
import { useSelector } from "react-redux";
import BroadcastContext from "../../contexts/BroadcastContext";
import { useAllLogMessageDivs } from "../engine/hooks/useAllLogMessageDivs";
import { useAllLogMessageDownload } from "../engine/hooks/useAllLogMessageDownload";

export const LogButtons = React.memo(({}) => {
  const {gameBroadcast, chatBroadcast} = useContext(BroadcastContext);
  const allLogMessageDownload = useAllLogMessageDownload();
  const replayStep = useSelector(state => state?.playerUi?.replayStep);
  const numDeltas = useSelector(state => state?.gameUi?.deltas?.length);

  const handleStepThroughClick = (size, direction) => {
    gameBroadcast("step_through", {options: {size: size, direction: direction}});
  }

  const handleGoToClick = (index) => {
    gameBroadcast("step_through", {options: {size: "index", index: index}});
  }



  return(
    <div className="flex items-center h-full w-full">
      <MessageBoxButton selected={false} clickCallback={() => handleGoToClick(-1)} icon={faFastBackward}/>
      <MessageBoxButton selected={false} clickCallback={() => handleStepThroughClick("single", "undo")} icon={faCaretLeft}/>
      <div className="text-white px-1">{replayStep+1}/{numDeltas}</div>
      <MessageBoxButton selected={false} clickCallback={() => handleStepThroughClick("single", "redo")} icon={faCaretRight}/>
      <MessageBoxButton selected={false} clickCallback={() => handleGoToClick(numDeltas)} icon={faFastForward}/>
      <div className="w-2"/>
      <MessageBoxButton selected={false} clickCallback={() => allLogMessageDownload()} icon={faDownload}/>
    </div>
  ) 

});

