import React from "react";
import ReactModal from "react-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { useSiteL10n } from "../../../hooks/useSiteL10n";
import Button from "../../../components/basic/Button";
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
      overlayClassName="fixed inset-0 bg-black-70 z-50 overflow-y-auto"
      className="insert-auto bg-gray-700 border border-gray-600 mx-auto my-12 rounded-lg shadow-lg outline-none"
      style={{
        overlay: {
        },
        content: {
          width: '500px',
        }
      }}
    >

      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-600">
        <div className="min-w-0">
          <h1 className="text-white leading-tight">{siteL10n("Share Plugin")}</h1>
          <div className="text-gray-300 text-sm truncate">{plugin?.name}</div>
        </div>
        <button
          type="button"
          onClick={closeModal}
          aria-label={siteL10n("Close")}
          className="ml-4 h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full text-gray-300 hover:text-white hover:bg-gray-600 focus:outline-none"
        >
          <FontAwesomeIcon icon={faTimes}/>
        </button>
      </div>

      <div className="px-5 py-4">
        <label className="block text-sm font-bold text-white">
          {siteL10n("Private Access")}
        </label>
        <p className="text-xs text-gray-300 mt-1 mb-3">
          {siteL10n("These users can use this plugin while it is private. Start typing a username to add someone.")}
        </p>
        <PrivateAccess pluginId={plugin.id}/>
      </div>

      <div className="px-5 py-3 border-t border-gray-600 flex justify-end">
        <div className="w-32">
          <Button isPrimary onClick={closeModal}>
            {siteL10n("Done")}
          </Button>
        </div>
      </div>

    </ReactModal>
  );
};
export default SharePluginModal;
