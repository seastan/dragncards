import { useSelector } from 'react-redux';

export const useGroupProp = (groupId, propName) => {
    return useSelector(state => state?.gameUi?.game?.groupById?.[groupId]?.[propName]);
}