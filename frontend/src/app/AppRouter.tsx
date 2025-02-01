import React from "react";
import { Switch, Route } from "react-router-dom";
import AppNav from "./AppNav";
import PrivateRoute from "./PrivateRoute";
import AuthTest from "../components/AuthTest";
import RoomShow from "../pages/RoomShow";
import LobbyIndex from "../pages/LobbyIndex";
import Lobby from "../features/lobby/Lobby";
import Home from "../pages/Home";
import Login from "../features/auth/Login";
import Signup from "../features/auth/Signup";
import Profile from "../features/profile/Profile";
import RequestResetPassword from "../features/auth/RequestResetPassword";
import DoResetPassword from "../features/auth/DoResetPassword";
import ConfirmEmail from "../features/auth/ConfirmEmail";
import { MyPlugins } from "../features/myplugins/MyPlugins";
import PluginLobby from "../features/lobby/PluginLobby";

const PrivatePage: React.FC = () => {
  return <div>this is a priv page</div>;
};

const AppRouter: React.FC = () => {
  return (
    <>
      <AppNav />
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/profile" component={Profile} />
        <Route path="/myplugins" component={MyPlugins} />
        <Route path="/auth/patreon" component={Profile} />
        <Route path="/newroom" component={Lobby} />
        <Route path="/plugin" component={PluginLobby} />
        <Route
          path="/reset-password/:reset_token"
          component={DoResetPassword}
        />
        <Route path="/reset-password" component={RequestResetPassword} />
        <Route path="/confirm-email/:confirm_token" component={ConfirmEmail} />
        <Route path="/authtest" component={AuthTest} />
        <PrivateRoute path="/private" component={PrivatePage} />
        <Route path="/room/:slug" component={RoomShow} />
        <Route path="/lobby" component={LobbyIndex} />
        <Route path="/" component={Home} />
      </Switch>
    </>
  );
};
export default AppRouter;
