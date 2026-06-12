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
      <div
        className={`w-full h-full flex justify-center items-center rounded transition-colors ${extraButtonClass}`}
      >
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
  const isMe = sittingUserId && sittingUserId === myUserId;
  const isObserving = observingPlayerN === playerI;

  // If not observing anyone, observe yourself
  if (!observingPlayerN && isMe) dispatch(setObservingPlayerN(playerI));

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

  const neutralBtn = "bg-gray-700 hover:bg-gray-600 text-gray-200 cursor-pointer";
  const activeBtn = "bg-blue-800 hover:bg-blue-700 text-white cursor-pointer";

  const sitButton = () => {
    if (!isLoggedIn) {
      return (
        <TopBarUserButton onClickHandler={() => handleSitClick("log_in")} extraParentClass="w-1/2" extraButtonClass={neutralBtn}>
          {siteL10n("logIn")}
        </TopBarUserButton>
      );
    } else if (sittingUserId) {
      if (isMe) {
        return (
          <TopBarUserButton onClickHandler={() => handleSitClick("get_up")} extraParentClass="w-1/2" extraButtonClass={activeBtn}>
            {siteL10n("getUp")}
          </TopBarUserButton>
        );
      } else {
        return (
          <TopBarUserButton onClickHandler={null} extraParentClass="w-1/2" extraButtonClass="text-gray-500 cursor-default">
            {siteL10n("taken")}
          </TopBarUserButton>
        );
      }
    } else {
      return (
        <TopBarUserButton onClickHandler={() => handleSitClick("sit")} extraParentClass="w-1/2" extraButtonClass={neutralBtn}>
          {siteL10n("sit")}
        </TopBarUserButton>
      );
    }
  };

  return (
    <div className="h-full">
      <div
        className="h-full flex border border-gray-700 bg-gray-800 overflow-hidden"
        style={{ borderLeft: `3px solid ${borderColor}` }}
      >
        <div className="h-full flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-center gap-1 min-w-0 px-1.5" style={{ height: "50%" }}>

            {firstPlayer === playerI ? (
              <div className="flex-shrink-0">
                <FirstPlayerToken />
              </div>
            ) : null}
            <div
              className="truncate min-w-0 text-gray-100"
              title={[
                playerDataPlayerN?.label,
                playerInfo[playerI]?.alias || (sittingUserId ? `#${sittingUserId}` : "Empty seat"),
              ]
                .filter(Boolean)
                .join(": ")}
            >
              {playerDataPlayerN?.label ? <span className="pr-1 text-gray-400">{playerDataPlayerN.label}:</span> : null}
              <UserName userID={sittingUserId} defaultName="Empty seat" />
            </div>
          </div>

          <div className="flex gap-0.5 cursor-default px-0.5" style={{ height: "50%" }}>
            {sitButton()}
            <TopBarUserButton
              onClickHandler={() => handleObserveClick()}
              extraParentClass="w-1/2"
              extraButtonClass={isObserving ? activeBtn : neutralBtn}
            >
              {siteL10n("look")}
            </TopBarUserButton>
          </div>
        </div>

        <div className="h-full flex flex-col border-l border-gray-700" style={{ width: "30%" }}>
          {gameDef?.topBarCounters?.player?.map((menuItem: any, index: number) => (
            <div key={index} className="w-full flex-1 min-h-0">
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
    </div>
  );
});
