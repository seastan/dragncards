import React, { useState } from "react";
import ReactModal from "react-modal";
import Button from "../../components/basic/Button";

interface Props {
  isOpen: boolean;
  closeModal: () => void;
  shareReplayUrl: string;
}

ReactModal.setAppElement("#root");

export const ShareGameModal: React.FC<Props> = ({ isOpen, closeModal, shareReplayUrl}) => {
  //const [checked, setChecked] = useState(false);
  const [copyText, setCopyText] = useState("Copy");

  const url = "https://www.dragncards.com" + shareReplayUrl;
  
  return (
    <ReactModal
      closeTimeoutMS={200}
      isOpen={isOpen}
      onRequestClose={closeModal}
      contentLabel="Share Game"
      overlayClassName="fixed inset-0 bg-black-50 z-50"
      className="insert-auto p-5 bg-gray-700 border mx-auto my-12 rounded-lg outline-none"
      style={{
        overlay: {
        },
        content: {
          width: '600px',
        }
      }}
    >

      <h1 className="mb-2">Share Game</h1>
      <input
        className="form-control w-full bg-gray-900 text-white"
        value={url}
      />
      {/*   <input onClick={() => setChecked(!checked)} checked={checked} type="checkbox" name="shuffle" id="shuffle"/><label className="text-white ml-2" htmlFor="shuffle">Shuffle decks after loading</label> */}
      <Button onClick={() => {navigator.clipboard.writeText(url); setCopyText("Copied!")}} isPrimary className="mt-2">{copyText}</Button>

    </ReactModal>
  );
};
export default ShareGameModal;
