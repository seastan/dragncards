
import React, { useCallback, useEffect, useRef, useState } from "react";
import { importCardDbTsv } from "../../uploadPluginFunctions";
import Button from "../../../../components/basic/Button";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";
import { tempCardDb } from "../tempCardDb";

const setCardData = (inputs, setInputs, cardDb) => {
  setInputs(inputs => ({
    ...inputs,
    cardDb: cardDb || [],
  }));

  // Set the card types
  const listOfTypes = Object.keys(cardDb).map((cardId) => cardDb[cardId]?.A?.type).filter(Boolean);
  const uniqueTypes = Array.from(new Set(listOfTypes)).sort();
  const cardTypes = uniqueTypes.reduce((acc, type) => {
    acc[type] = {
      width: 0.72, // Default width
      height: 1.0, // Default height
    };
    return acc;
  }, {});

  setInputs(inputs => ({
    ...inputs,
    cardTypes: cardTypes,
  }));

  // Set the card backs
  const listOfBacks = Object.keys(cardDb).map((cardId) => cardDb[cardId]?.A?.cardBack).filter(Boolean);
  const uniqueCardBacks = Array.from(new Set(listOfBacks)).sort();
  const cardBacks = uniqueCardBacks.reduce((acc, type) => {
    if (type === "multi_sided") return acc; // Skip multi-sided cards
    acc[type] = {
      width: 0.72, // Default width
      height: 1.0, // Default height
    };
    return acc;
  }, {});

  setInputs(inputs => ({
    ...inputs,
    cardBacks: cardBacks,
  }));
};

export const CardData = ({inputs, setInputs}) => {
    const siteL10n = useSiteL10n();
    const fileInputRef = useRef(null);

    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessages, setErrorMessages] = useState([]);

    // useEffect(() => {
    //   // Initialize cardDb if not present
    //   if (!inputs.cardDb) {
    //     setCardData(inputs, setInputs, tempCardDb);
    //   }
    // }, [inputs, setInputs]);

    const handleFileChange = useCallback(async (event) => {
      const { files } = event.target;
      if (!files || files.length === 0) {
        setSuccessMessage("");
        setErrorMessages([siteL10n("No files selected.")]);
        return;
      }

      try {
        const result = await importCardDbTsv(null, files);

        if (result.status === "success") {
          setSuccessMessage(result.messages?.[0] || siteL10n("Upload succeeded."));
          setErrorMessages([]);

          setCardData(inputs, setInputs, result.cardDb);
        } else {
          setSuccessMessage("");
          setErrorMessages(result.messages || [siteL10n("Unknown error during upload.")]);
        }
      } catch (err) {
        console.error("TSV import error:", err);
        setSuccessMessage("");
        setErrorMessages([siteL10n("An unexpected error occurred.")]);
      }
    }, [setInputs, siteL10n]);

    const loadFileCardDb = () => {
        fileInputRef.current.click();
    }


  return (
    <div className="max-w-3xl p-6 m-4 bg-gray-800 rounded-lg">

      <p className="text-sm text-gray-300 mb-3">
        {siteL10n(
          "You may upload multiple tab-separated-value (.tsv) files at once that define different cards and they will be merged automatically. Each file must share the same header information."
        )}
      </p>

      <a
        href="https://github.com/seastan/dragncards/wiki/TSV-Documentation"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline text-sm mb-4 block"
      >
        {siteL10n("How do I prepare my TSV File?")}
      </a>

      <div className="flex items-center gap-4 mb-4">
        <Button onClick={loadFileCardDb} isPrimary className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          {siteL10n("Choose File(s)")}
        </Button>
        <span className="text-gray-400 text-sm">.tsv only</span>
      </div>

      <input
        type="file"
        multiple
        accept=".tsv"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {successMessage && (
        <div className="flex items-center text-green-400 text-sm mt-2">
          ✅ <span className="ml-2">{successMessage}</span>
        </div>
      )}

      {errorMessages.length > 0 && (
        <div className="mt-2 space-y-1">
          {errorMessages.map((msg, idx) => (
            <div key={`error-${idx}`} className="flex items-center text-red-400 text-sm">
              ❌ <span className="ml-2">{msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}