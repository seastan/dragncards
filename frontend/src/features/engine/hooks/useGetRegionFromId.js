import store from "../../../store";
import { useFormatGroupId } from "./useFormatGroupId";
import { usePlayerN } from "./usePlayerN"

export const useGetRegionFromId = () => {
  const playerN = usePlayerN();
  const formatGroupId = useFormatGroupId();
  return (regionId) => {
    const region = store.getState()?.gameUi?.game?.playerData?.[playerN]?.layout?.regions?.[regionId];
    if (!region) return null;
    const formattedGroupId = formatGroupId(region.groupId);
    return {...region, id: regionId, groupId: formattedGroupId};
  }
}