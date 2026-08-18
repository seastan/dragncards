import React, { useState, useCallback, useMemo, useRef } from "react";
import axios from "axios";

import SocketProvider from "../components/SocketProvider";
import ProfileProvider from "../components/ProfileProvider";
import AppRouter from "./AppRouter";
import AuthContext from "../contexts/AuthContext";

import "../css/tailwind.compiled.css";
import useBodyClass from "../hooks/useBodyClass";
import useHtmlClass from "../hooks/useHtmlClass";

import { BrowserRouter as Router } from "react-router-dom";

const App: React.FC = () => {
  const [tokens, setTokens] = useState(() => {
    // Read synchronously so the socket is created with auth on the first render,
    // avoiding an unauthenticated channel join that triggers "Room no longer accessible".
    const at_raw = localStorage.getItem("authToken");
    const rt_raw = localStorage.getItem("renewToken");
    if (typeof at_raw === "string" && typeof rt_raw === "string") {
      try {
        const at = JSON.parse(at_raw);
        const rt = JSON.parse(rt_raw);
        if (at && rt) return { authToken: at, renewToken: rt };
      } catch (_) {}
    }
    return { authToken: null, renewToken: null };
  });

  const setAuthAndRenewToken = useCallback(
    (authTokenData: any, renewTokenData: any) => {
      localStorage.setItem("authToken", JSON.stringify(authTokenData));
      localStorage.setItem("renewToken", JSON.stringify(renewTokenData));
      setTokens({
        authToken: authTokenData,
        renewToken: renewTokenData,
      });
    },
    []
  );

  const logOut = useCallback(async () => {
    const res = await axios.delete("/be/api/v1/session", {
      headers: {
        Authorization: tokens.authToken,
      },
    });
    if (res.status !== 200) {
      console.warn("unable to log out..");
    }
    setTokens({ authToken: null, renewToken: null });
    localStorage.removeItem("authToken");
    localStorage.removeItem("renewToken");
  }, [tokens.authToken]);

  useHtmlClass(["antialiased"]);
  useBodyClass(["h-screen", "bg-gray-900", "flex", "flex-col", "w-screen", "overflow-hidden"]);

  const authValue = useMemo(
    () => ({
      setAuthAndRenewToken,
      authToken: tokens.authToken,
      renewToken: tokens.renewToken,
      logOut,
    }),
    [logOut, setAuthAndRenewToken, tokens.authToken, tokens.renewToken]
  );

  // phoenix.js resolves socket params on every (re)connect, but only if they
  // are given as a function - a plain object is frozen into a closure at
  // construction. Reading from a ref means a reconnect always presents the
  // token we hold *now*, instead of replaying the one the socket was built
  // with. That matters because the backend evaluates auth once, in connect/3:
  // a socket that reconnects with an expired token gets latched as auth_failed
  // and every channel join it makes is rejected until the page is reloaded.
  // Assigned during render on purpose, not in an effect: React flushes child
  // effects before parent ones, so SocketProvider would otherwise connect while
  // this ref still held the previous token.
  const authTokenRef = useRef(tokens.authToken);
  authTokenRef.current = tokens.authToken;

  // Deliberately keyed on logged-in/out rather than on the token itself, so a
  // routine token renewal no longer tears down the socket (and every channel
  // on it) mid-game, while logging in or out still rebuilds it from scratch.
  const isAuthenticated = tokens.authToken != null;
  const socketParams = useMemo(
    () => () => ({
      authToken: authTokenRef.current,
    }),
    // isAuthenticated is the intended key: it rebuilds the socket on
    // login/logout only, never on a routine token renewal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAuthenticated]
  );

  return (
    //<React.StrictMode>
      <AuthContext.Provider value={authValue}>
        <SocketProvider
          wsUrl={process.env.REACT_APP_WS_URL || "/be/socket"}
          options={socketParams}>
          <ProfileProvider>
            <Router>
              <AppRouter />
            </Router>
          </ProfileProvider>
        </SocketProvider>
      </AuthContext.Provider>
    //</React.StrictMode>
  );
};

export default App;
