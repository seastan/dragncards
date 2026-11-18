import store from "../../../store";
import { useBrowseRegion } from "../Browse";
import { useFormatGroupId } from "./useFormatGroupId";
import { useGameDefinition } from "./useGameDefinition";
import { selectLayout } from "../functions/mobileLayout";

export const useGetRegionFromId = () => {
  const formatGroupId = useFormatGroupId();
  const browseRegion = useBrowseRegion();
  const gameDef = useGameDefinition();
  return (regionId) => {
    if (regionId === "browse") return browseRegion;
    // Same layout the table is rendering (the mobile layout in mobile UI).
    const region = selectLayout(store.getState(), gameDef)?.regions?.[regionId];
    if (!region) return null;
    var formattedGroupId = formatGroupId(region.groupId);
    return {...region, id: regionId, groupId: formattedGroupId};
  }
}
