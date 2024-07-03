import React, { useContext } from "react";
import { useSelector, useDispatch } from 'react-redux';
import UserName from "../user/UserName";
import useProfile from "../../hooks/useProfile";
import useIsLoggedIn from "../../hooks/useIsLoggedIn";
import { Link, useHistory } from "react-router-dom";
import { setDropdownMenu, setObservingPlayerN, setTyping } from "../store/playerUiSlice";
import BroadcastContext from "../../contexts/BroadcastContext";
import { TopBarUserCounter } from "./TopBarUserCounter";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { FirstPlayerToken } from "./FirstPlayerToken";
import { getPlayerIColor } from "./functions/common";


export const TopBarUserButton = ({ onClickHandler, extraParentClass, extraButtonClass, children }) => {
  return (
    <div 
      onClick={onClickHandler} 
      className={`h-full float-left p-0.5 ${extraParentClass}`}>
      <div className={`w-full h-full flex justify-center items-center rounded-lg hover:bg-gray-400 ${extraButtonClass}`}>
        {children}
      </div>
    </div>
  );
};


export const TopBarUser = React.memo(({
  playerI
}) => {
  const {gameBroadcast, chatBroadcast} = useContext(BroadcastContext);
  const dispatch = useDispatch();
  const siteL10n = useSiteL10n();
  const gameDef = useGameDefinition();
  const history = useHistory();
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const observingPlayerN = useSelector(state => state?.playerUi?.observingPlayerN);
  const playerInfo = useSelector(state => state?.gameUi?.playerInfo);
  const playerData = useSelector(state => state?.gameUi?.game?.playerData); 
  const playerDataPlayerN = useSelector(state => state?.gameUi?.game?.playerData?.[playerI]);  
  const firstPlayer = useSelector(state => state?.gameUi?.game?.firstPlayer);  
  const isLoggedIn = useIsLoggedIn();
  const myUser = useProfile();
  const myUserId = myUser?.id;
  const borderColor = getPlayerIColor(playerI);


  console.log("Rendering TopBarUser ", playerI, playerInfo, playerData, playerDataPlayerN);
  if (!playerInfo) return null;
  if (!playerDataPlayerN) return null;

  const sittingUserId = playerInfo[playerI]?.id;

  // If not observing anyone, observe yourself
  if (!observingPlayerN && (myUserId === sittingUserId)) dispatch(setObservingPlayerN(playerI));

  const handleSitClick = (action) => {
    if (action === "log_in") {
      history.push("/login");
      return;
    }
    // Get up from any seats first
    Object.keys(playerInfo).forEach((playeri) => {
      const sittingUserIdI = playerInfo[playeri]?.id;
      if (sittingUserIdI === myUserId) {
        gameBroadcast("set_seat", {"player_i": playeri, "new_user_id": null});
        chatBroadcast("game_update", {message: "got up from "+playeri+"'s seat."});
      }
    })
    // Sit in seat
    if (action === "sit") {
      gameBroadcast("set_seat", {"player_i": playerI, "new_user_id": myUserId, "new_user_alias": myUser.alias});
      chatBroadcast("game_update",{message: "sat in "+playerI+"'s seat."});
      dispatch(setObservingPlayerN(playerI));
    } 
  }

  const handleObserveClick = () => {
    dispatch(setObservingPlayerN(playerI));
    chatBroadcast("game_update",{message: "started observing "+playerI+"."});
  }

  const sitButton = () => {
    if (!isLoggedIn) {
      return(
        <TopBarUserButton 
          onClickHandler={() => handleSitClick("log_in")}
          extraParentClass={"w-1/2"}>
            {siteL10n("logIn")}
        </TopBarUserButton>)
    } else if (sittingUserId) {
      if (sittingUserId === myUserId) {
        return(
          <TopBarUserButton 
            onClickHandler={() => handleSitClick("get_up")} 
            extraButtonClass={"bg-gray-500"}
            extraParentClass={"w-1/2"}>
              {siteL10n("getUp")}
          </TopBarUserButton>)
      } else {
        return(
          <TopBarUserButton 
            onClickHandler={null} 
            extraButtonClass={"text-black"}
            extraParentClass={"w-1/2"}>
              {siteL10n("taken")}
          </TopBarUserButton>)
      }
    } else {
      return(
        <TopBarUserButton 
          onClickHandler={() => handleSitClick("sit")}
          extraParentClass={"w-1/2"}>
            {siteL10n("sit")}
        </TopBarUserButton>)
    }
  }
  
  return(
    <div className="float-left h-full pr-1 border-t" style={{width: "16%", borderLeft: "1px solid lightgrey", borderTopColor: borderColor}}>
      <div className="float-left h-full w-2/3">
        <div className="h-1/2 w-full flex justify-center">
          {/* Show First player token */}
          {(firstPlayer === playerI) ? <FirstPlayerToken/> : null}
          {playerDataPlayerN?.label ? <div className="pr-1">{playerDataPlayerN.label}:</div> : null}
          <UserName userID={sittingUserId} defaultName="Empty seat"/>
        </div>

        <div className="h-1/2 w-full cursor-default">
          {sitButton()}
          <TopBarUserButton
            onClickHandler={() => handleObserveClick()}
            extraButtonClass={(observingPlayerN===playerI) ? "bg-gray-500" : "hover:bg-gray-500"}
            extraParentClass={"w-1/2"}
          >{siteL10n("look")}</TopBarUserButton>
        </div>
      </div>

      <div className="float-left h-full w-1/3">
        {gameDef?.topBarCounters?.player?.map((menuItem, index) => {
          return(
            <div key={index} className="h-1/2 w-full">
              <TopBarUserCounter 
                playerI={playerI}
                playerProperty={menuItem.playerProperty} 
                imageUrl={menuItem.imageUrl} 
                label={menuItem.label}/>
            </div>
          )
        })}
      </div>
      
    </div>
  )
})