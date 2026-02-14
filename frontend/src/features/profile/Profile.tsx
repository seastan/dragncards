import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import MUIDataTable, { MUIDataTableOptions } from "mui-datatables";
import ProfileSettings from "./ProfileSettings";
import useProfile from "../../hooks/useProfile";
import useDataApi from "../../hooks/useDataApi";
import Button from "../../components/basic/Button";
import { parseISO, format, formatDistanceToNow } from "date-fns";
import axios from "axios";
import RecaptchaForm from "./RecaptchaForm";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import useAuth from "../../hooks/useAuth";
import { SupporterBadge } from "../user/UserName";

const columns = [
  {name: "uuid", label: "UUID", options: { filter: false, display: false }},
  {name: "metadata", label: "Metadata", options: { filter: false, sort: true }},
  {name: "updated_at", label: "Date", options: { filter: false, sort: true }},
  {name: "options", label: "Options", options: { filter: false, sort: true }},
];

const sectionStyle = {
  backgroundColor: "rgba(75, 85, 99, 0.3)",
  border: "1px solid rgba(75, 85, 99, 0.5)",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "16px",
};

const headingStyle = {
  margin: "0 0 12px 0",
  fontSize: "1.1rem",
  fontWeight: 600,
  color: "white",
};

const labelStyle = {
  color: "#9ca3af",
  fontSize: "0.85rem",
};

const valueStyle = {
  color: "#e5e7eb",
  fontSize: "0.85rem",
};

interface Props {}

