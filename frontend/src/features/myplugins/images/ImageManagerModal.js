import React from "react";
import ReactModal from "react-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { ImageManager } from "./ImageManager";

ReactModal.setAppElement("#root");

/**
 * The manager opened from a plugin row. Images belong to the user rather than
 * to a plugin, so this shows the same library as the /myimages page; the plugin
 * is only context for the copy.
 */
export const ImageManagerModal = ({ plugin, closeModal }) => (
  <ReactModal
    closeTimeoutMS={200}
    isOpen={true}
    onRequestClose={closeModal}
    contentLabel="Hosted Images"
    overlayClassName="fixed inset-0 bg-black-70 z-50 overflow-y-auto"
    className="insert-auto bg-gray-700 border border-gray-600 mx-auto my-12 rounded-lg shadow-lg outline-none"
    style={{ overlay: {}, content: { width: "90%", maxWidth: "1100px" } }}
  >
    <div className="flex items-center justify-between border-b border-gray-600 px-4 py-2">
      <div>
        <h2 className="text-white">Hosted Images</h2>
        {plugin?.name && (
          <div className="text-xs text-gray-400">
            Your image library. Use a folder's URL as an imageUrlPrefix in {plugin.name}.
          </div>
        )}
      </div>
      <FontAwesomeIcon
        icon={faTimes}
        className="cursor-pointer text-gray-300 hover:text-white"
        onClick={closeModal}
      />
    </div>

    <div className="p-3" style={{ height: "70vh" }}>
      <ImageManager />
    </div>
  </ReactModal>
);

export default ImageManagerModal;
