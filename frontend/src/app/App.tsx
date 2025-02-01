import React, { useState, useCallback, useMemo, useEffect } from "react";
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
  const [tokens, setTokens] = useState({
    authToken: null,
    renewToken: null,
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

  useEffect(() => {
    const at_raw = localStorage.getItem("authToken");
    const rt_raw = localStorage.getItem("renewToken");
    if (typeof at_raw == "string" && typeof rt_raw == "string") {
      const at = JSON.parse(at_raw);
      const rt = JSON.parse(rt_raw);
      if (at && rt) {
        setTokens({
          authToken: at,
          renewToken: rt,
        });
      }
    }
  }, []);

  const socketParams = useMemo(
    () => ({
      authToken: tokens.authToken,
    }),
    [tokens.authToken]
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
