import React from "react";
import ReactModal from "react-modal";
import { useSiteL10n } from "../../../hooks/useSiteL10n";
import PrivateAccess from "./PrivateAccess";

ReactModal.setAppElement("#root");


export const SharePluginModal = ({ plugin, closeModal}) => {
  const siteL10n = useSiteL10n();
  return (
    <ReactModal
      closeTimeoutMS={200}
      isOpen={true}
      onRequestClose={closeModal}
      contentLabel="Share Plugin"
      overlayClassName="fixed inset-0 bg-black-50 z-50 overflow-y-scroll"
      className="insert-auto p-5 bg-gray-700 border mx-auto my-12 rounded-lg outline-none"
      style={{
        overlay: {
        },
        content: {
          width: '500px',
        }
      }}
    >
      
      <h1 className="">{siteL10n("Share Plugin")}</h1>
      <div className="text-white text-sm">{plugin?.name}</div>

      <>
        <label className="block text-sm font-bold mb-2 mt-4 text-white">
        {siteL10n("Private Access")}
        </label>
        <PrivateAccess pluginId={plugin.id}/>
      </>
          
    </ReactModal>
  );
};
export default SharePluginModal;
