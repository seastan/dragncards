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
  const createdAt = useSelector(state => state?.gameUi?.createdAt);
  const pluginName = useSelector(state => state?.gameUi?.game?.pluginName);
  const playerInfo = useSelector(state => state?.gameUi?.playerInfo);

  // Function to generate HTML string
  const generateHTMLString = () => {
    const body = deltas.map((delta) => {
      const deltaMessages = delta._delta_metadata?.log_messages;
      if (!deltaMessages) return '';
      const rows = deltaMessages.map(message => {
        const elements = messageTextToHtml(message);
        const html = ReactDOMServer.renderToString(<>{elements}</>);
        return `<div>${html}</div>`;
      }).join('');
      return `<div>${rows}</div>`;
    }).join('');

    const dateStr = createdAt ? new Date(createdAt).toLocaleString() : 'Unknown';
    const players = playerInfo
      ? Object.entries(playerInfo)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([playerI, info]) => `<li>${playerI}: ${info?.alias || 'Unknown'}</li>`)
          .join('')
      : '<li>Unknown</li>';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { background: #111; color: #ccc; font-family: monospace; font-size: 14px; margin: 0; padding: 2em 0; }
  #wrapper { max-width: 860px; margin: 0 auto; }
  #header { background: #1e1e1e; border-radius: 8px 8px 0 0; padding: 1.5em 2em; border-bottom: 2px solid #333; }
  #header h1 { margin: 0 0 0.5em 0; font-size: 1.2em; color: #fff; }
  #header .meta { color: #888; line-height: 1.8; }
  #header .meta ul { margin: 0.2em 0 0 1em; padding: 0; }
  #log { background: #1e1e1e; border-radius: 0 0 8px 8px; padding: 1.5em 2em; box-shadow: 0 4px 32px rgba(0,0,0,0.6); }
  #log > div { padding: 2px 0; border-bottom: 1px solid #2a2a2a; }
  a { color: #7eb8f7; }
</style>
</head>
<body><div id="wrapper">
<div id="header">
  <h1>${pluginName || 'Game'} — Log</h1>
  <div class="meta">
    <div>Date: ${dateStr}</div>
    <div>Room: ${roomSlug || 'Unknown'}</div>
    <div>Players:<ul>${players}</ul></div>
  </div>
</div>
<div id="log">${body}</div>
</div>
<script>
  document.querySelectorAll('.card-hover').forEach(function(el) {
    var img = el.querySelector('.card-hover-img');
    if (!img) return;
    el.addEventListener('mousemove', function(e) {
      img.style.display = 'block';
      img.style.position = 'fixed';
      img.style.height = '42dvh';
      img.style.right = (window.innerWidth - e.clientX + 12) + 'px';
      img.style.left = 'auto';
      if (e.clientY < window.innerHeight / 2) {
        img.style.top = e.clientY + 'px';
        img.style.bottom = 'auto';
      } else {
        img.style.bottom = (window.innerHeight - e.clientY) + 'px';
        img.style.top = 'auto';
      }
    });
    el.addEventListener('mouseleave', function() {
      img.style.display = 'none';
    });
  });
</script>
</body>
</html>`;
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
  
