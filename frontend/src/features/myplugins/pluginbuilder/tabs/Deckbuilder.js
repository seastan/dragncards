import React, { useEffect } from "react";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

export const Deckbuilder = ({ inputs, setInputs }) => {
  const siteL10n = useSiteL10n();

  const faceProperties = inputs.faceProperties || [];
  const deckbuilder = inputs.deckbuilder || {};
  const maxCardQuantity = deckbuilder.maxCardQuantity ?? 3;
  const searchableColumns = new Set(deckbuilder.searchableColumns?.map((col) => col.propertyId) || []);

  const handleToggle = (propertyId, label) => {
    const currentlySelected = new Set(deckbuilder.searchableColumns?.map((col) => col.propertyId) || []);
    const updated = [...deckbuilder.searchableColumns || []];

    if (currentlySelected.has(propertyId)) {
      // remove
      const filtered = updated.filter((entry) => entry.propertyId !== propertyId);
      setInputs((prev) => ({
        ...prev,
        deckbuilder: {
          ...prev.deckbuilder,
          searchableColumns: filtered
        }
      }));
    } else {
      // add
      updated.push({ propertyId, label });
      setInputs((prev) => ({
        ...prev,
        deckbuilder: {
          ...prev.deckbuilder,
          searchableColumns: updated
        }
      }));
    }
  };

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setInputs((prev) => ({
        ...prev,
        deckbuilder: {
          ...prev.deckbuilder,
          maxCardQuantity: value
        }
      }));
    }
  };

  // 🧱 Set defaults for searchableColumns
  useEffect(() => {
    if (!deckbuilder.searchableColumns || deckbuilder.searchableColumns.length === 0) {
      const defaultProps = faceProperties.filter((p) =>
        ["name", "type"].includes(p.propertyId)
      ).map((p) => ({
        propertyId: p.propertyId,
        label: p.label
      }));

      setInputs((prev) => ({
        ...prev,
        deckbuilder: {
          ...prev.deckbuilder,
          searchableColumns: defaultProps,
          maxCardQuantity: maxCardQuantity ?? 3
        }
      }));
    }
  }, [deckbuilder.searchableColumns, faceProperties, maxCardQuantity, setInputs]);

  return (
    <div className="w-full max-w-3xl p-6 m-4 bg-gray-800 rounded-lg text-white">
      <h3 className="text-lg font-semibold mb-4">{siteL10n("Deckbuilder Settings")}</h3>

      {/* Max card quantity */}
      <div className="mb-4">
        <label className="block mb-1 text-sm text-gray-300">{siteL10n("Max Card Quantity")}</label>
        <input
          type="number"
          min={1}
          value={maxCardQuantity}
          onChange={handleQuantityChange}
          className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
        />
      </div>

      {/* Searchable columns */}
      <div className="mb-2 text-sm text-gray-300">{siteL10n("Searchable Columns")}</div>
      <div className="flex flex-wrap gap-2">
        {faceProperties.map((prop) => {
          const isActive = searchableColumns.has(prop.propertyId);
          return (
            <button
              key={prop.propertyId}
              onClick={() => handleToggle(prop.propertyId, prop.label)}
              className={`flex items-center gap-1 px-3 py-1 rounded text-sm border transition ${
                isActive
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-700 border-gray-600 text-gray-300"
              }`}
            >
              {isActive && <FontAwesomeIcon icon={faCheck} />}
              {prop.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
