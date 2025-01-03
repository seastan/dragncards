import React, {useMemo} from "react";
import ReactModal from "react-modal";
import Button from "../../components/basic/Button";
import useProfile from "../../hooks/useProfile";
import axios from "axios";
import useAuth from "../../hooks/useAuth";
import { useDispatch, useSelector } from "react-redux";
import { setTooltipIds } from "../store/playerUiSlice";
import { useGameDefinition } from "./hooks/useGameDefinition";
import { Z_INDEX } from "./functions/common";

export const TooltipModal = React.memo(({
    tooltipId,
}) => {
    const dispatch = useDispatch();
    const tooltipIds = useSelector(state => state?.playerUi?.tooltipIds);

    const myUser = useProfile();
    const { authToken, renewToken, setAuthAndRenewToken } = useAuth();
    const authOptions = useMemo(
      () => ({
        headers: {
          Authorization: authToken,
        },
      }),
      [authToken]
    );
    const handleHideClick = async () => {
      const hiddenTooltips = myUser.hidden_tooltips ? [...myUser.hidden_tooltips, tooltipId] : [tooltipId];
      const newUser = {...myUser, hidden_tooltips: hiddenTooltips}
      const updateData = {user: newUser};
      await axios.post("/be/api/v1/profile/update", updateData, authOptions);
      const newProfileData = {user_profile: newUser}
      myUser.setData(newProfileData);
      removeTooltip();
    }


    const handleCloseClick = () => {
      removeTooltip();
    }

    const removeTooltip = () => {
      var newTooltipIds = [...tooltipIds];
      var index = newTooltipIds.indexOf(tooltipId);
      if (index !== -1) {
        newTooltipIds.splice(index, 1);
      }
      dispatch(setTooltipIds(newTooltipIds))
    }

    if (myUser.hidden_tooltips && myUser.hidden_tooltips.includes(tooltipId)) {
      removeTooltip();
      return null;
    }

    return(
      <ReactModal
        closeTimeoutMS={200}
        isOpen={true}
        contentLabel="Spawn a card"
        overlayClassName="fixed inset-0 bg-black-50"
        className="insert-auto overflow-auto p-5 bg-gray-800 max-w-xs mx-auto my-24 rounded-lg outline-none max-h-3/4"
        style={{
          overlay: {
            zIndex: Z_INDEX.Modal
          }
        }}>
        <div className="text-white mb-2">{useGameDefinition.tooltips[tooltipId]}</div>    
        <span>
          <Button onClick={handleHideClick} className="inline mt-2">
            Never show again
          </Button>
          <Button onClick={handleCloseClick} className="inline mt-2" isPrimary>
            Close
          </Button>
        </span>
      </ReactModal>
    )
})