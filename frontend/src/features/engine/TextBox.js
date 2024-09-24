import React from "react";
import { convertToPercentage } from "./functions/common";
import { useSelector } from "react-redux";

export const TextBox = React.memo(({
  textBoxId,
  textBoxLayoutInfo
}) => {
  const textBox = useSelector(state => state?.gameUi?.game?.textBoxById?.[textBoxId]);
  console.log("Rendering TextBox", textBoxLayoutInfo, textBox);
  return (
    <div 
      className="absolute flex border border-gray-500 justify-center items-center text-gray-400 bg-gray-700" 
      style={{
        left: convertToPercentage(textBoxLayoutInfo.left), 
        top: convertToPercentage(textBoxLayoutInfo.top), 
        width: convertToPercentage(textBoxLayoutInfo.width), 
        height: convertToPercentage(textBoxLayoutInfo.height),
        zIndex: 1e1,
      }}>
      {textBox?.content}
    </div>
  )
})