export const Profile: React.FC<Props> = () => {
  const user = useProfile();
  const authOptions = useAuthOptions();
  const siteL10n = useSiteL10n();
  const history = useHistory();
  const { logOut } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [shareReplayUrl, setShareReplayUrl] = useState("");
  const [deletedIndices, setDeletedIndices] = useState<Array<number>>([]);
  const { data, isLoading, isError, doFetchUrl, doFetchHash, setData } = useDataApi<any>(
    user?.id ? "/be/api/replays/"+user.id : "",
    null
  );

  useEffect(() => {
    if (user?.id == null) return;
    if (user?.id == undefined) return;
    doFetchUrl("/be/api/replays/"+user?.id);
  }, [user]);

  if (user == null) {
    return null;
  }

  const insertedDate = parseISO(user.inserted_at);
  const insertedAbsolute = format(insertedDate, "yyyy-MM-dd hh:mm bb");
  const insertedRelative = formatDistanceToNow(insertedDate, {
    addSuffix: true,
  });

  const openReplay = (pluginId: number, uuid: any) => {
    history.push("/plugin/"+pluginId+"/load/"+uuid);
  }
  const shareReplay = (pluginId: number, uuid: any) => {
    setShareReplayUrl("/plugin/"+pluginId+"/load/"+uuid);
    setShowModal(true);
  }
  const deleteReplay = async(replay: any, index: number, numPlayers: number) => {
    if (window.confirm("Are you sure you want to delete this saved game?")) {
      const data = {
        user: user,
        replay: replay,
      }
      const res = await axios.post("/be/api/replays/delete",data);
      setDeletedIndices([...deletedIndices, index]);
    }
  }
  const issueDowntimeNotice = async() => {
    let defMessage = siteL10n("defaultMaintenanceMessage");
    let text = window.prompt(`Enter the message to send to all users. Leave blank to send default message (${defMessage})`);
    if (text == null) return;
    if (text == "") text = defMessage;
    const res = await axios.post("/be/api/rooms/send_alert", {level: "crash", text: text, autoClose: false}, authOptions);
  }

  const options: MUIDataTableOptions = {
    filterType: "checkbox",
    selectableRows: "none",
  };

  var filteredData;
  if (data) {
    var replayData = data.data;
    var nonDeletedData: Array<any> = [];
    var numReplays = replayData ? replayData.length : 0;
    for (var i=0; i<numReplays; i++) {
      const replay = replayData[i];
      if (replay.deleted_by && replay.deleted_by.includes(user.id)) continue;
      const numPlayers = replay.num_players;
      const uuid = replay.uuid;
      const pluginId = replay.plugin_id;
      const replayId = replay.id;
      const index = i;
      const replayRow = {...replay,
        options: <div>
          <Button onClick={() => openReplay(pluginId, uuid)} isPrimary className="mx-2 mt-2 enforce-bg-blue">Load</Button>
          <Button onClick={() => deleteReplay(replay, index, numPlayers)} className="mx-2 mt-2 enforce-bg-red text-white">Delete</Button>
        </div>,
        metadata: <div>
          {Object.keys(replay?.metadata ? replay.metadata : {}).map((key, index) => {
            if (replay?.metadata?.[key] != null)
              return(
                <div key={index}><b>{key}:</b> {replay?.metadata?.[key]}</div>
              )
          })}
        </div>
      }
      if (!deletedIndices.includes(i)) nonDeletedData.push(replayRow);
    }
    if (user.supporter_level < 3)
      filteredData = nonDeletedData.slice(0,3);
    else
      filteredData = nonDeletedData;
  }

  return (
    <div className="text-white mx-auto w-full p-4 overflow-y-auto" style={{maxWidth: "700px"}}>

      {/* Account Info */}
      <div style={sectionStyle}>
        <h1 style={headingStyle}><SupporterBadge level={user.supporter_level} />{user.alias}</h1>
        <div style={{display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px"}}>
          <span style={labelStyle}>Account created</span>
          <span style={valueStyle}>{insertedAbsolute} ({insertedRelative})</span>
          <span style={labelStyle}>Email</span>
          <span style={valueStyle}>{user.email}</span>
          <span style={labelStyle}>Email confirmed</span>
          <span style={valueStyle}>{user.email_confirmed_at != null ? "Yes" : "No"}</span>
        </div>
        {user.email_confirmed_at == null && <div className="mt-3"><RecaptchaForm/></div>}
        {user.admin &&
          <div className="mt-4" style={{borderTop: "1px solid rgba(107,114,128,0.4)", paddingTop: "12px"}}>
            <span style={{...labelStyle, fontWeight: 600}}>Admin</span>
            <div className="mt-2">
              <Button className="bg-gray-600 text-white" onClick={() => issueDowntimeNotice()}>
                Issue downtime notice
              </Button>
            </div>
          </div>
        }
      </div>

      {/* Settings */}
      <ProfileSettings/>

      {/* Saved Games */}
      {filteredData ?
        <div style={{...sectionStyle, padding: "0", overflow: "hidden"}}>
          <div className="enforce-bg-none">
            <MUIDataTable
              title={
                <div>
                  <h1 style={headingStyle}>Saved Games</h1>
                  <p style={{color: "#9ca3af", fontSize: "0.85rem", margin: "0 0 12px 0"}}>
                    Currently displaying {user.supporter_level < 3 ? "your 3 most recent games." : "all your saved games."}
                  </p>
                  {user.supporter_level < 3 &&
                    <Button isSubmit isPrimary className="mb-3 enforce-bg-blue">
                      <a className="text-white no-underline flex items-center justify-center gap-2" href="https://www.patreon.com/dragncards" target="_blank" rel="noreferrer">
                        <img style={{height: "16px", width: "16px"}} src="https://upload.wikimedia.org/wikipedia/commons/9/94/Patreon_logo.svg" alt="Patreon"/>
                        Unlock all saved games
                      </a>
                    </Button>
                  }
                </div>
              }
              data={filteredData}
              columns={columns}
              options={options}
            />
          </div>
        </div>
        :
        <div style={sectionStyle}>
          <p style={{color: "#9ca3af", fontSize: "0.85rem", margin: 0}}>Loading saved games...</p>
        </div>
      }


      {/* Delete Account */}
      <div style={{...sectionStyle, borderColor: "rgba(220, 38, 38, 0.3)"}}>
        <h1 style={{...headingStyle, color: "#fca5a5"}}>Delete Account</h1>
        <p style={{color: "#9ca3af", fontSize: "0.85rem", margin: "0 0 12px 0"}}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button
          isCancel
          onClick={async () => {
            const confirmText = window.prompt(
              'This will permanently delete your account, saved games, decks, and custom content. Type "DELETE" to confirm.'
            );
            if (confirmText !== "DELETE") return;
            try {
              await axios.delete("/be/api/v1/profile", authOptions);
              logOut();
              history.push("/");
            } catch (e) {
              alert("Failed to delete account. Please try again.");
            }
          }}
        >
          Delete My Account
        </Button>
      </div>
    </div>
  );
};
export default Profile;
