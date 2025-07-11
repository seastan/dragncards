import React from "react";
import { useSiteL10n } from "../../../../hooks/useSiteL10n";

export const CardBacks = ({ inputs, setInputs }) => {
  const siteL10n = useSiteL10n();
  const cardDb = inputs?.cardDb || {};
  const listOfBacks = Object.keys(cardDb).map((cardId) => cardDb[cardId]?.A?.cardBack).filter(Boolean);
  const uniqueCardBacks = Array.from(new Set(listOfBacks)).sort();
  const filteredCardBacks = uniqueCardBacks.filter((type) => type !== "multi_sided");

  const cardBacks = inputs?.cardBacks || {};

  const handleNumberChange = (type, field, value) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;

    setInputs({
      ...inputs,
      cardBacks: {
        ...inputs.cardBacks,
        [type]: {
          ...inputs.cardBacks?.[type],
          [field]: numericValue,
        },
      },
    });
  };

  const handleImageUrlChange = (type, value) => {
    setInputs({
      ...inputs,
      cardBacks: {
        ...inputs.cardBacks,
        [type]: {
          ...inputs.cardBacks?.[type],
          imageUrl: value,
        },
      },
    });
  };

  return (
    <div className="max-w-4xl p-6 m-4 bg-gray-800 rounded-lg">
      <p className="text-sm text-gray-300 mb-4">
        {siteL10n("These are the card backs extracted from the card database. Fill or correct the fields below.")}
      </p>

      <div className="space-y-6 overflow-y-auto" style={{ maxHeight: "75vh" }}>
        {filteredCardBacks.map((type) => {
          const values = cardBacks?.[type] || { width: 0.72, height: 1.0, imageUrl: "" };
          const { width, height, imageUrl } = values;

          return (
            <div key={type} className="flex flex-wrap items-start gap-4 bg-gray-700 p-4 rounded">
              <div className="flex flex-wrap items-center gap-4">
                <span className="w-32 font-semibold text-white">{type}</span>

                <label className="flex items-center space-x-2 text-sm text-gray-300">
                  <span>{siteL10n("Width")}:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={width}
                    onChange={(e) => handleNumberChange(type, "width", e.target.value)}
                    className="w-20 bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
                  />
                </label>

                <label className="flex items-center space-x-2 text-sm text-gray-300">
                  <span>{siteL10n("Height")}:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={height}
                    onChange={(e) => handleNumberChange(type, "height", e.target.value)}
                    className="w-20 bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
                  />
                </label>

                <label className="flex items-center space-x-2 text-sm text-gray-300">
                  <span>{siteL10n("Image URL")}:</span>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => handleImageUrlChange(type, e.target.value)}
                    className="w-64 bg-gray-800 text-white border border-gray-600 rounded px-2 py-1"
                  />
                </label>
              </div>

              {imageUrl?.trim() && (
                <div className="mt-2">
                  <img
                    src={imageUrl}
                    alt={`Card back for ${type}`}
                    className="rounded shadow max-h-40 border border-gray-500"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};