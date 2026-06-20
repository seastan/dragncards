import React from "react";
import { convertToPercentage, Z_INDEX } from "./functions/common";
import { useDoActionList } from "./hooks/useDoActionList";
import { useGameL10n } from "./hooks/useGameL10n";
import { usePlayerN } from "./hooks/usePlayerN";
import { useSiteL10n } from "../../hooks/useSiteL10n";


export const TableButton = React.memo(({
  tableButton
}) => {
  const playerN = usePlayerN();
  const doActionList = useDoActionList();
  const gameL10n = useGameL10n();
  const siteL10n = useSiteL10n();
  const handleButtonClick = () => {
    if (!playerN) {
      alert(siteL10n("pleaseSit"));
      return;
    }
    doActionList(tableButton?.actionList, `Table button action ${tableButton.label}`);
  }
  return (
    <div
      role="button"
      className="absolute flex cursor-pointer rounded-md border border-gray-600 justify-center items-center text-gray-200 bg-gray-700 hover:bg-gray-600 transition-colors font-semibold select-none shadow"
      style={{
        left: convertToPercentage(tableButton.left),
        top: convertToPercentage(tableButton.top),
        width: convertToPercentage(tableButton.width),
        height: convertToPercentage(tableButton.height),
        zIndex: Z_INDEX.TableButton,
        ...tableButton.style
      }}
      onClick={() => handleButtonClick()}>
      {gameL10n(tableButton.label)}
    </div>
  )
})