import React, { useEffect } from "react";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";

export const FaceProperties = ({ inputs, setInputs }) => {
  const siteL10n = useSiteL10n();
  const cardDb = inputs.cardDb || {};
  const faceProperties = inputs.faceProperties || [];

  const excludedKeys = new Set(["databaseId", "name", "imageUrl", "cardBack", "type"]);
  const typeOptions = ["boolean", "integer", "string", "float", "object", "list"];

  // Convert camelCase to Standard Case
  const toStandardCase = (str) =>
    str
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase());

  // Initialize from cardDb[*].A
  useEffect(() => {
    if (faceProperties.length === 0 && Object.keys(cardDb).length > 0) {
      const anyCard = cardDb[Object.keys(cardDb)[0]];
      const keys = Object.keys(anyCard?.A || {});
      const initial = keys.map((key) => ({
        propertyId: key,
        type: "string",
        label: toStandardCase(key),
      }));
      setInputs((prev) => ({
        ...prev,
        faceProperties: initial,
      }));
    }
  }, [cardDb, faceProperties.length, setInputs]);

  // Fix: update by propertyId to avoid filter/index mismatch
  const updateFieldById = (propertyId, field, value) => {
    const updated = faceProperties.map((prop) =>
      prop.propertyId === propertyId ? { ...prop, [field]: value } : prop
    );
    setInputs((prev) => ({
      ...prev,
      faceProperties: updated,
    }));
  };

  return (
    <div className="w-full max-w-3xl p-6 m-4 bg-gray-800 rounded-lg text-white">
      <h3 className="text-lg font-semibold mb-4">{siteL10n("Face Properties")}</h3>

      <div className="flex items-start gap-3 p-2 mb-4 bg-blue-600 rounded-lg text-sm text-blue-800">
          <FontAwesomeIcon icon={faInfoCircle} className="text-white" />
      <p className="m-0">
          A <strong>"face"</strong> is the information printed on a card.
          Face properties are extracted from the columns in your TSV file. If you don't plan on
          using these properties in any automation, you can leave them as strings. But if you
          plan to use them to make calculations or comparisons, you should set the type
          accordingly.
      </p>
      </div>
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_12rem_10rem] gap-4 text-sm text-gray-400 m-2 px-1">
        <span>{siteL10n("Property ID")}</span>
        <span>{siteL10n("Label")}</span>
        <span>{siteL10n("Type")}</span>
      </div>

      <div className="space-y-2">
        {faceProperties
          .filter((prop) => !excludedKeys.has(prop.propertyId))
          .map((prop) => (
            <div
              key={prop.propertyId}
              className="grid grid-cols-[1fr_12rem_10rem] gap-4 items-center"
            >
              <input
                type="text"
                value={prop.propertyId}
                readOnly
                disabled
                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm opacity-70 cursor-not-allowed"
              />

              <input
                type="text"
                placeholder={siteL10n("Label")}
                value={prop.label}
                onChange={(e) =>
                  updateFieldById(prop.propertyId, "label", e.target.value)
                }
                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              />

              <select
                value={prop.type}
                onChange={(e) =>
                  updateFieldById(prop.propertyId, "type", e.target.value)
                }
                className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {siteL10n(type)}
                  </option>
                ))}
              </select>
            </div>
          ))}
      </div>
    </div>
  );
};
