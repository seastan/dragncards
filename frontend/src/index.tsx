import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import store from "./store";

import "./index.css";

//import App from "./app/App";
import * as serviceWorker from "./serviceWorker";

// From https://redux-toolkit.js.org/tutorials/advanced-tutorial
const render = () => {
  const App = require("./app/App").default;
  const Volkhov = require('typeface-roboto');

  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById("root")
  );
};

render();

if (process.env.NODE_ENV === "development" && module.hot) {
  module.hot.accept("./app/App", render);
}

// if (process.env.NODE_ENV !== "development")
//     console.log = () => {};

// Old
//ReactDOM.render(<App />, document.getElementById("root"));

// Concurrent Mode
// @ts-ignore
//ReactDOM.createRoot(document.getElementById("root")).render(<App />);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
