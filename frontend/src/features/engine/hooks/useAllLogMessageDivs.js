import React from "react";
import { LogMessageDiv } from "../../messages/LogMessageDiv";
import { useSelector } from "react-redux";

export const useAllLogMessageDivs = () => {
  const deltas = useSelector(state => state?.gameUi?.deltas);

  const allLogMessageDivs = deltas.map((delta, deltaIndex) => {
      return(<LogMessageDiv key={deltaIndex} delta={delta} deltaIndex={deltaIndex}/>)
  })
  console.log("useAllLogMessageDivs", allLogMessageDivs)

  return allLogMessageDivs;
}

