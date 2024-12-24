import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const MessageBoxButton = React.memo(({ selected, clickCallback, icon, blink = false }) => {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (blink) {
      const intervalId = setInterval(() => {
        setBlinking(prev => !prev);
      }, 500);
      return () => clearInterval(intervalId); // Clean up on unmount
    }
  }, [blink]);

  return (
    <div 
      className={`flex items-center justify-center cursor-pointer rounded ${selected ? "bg-gray-200" : "hover:bg-gray-300"} ${blinking ? "bg-red-700" : ""}`} 
      style={{ height: "2.5dvh", width: "2.5dvh", margin: "0.25dvh" }}
      onClick={clickCallback}
    >
      <FontAwesomeIcon icon={icon} className={`${selected ? "text-gray-800" : ""}`} />
    </div>
  );
});

