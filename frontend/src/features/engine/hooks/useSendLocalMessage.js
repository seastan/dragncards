import { useDispatch } from 'react-redux';
import { setAlert } from '../../store/playerUiSlice';


export const useSendLocalMessage = () => {
    const dispatch = useDispatch();
    return (message, level="info", autoClose="true") => {
        if (level === "crash") {
            autoClose = false;
        }
        dispatch(setAlert({
            "timestamp": Date.now(),
            "text": message,
            "level": level,
            "autoClose": autoClose
        }))
    }
}
