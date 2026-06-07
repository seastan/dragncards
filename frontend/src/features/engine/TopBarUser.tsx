import React, { ReactNode, useContext } from "react";
import { useSelector, useDispatch } from "react-redux";
import UserName from "../user/UserName";
import useProfile from "../../hooks/useProfile";
import useIsLoggedIn from "../../hooks/useIsLoggedIn";
import { useHistory } from "react-router-dom";
import { setObservingPlayerN } from "../store/playerUiSlice";
import BroadcastContext from "../../contexts/BroadcastContext";
import { TopBarUserCounter } from "./TopBarUserCounter";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { FirstPlayerToken } from "./FirstPlayerToken";
import { getPlayerIColor } from "./functions/common";

interface TopBarUserButtonProps {
  onClickHandler?: ((e?: React.MouseEvent) => void) | null;
  extraParentClass?: string;
  extraButtonClass?: string;
  children: ReactNode;
}

export const TopBarUserButton: React.FC<TopBarUserButtonProps> = ({
  onClickHandler,
  extraParentClass = "",
  extraButtonClass = "",
  children,
}) => {
  return (
    <div onClick={onClickHandler || undefined} className={`h-full p-0.5 ${extraParentClass}`}>
      <div className={`w-full h-full flex justify-center items-center rounded-lg hover:bg-gray-400 ${extraButtonClass}`}>
        {children}
      </div>
    </div>
  );
};

export const TopBarUser = React.memo(({ playerI }: { playerI: string }) => {
  const { gameBroadcast, chatBroadcast } = useContext(BroadcastContext) as any;
  const dispatch = useDispatch();
  const siteL10n = useSiteL10n();
  const gameDef = useGameDefinition();
  const history = useHistory();
  const observingPlayerN = useSelector((state: any) => state?.playerUi?.observingPlayerN);
  const playerInfo = useSelector((state: any) => state?.gameUi?.playerInfo);
  const playerDataPlayerN = useSelector((state: any) => state?.gameUi?.game?.playerData?.[playerI]);
  const firstPlayer = useSelector((state: any) => state?.gameUi?.game?.firstPlayer);
  const isLoggedIn = useIsLoggedIn();
  const myUser: any = useProfile();
  const myUserId = myUser?.id;
  const borderColor = getPlayerIColor(playerI);

  if (!playerInfo) return null;
  if (!playerDataPlayerN) return null;

  const sittingUserId = playerInfo[playerI]?.id;

  // If not observing anyone, observe yourself
  if (!observingPlayerN && myUserId === sittingUserId) dispatch(setObservingPlayerN(playerI));

  const handleSitClick = (action: string) => {
    if (action === "log_in") {
      history.push("/login");
      return;
    }
    // Get up from any seats first
    Object.keys(playerInfo).forEach((playeri) => {
      const sittingUserIdI = playerInfo[playeri]?.id;
      if (sittingUserIdI === myUserId) {
        gameBroadcast("set_seat", { player_i: playeri, new_user_id: null });
        chatBroadcast("game_update", { message: "got up from " + playeri + "'s seat." });
      }
    });
    // Sit in seat
    if (action === "sit") {
      gameBroadcast("set_seat", { player_i: playerI, new_user_id: myUserId, new_user_alias: myUser.alias });
      chatBroadcast("game_update", { message: "sat in " + playerI + "'s seat." });
      dispatch(setObservingPlayerN(playerI));
    }
  };

  const handleObserveClick = () => {
    dispatch(setObservingPlayerN(playerI));
    chatBroadcast("game_update", { message: "started observing " + playerI + "." });
  };

  const sitButton = () => {
    if (!isLoggedIn) {
      return (
        <TopBarUserButton onClickHandler={() => handleSitClick("log_in")} extraParentClass={"w-1/2"}>
          {siteL10n("logIn")}
        </TopBarUserButton>
      );
    } else if (sittingUserId) {
      if (sittingUserId === myUserId) {
        return (
          <TopBarUserButton
            onClickHandler={() => handleSitClick("get_up")}
            extraButtonClass={"bg-gray-500"}
            extraParentClass={"w-1/2"}
          >
            {siteL10n("getUp")}
          </TopBarUserButton>
        );
      } else {
        return (
          <TopBarUserButton onClickHandler={null} extraButtonClass={"text-black"} extraParentClass={"w-1/2"}>
            {siteL10n("taken")}
          </TopBarUserButton>
        );
      }
    } else {
      return (
        <TopBarUserButton onClickHandler={() => handleSitClick("sit")} extraParentClass={"w-1/2"}>
          {siteL10n("sit")}
        </TopBarUserButton>
      );
    }
  };

  return (
    <div className="w-full h-full pr-1 border-t flex" style={{ borderLeft: "1px solid lightgrey", borderTopColor: borderColor }}>
      <div className="h-full w-2/3 flex flex-col">
        <div className="h-1/2 w-full flex items-center justify-center min-w-0 overflow-hidden">
          {firstPlayer === playerI ? (
            <div className="flex-shrink-0">
              <FirstPlayerToken />
            </div>
          ) : null}
          <div
            className="truncate min-w-0"
            title={[
              playerDataPlayerN?.label,
              playerInfo[playerI]?.alias || (sittingUserId ? `#${sittingUserId}` : "Empty seat"),
            ]
              .filter(Boolean)
              .join(": ")}
          >
            {playerDataPlayerN?.label ? <span className="pr-1">{playerDataPlayerN.label}:</span> : null}
            <UserName userID={sittingUserId} defaultName="Empty seat" />
          </div>
        </div>

        <div className="h-1/2 w-full cursor-default flex">
          {sitButton()}
          <TopBarUserButton
            onClickHandler={() => handleObserveClick()}
            extraButtonClass={observingPlayerN === playerI ? "bg-gray-500" : "hover:bg-gray-500"}
            extraParentClass={"w-1/2"}
          >
            {siteL10n("look")}
          </TopBarUserButton>
        </div>
      </div>

      <div className="h-full w-1/3">
        {gameDef?.topBarCounters?.player?.map((menuItem: any, index: number) => (
          <div key={index} className="h-1/2 w-full">
            <TopBarUserCounter
              playerI={playerI}
              playerProperty={menuItem.playerProperty}
              imageUrl={menuItem.imageUrl}
              label={menuItem.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
