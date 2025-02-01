import React from "react";
import MessageLines from "./MessageLines";
import { useAllLogMessageDivs } from "../engine/hooks/useAllLogMessageDivs";

export const LogDiv = ({ hover }) => {
  const allLogMessageDivs = useAllLogMessageDivs();

  return (
    <div className="flex flex-col" style={{height: "100%"}}>
      <div className="bg-gray-900 overflow-y-auto" style={{height: `calc(100%)`}}>
        <MessageLines hover={hover} messageDivs={allLogMessageDivs} />
      </div>
    </div>

  )
}