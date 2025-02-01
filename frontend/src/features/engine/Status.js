import React from "react";
import { useSelector } from "react-redux";
import { useFormatLabelsInText } from "../messages/MessageLine";
import DOMPurify from "dompurify";
import { Z_INDEX } from "./functions/common";

const promptStyle = {
  boxShadow: '0 0 50px 20px black',
}

export const Status = React.memo(({
}) => {
  const formatLabelsInText = useFormatLabelsInText();
  const status = useSelector(state => state?.playerUi?.status);
  var statusText = status?.text;
  //var statusText = useSelector(state => state?.playerUi?.dragging?.dragStep);
  statusText = formatLabelsInText(statusText).replace(/\n/g, '<br />');
  statusText = DOMPurify.sanitize(statusText);
  console.log("Rendering Status", {statusText});
  if (statusText == null || statusText === "") return null;

  return (
    <div className="absolute text-white" 
      style={{
        left: "35%", 
        top: "2%", 
        width: "30%",
        zIndex: Z_INDEX.Status,
        textAlign: "center",
        opacity: 0.9,
      }}>
      <div className={`p-1 bg-blue-700 rounded`} style={promptStyle}>
        <div 
          className=""
          style={{
            maxHeight: "60dvh",
            textAlign: "center",
            overflowY: "scroll"
          }}
        >
          <div dangerouslySetInnerHTML={{__html: statusText}} />
        </div>
      </div>  
    </div>
  )
});
