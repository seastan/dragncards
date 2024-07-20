import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const MessageBoxButton = React.memo(({ selected, clickCallback, icon }) => {
  return(
    <div 
      className={`flex items-center justify-center cursor-pointer rounded ${selected ? "bg-gray-200" : "hover:bg-gray-300"}`} 
      style={{height: "2.5dvh", width: "2.5dvh", margin: "0.25dvh"}}
      onClick={clickCallback}
    >
      <FontAwesomeIcon icon={icon} className={`${selected ? "text-gray-800" : ""}`}/>
    </div>
  ) 
});

