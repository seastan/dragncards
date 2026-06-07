import React from "react";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { TopBarSharedCounter } from "./TopBarSharedCounter";

export const TopBarShared = React.memo(() => {
  const gameDef = useGameDefinition();

  return (
    <div
      className="h-full bg-gray-600 w-full flex"
      style={{ fontSize: "1.7dvh", borderLeft: "1px solid lightgrey" }}
    >
      {gameDef?.topBarCounters?.shared.map((menuItem: any, index: number) => (
        <div key={index} className="h-full flex-1 min-w-0">
          <TopBarSharedCounter gameProperty={menuItem.gameProperty} imageUrl={menuItem.imageUrl} label={menuItem.label} />
        </div>
      ))}
    </div>
  );
});
