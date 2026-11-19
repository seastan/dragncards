const { createProxyMiddleware } = require("http-proxy-middleware");

const hostname = process.env.REACT_APP_BE_HOSTNAME || "localhost";

module.exports = function (app) {
  app.use(
    // The path filter goes to createProxyMiddleware, not app.use("/be", ...):
    // websocket upgrades bypass Express, so a mount path doesn't filter them,
    // and the proxy would also grab the dev server's own hot-reload socket
    // (/ws), garbling it and sending it to Phoenix.
    createProxyMiddleware("/be", {
      target: "http://" + hostname + ":4000",
      changeOrigin: true,
      // Forward the Phoenix socket (/be/socket/websocket) too. Without this the
      // websocket upgrade never reaches the backend and rooms hang on
      // "Connecting to room..." unless REACT_APP_WS_URL points straight at
      // port 4000 — which hard-codes a host, and breaks testing from a phone
      // on the LAN as soon as the laptop's address changes.
      ws: true,
      pathRewrite: { "^/be": "" },
    })
  );
};
