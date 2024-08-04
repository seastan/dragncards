import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import MUIDataTable, { MUIDataTableOptions } from "mui-datatables";
import Container from "../../components/basic/Container";
import ProfileSettings from "./ProfileSettings";
import useProfile from "../../hooks/useProfile";
import useDataApi from "../../hooks/useDataApi";
import Button from "../../components/basic/Button";
import ShareGameModal from "./ShareGameModal";
import { parseISO, format, formatDistanceToNow } from "date-fns";
import axios from "axios";
import RecaptchaForm from "./RecaptchaForm";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { useSiteL10n } from "../../hooks/useSiteL10n";

const columns = [
  {name: "uuid", label: "UUID", options: { filter: false, display: false }},
  {name: "metadata", label: "Metadata", options: { filter: false, sort: true }},
  {name: "updated_at", label: "Date", options: { filter: false, sort: true }},
  {name: "options", label: "Options", options: { filter: false, sort: true }},
 ]; //, sortDirection: "asc" as const

interface Props {}

export const Profile: React.FC<Props> = () => {
  const user = useProfile();
  const authOptions = useAuthOptions();
  const siteL10n = useSiteL10n();
  const history = useHistory();
  const [showModal, setShowModal] = useState(false);
  const [shareReplayUrl, setShareReplayUrl] = useState("");
  const [deletedIndices, setDeletedIndices] = useState<Array<number>>([]); 
  const { data, isLoading, isError, doFetchUrl, doFetchHash, setData } = useDataApi<any>(
    user?.id ? "/be/api/replays/"+user.id : "",
    null
  );
  console.log('Rendering Profile', data);
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
    let text = window.prompt("Enter the message to send to all users. Leave blank to send default message.");
    if (text == null) return;
    if (text == "") text = siteL10n("defaultMaintenenceMessage");

    const res = await axios.post("/be/api/rooms/send_alert", {level: "crash", text: text, autoClose: false}, authOptions);
  }

  const options: MUIDataTableOptions = {
    filterType: "checkbox",
    selectableRows: "none",
    //onRowClick: rowData => openReplay(rowData)
  };
  var filteredData;
  if (data) {
    var replayData = data.data;
    var nonDeletedData: Array<any> = [];
    var numReplays = replayData ? replayData.length : 0;
    for (var i=0; i<numReplays; i++) {
    //for (var replay of replayData) {
      const replay = replayData[i];
      if (replay.deleted_by && replay.deleted_by.includes(user.id)) continue;
      const numPlayers = replay.num_players;
      const uuid = replay.uuid;
      const pluginId = replay.plugin_id;
      const replayId = replay.id;
      const index = i;
      const replayRow = {...replay, 
        options: <div>
          <Button onClick={() => openReplay(pluginId, uuid)} isPrimary className="mx-2 mt-2">Load</Button>
          <Button onClick={() => shareReplay(pluginId, uuid)} isPrimary className="mx-2 mt-2">Share</Button>
          <Button onClick={() => deleteReplay(replay, index, numPlayers)} className="mx-2 mt-2">Delete</Button>
        </div>,
        metadata: <div>
          {Object.keys(replay?.metadata ? replay.metadata : {}).map((key, index) => {
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
    <div className="w-full h-full overflow-y-scroll">
      <Container>
        <div className="bg-gray-100 p-4 rounded max-w-xl shadow">
          <h1 className="font-semibold mb-4 text-black">{user.alias}</h1>
          <div>
            <span className="font-semibold">Account created</span>:{" "}
            {insertedAbsolute} ({insertedRelative})
          </div>
          <div>
            <span className="font-semibold">Email</span>: {user.email}
          </div>
          <div>
            <span className="font-semibold">Email confirmed</span>:{" "}
            {user.email_confirmed_at == null && "No."}
            {user.email_confirmed_at != null && "Yes."}
          </div>
          {user.email_confirmed_at == null && <RecaptchaForm/>}
          {true && 
            <>
              <div>
                <span className="font-semibold">Admin</span>
              </div>

              <Button onClick={() => issueDowntimeNotice()}>
                Issue downtime notice
              </Button>
            </>
          }
        </div>
      </Container>

      <ProfileSettings/>
      <Container>
        <div className="bg-gray-100 p-4 rounded max-w-xl shadow">
          <h1 className="font-semibold mb-2 text-black">Saved game settings</h1>
          Currently displaying {user.supporter_level < 3 ? "your 3 most recent games." : "all your saved games."} 
          {user.supporter_level < 3 &&             
            <Button isSubmit isPrimary className="mx-2 mt-2">
              <img className="inline-block mr-2" style={{height: "20px", width: "20px"}} src="https://upload.wikimedia.org/wikipedia/commons/9/94/Patreon_logo.svg"/>
              <a className="text-white no-underline" href="https://www.patreon.com/dragncards">Unlock all saved games</a>
            </Button>
          }
        </div>
      </Container>
      
      {filteredData ?
        <div className="p-4 bg-gray-900">
        <MUIDataTable
          title={"Saved games"}
          data={filteredData}
          columns={columns}
          options={options}
        />
        </div>
        :
        <Container>
          <div className="bg-gray-100 p-4 rounded max-w-xl shadow">
            <h1 className="font-semibold mb-4 text-black">Loading saved games...</h1>
          </div>
        </Container>
      }

      <ShareGameModal
        isOpen={showModal}
        closeModal={() => setShowModal(false)}
        shareReplayUrl={shareReplayUrl}
      />
    </div>
  );
};
export default Profile;
