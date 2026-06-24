import React from "react";
import { TopBarUser } from "./TopBarUser";
import { TopBarShared } from "./TopBarShared";
import { usePlayerIList } from "./hooks/usePlayerIList";

export const TopBarDataContainer = React.memo(() => {
  const playerIList = usePlayerIList();

  return (
    <div className="h-full flex">
      <div className="h-full flex-shrink-0" style={{ width: "16%" }}>
        <TopBarShared />
      </div>
      <div className="h-full overflow-auto flex-1 min-w-0">
        <div className="flex h-full" style={{ minWidth: "100%" }}>
          {playerIList.map((playerI: string, playerIndex: number) => (
            <div className="h-full flex-shrink-0" style={{ width: "25%", minWidth: "25%" }} key={playerIndex}>
              <TopBarUser playerI={playerI} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
