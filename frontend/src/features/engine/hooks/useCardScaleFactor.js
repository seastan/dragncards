import { useSelector } from "react-redux";
import { useLayout } from "./useLayout";

export const useCardScaleFactor = () => {
  const layout = useLayout();
  const cardSize = layout?.cardSize;
  const zoomFactor = useSelector(state => state?.playerUi?.userSettings?.zoomPercent)/100;
  const touchMode = useSelector(state => state?.playerUi?.userSettings?.touchMode);
  const touchModeFactor = touchMode ? 0.88 : 1;
  return cardSize*zoomFactor*touchModeFactor;
}