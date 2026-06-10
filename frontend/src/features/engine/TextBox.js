import React from "react";
import { convertToPercentage, Z_INDEX } from "./functions/common";
import { useGameL10n } from "./hooks/useGameL10n";

export const TextBox = React.memo(({
  textBoxLayoutInfo
}) => {
  const gameL10n = useGameL10n();
  const hover = textBoxLayoutInfo.hover;
  const customStyle = textBoxLayoutInfo.style || {};
  return (
    <div
      className="absolute flex border border-gray-500 justify-center items-center text-gray-400 bg-gray-700 text-nowrap overflow-hidden"
      style={{
        left: convertToPercentage(textBoxLayoutInfo.left),
        top: convertToPercentage(textBoxLayoutInfo.top),
        width: convertToPercentage(textBoxLayoutInfo.width),
        height: convertToPercentage(textBoxLayoutInfo.height),
        zIndex: hover ? Z_INDEX.Modal : Z_INDEX.TextBox,
        ...(hover ? { position: 'fixed' } : {}),
        ...customStyle,
      }}>
      {gameL10n(textBoxLayoutInfo.label)}
    </div>
  )
})