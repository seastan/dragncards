import React from "react";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";

export const CardTypes = ({ inputs, setInputs }) => {
  const siteL10n = useSiteL10n();
  const cardDb = inputs?.cardDb || {};
  const listOfTypes = Object.keys(cardDb).map((cardId) => cardDb[cardId]?.A?.type).filter(Boolean);
  const uniqueTypes = Array.from(new Set(listOfTypes)).sort();

  // Initialize cardTypes if not present
  const cardTypes = inputs?.cardTypes || {};

  const handleChange = (type, field, value) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;

    setInputs((prev) => ({
      ...prev,
      cardTypes: {
        ...prev.cardTypes,
        [type]: {
          ...prev.cardTypes?.[type],
          [field]: numericValue,
        },
      },
    }));
  };

  return (
    <div className="max-w-3xl p-6 m-4 bg-gray-800 rounded-lg">
      <p className="text-sm text-gray-300 mb-4">
        {siteL10n("These are the card types extracted from the card database. Fill or correct the fields below.")}
      </p>

      <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '75vh' }}>
        {uniqueTypes.map((type) => {
          const values = cardTypes?.[type] || { width: 0.72, height: 1.0 };
          return (
            <div key={type} className="flex items-center space-x-4">
              <span className="w-32 font-semibold text-white">{type}</span>
              <label className="flex items-center space-x-2 text-sm text-gray-300">
                <span>{siteL10n("Width")}:</span>
                <input
                  type="number"
                  step="0.01"
                  value={values.width}
                  onChange={(e) => handleChange(type, "width", e.target.value)}
                  className="w-20 bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
                />
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-300">
                <span>{siteL10n("Height")}:</span>
                <input
                  type="number"
                  step="0.01"
                  value={values.height}
                  onChange={(e) => handleChange(type, "height", e.target.value)}
                  className="w-20 bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};
