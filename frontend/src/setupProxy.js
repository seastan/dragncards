const { createProxyMiddleware } = require("http-proxy-middleware");

const hostname = process.env.REACT_APP_BE_HOSTNAME || "localhost";

module.exports = function (app) {
  app.use(
    "/be",
    createProxyMiddleware({
      target: "http://" + hostname + ":4000",
      changeOrigin: true,
      pathRewrite: { "^/be": "" },
    })
  );
};
