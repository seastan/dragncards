import React from "react";
import { LogMessageDiv } from "../../messages/LogMessageDiv";
import ReactDOMServer from 'react-dom/server';
import { useAllLogMessageDivs } from "./useAllLogMessageDivs";
import { useSelector } from "react-redux";
import { useMessageTextToHtml } from "../../messages/MessageLine";

export const useAllLogMessageDownload = () => {
  const messageTextToHtml = useMessageTextToHtml();
  const deltas = useSelector(state => state?.gameUi?.deltas);
  const roomSlug = useSelector(state => state?.gameUi?.game?.roomSlug);

  // Function to generate HTML string
  const generateHTMLString = () => {
    return `<div>
      ${deltas.map((delta, i) => {
        const deltaMessages = delta._delta_metadata?.log_messages;
        if (!deltaMessages) return '';
        // Convert each message to HTML
        var allMtth = ""
        deltaMessages.forEach(message => {
          const mtth = messageTextToHtml(message);
          const mtthString = ReactDOMServer.renderToString(mtth);
          allMtth += `<div>${mtthString}</div>`
        });
        // Convert to string
        console.log("allMtth", allMtth);
        // This assumes MessageLine returns a string of HTML
        // You may need to adjust based on how MessageLine is implemented
        return `<div>${allMtth}</div>`; // Replace with actual HTML generation
      }).join('')}
    </div>`;
  };
    
  // Function to trigger download
  const downloadHTML = () => {
    const htmlString = generateHTMLString();
    const blob = new Blob([htmlString], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = roomSlug + "_log.html";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return downloadHTML;
}  
  
