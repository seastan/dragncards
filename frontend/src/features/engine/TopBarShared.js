import React from "react";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { TopBarSharedCounter } from "./TopBarSharedCounter";

export const TopBarShared = React.memo(() => {
  const gameDef = useGameDefinition();

  return(
    <div className="h-full bg-gray-600 w-full" style={{fontSize: "1.7dvh", borderLeft: "1px solid lightgrey"}}>
      {gameDef?.topBarCounters?.shared.map((menuItem, index) => {
        return(
        <div key={index} className="float-left h-full" style={{width: `${100/gameDef?.topBarCounters?.shared?.length}%`}}>
          <TopBarSharedCounter 
            gameProperty={menuItem.gameProperty} 
            imageUrl={menuItem.imageUrl} 
            label={menuItem.label}/>
        </div>
        )
      })}
    </div>
  )
})