import store from "../../../store";
import { useBrowseRegion } from "../Browse";
import { useFormatGroupId } from "./useFormatGroupId";
import { usePlayerN } from "./usePlayerN"

export const useGetRegionFromId = () => {
  const playerN = usePlayerN();
  const formatGroupId = useFormatGroupId();
  const browseRegion = useBrowseRegion();
  return (regionId) => {
    if (regionId === "browse") return browseRegion;
    const region = store.getState()?.gameUi?.game?.playerData?.[playerN]?.layout?.regions?.[regionId];
    if (!region) return null;
    var formattedGroupId = formatGroupId(region.groupId);
    return {...region, id: regionId, groupId: formattedGroupId};
  }
}