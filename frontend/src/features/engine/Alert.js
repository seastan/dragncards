import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { setAlert, setShowModal } from "../store/playerUiSlice";
import { useFormatLabelsInText } from "../messages/MessageLine";
import DOMPurify from "dompurify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { Z_INDEX } from "./functions/common";

const promptStyle = {
  MozBoxShadow: '0 0 50px 20px black',
  WebkitBoxShadow: '0 0 50px 20px black',
  boxShadow: '0 0 50px 20px black',
}

export const Alert = React.memo(({
}) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const formatLabelsInText = useFormatLabelsInText();
  const alert = useSelector(state => state?.playerUi?.alert);
  var alertText = alert?.text;
  alertText = formatLabelsInText(alertText).replace(/\n/g, '<br />');
  alertText = DOMPurify.sanitize(alertText);
  const alertLevel = alert?.level;
  const alertAction = alert?.action;
  const autoClose = alert?.autoClose === false ? false : true;

  const [progress, setProgress] = useState(0);

  // use effect to clear alert after 8 seconds and update progress bar
  useEffect(() => {
    console.log("alert 1", alert)

    if (alert && autoClose) {
      const numWords = alertText.split(' ').length;
      const timeToRead = Math.max(1000, numWords * 300);

      const startTime = Date.now();
      setProgress(0);

      const timer = setTimeout(() => {
        dispatch(setAlert(null));
      }, timeToRead + 100);

      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        console.log('progress interval', elapsed, progress);
        setProgress((elapsed / timeToRead) * 100);
      }, 100);

      return () => {
        setProgress(0);
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }
  }, [alert]);

  if (alert === null || alert.text == null) return null;

  var alertColor = "bg-red-700";
  if (alertLevel === "crash") alertColor = "bg-red-700";
  if (alertLevel === "error") alertColor = "bg-red-700";
  if (alertLevel === "info") alertColor = "bg-blue-700";
  if (alertLevel === "success") alertColor = "bg-green-700";
  if (alertLevel === "warning") alertColor = "bg-yellow-700";

  return (
    <div className="absolute text-white" 
      style={{
        left: "65%", 
        top: "2%", 
        width: "30%",
        zIndex: Z_INDEX.Alert,
        textAlign: "center",
        opacity: 0.9,
      }}>
      <div className={`p-1 ${alertColor} rounded`} style={promptStyle}>
        <div 
          className=""
          style={{
            maxHeight: "60dvh",
            textAlign: alertLevel === "crash" ? "left" : "center",
            overflowY: "scroll"
          }}
        >
          <div dangerouslySetInnerHTML={{__html: alertText}} />
          {(alertAction === "room_timeout" || alertAction === "room_closed") && (
            <div className="mt-2 flex flex-col items-center gap-2 text-black">
              {alertAction === "room_timeout" && alert?.pluginId && alert?.replayUuid && (
                <button
                  className="px-3 py-1 bg-white text-yellow-800 rounded cursor-pointer font-semibold text-sm hover:bg-gray-200"
                  onClick={() => history.push(`/plugin/${alert.pluginId}/load/${alert.replayUuid}`)}
                >
                  Create a new room with this save
                </button>
              )}
              <button
                className="px-3 py-1 bg-white text-yellow-800 rounded cursor-pointer font-semibold text-sm hover:bg-gray-200"
                onClick={() => dispatch(setShowModal("patreon"))}
              >
                Increase room timeout
              </button>
            </div>
          )}
        </div>
        <div style={{ position: 'relative', height: '2px', marginTop: '2px' }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'white',
            position: 'absolute',
            top: 0,
            left: 0,
            transition: 'width 0.1s linear',
          }}/>
        </div>

        <div 
          className={`${alertColor} absolute text-white p-1 flex justify-center items-center cursor-pointer`}
          style={{
            left: "100%",
            top: "0%",
            width: "3dvh",
            height: "3dvh",
            transform: "translate(-50%, -50%)",
            borderRadius: "1.5dvh",
          }}
          onClick={() => dispatch(setAlert(null))}
          >
            <FontAwesomeIcon style={{fontSize: "1.7dvh"}} icon={faTimes} />
        </div>
      </div>  
    </div>
  )
});
