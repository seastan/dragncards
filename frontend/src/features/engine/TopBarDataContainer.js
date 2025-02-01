import React from "react";
import { TopBarUser } from "./TopBarUser";
import { TopBarShared } from "./TopBarShared";
import { usePlayerIList } from "./hooks/usePlayerIList";

export const TopBarDataContainer = React.memo(({}) => {

  const playerIList = usePlayerIList();
    console.log("Rendering TopBarDataContainer", playerIList)
    
    return(
      <div className="h-full">
        <div className="float-left h-full" style={{width: "16%"}}>
          <TopBarShared/>
        </div>
        <div className="h-full overflow-auto" style={{width: "64%"}}>
          <div className="flex h-full" style={{minWidth: "100%"}}>
            {playerIList.map((playerI, playerIndex) => (
              <div className="h-full" style={{width: "25%", minWidth: "25%"}} key={playerIndex}>
                <TopBarUser key={playerIndex} playerI={playerI}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
})