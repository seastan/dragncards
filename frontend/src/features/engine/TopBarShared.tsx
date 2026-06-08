import React from "react";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { TopBarSharedCounter } from "./TopBarSharedCounter";

export const TopBarShared = React.memo(() => {
  const gameDef = useGameDefinition();
  const shared = gameDef?.topBarCounters?.shared ?? [];

  return (
    <div className="h-full w-full flex bg-gray-800 border-r border-gray-700" style={{ fontSize: "1.7dvh" }}>
      {shared.map((menuItem: any, index: number) => (
        <div
          key={index}
          className={`h-full flex-1 min-w-0 flex items-center ${index > 0 ? "border-l border-gray-700" : ""}`}
        >
          <TopBarSharedCounter gameProperty={menuItem.gameProperty} imageUrl={menuItem.imageUrl} label={menuItem.label} />
        </div>
      ))}
    </div>
  );
});
