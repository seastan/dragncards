import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus, faInfoCircle } from "@fortawesome/free-solid-svg-icons";

export const Tokens = ({ inputs, setInputs }) => {
  const tokens = inputs.tokens || [];

  const addToken = () => {
    setInputs(prev => ({
      ...prev,
      tokens: [
        ...tokens,
        {
          id: "",
          label: "",
          left: 0,
          top: 0,
          width: 4,
          height: 4,
          imageUrl: "https://dragncards-core.s3.us-east-1.amazonaws.com/test_token.png"
        }
      ]
    }));
  };

  const removeToken = (index) => {
    setInputs(prev => ({
      ...prev,
      tokens: tokens.filter((_, i) => i !== index)
    }));
  };

  const updateTokenField = (index, field, value) => {
    setInputs(prev => ({
      ...prev,
      tokens: tokens.map((token, i) =>
        i === index ? { ...token, [field]: value } : token
      )
    }));
  };

  return (
    <div className="w-full max-w-4xl p-6 m-4 bg-gray-800 rounded-lg text-white">
      <h3 className="text-lg font-semibold mb-4">Tokens</h3>
      <div className="flex items-start gap-3 p-2 mb-4 bg-blue-600 rounded-lg text-sm text-white">
        <FontAwesomeIcon icon={faInfoCircle} className="text-white mt-1" />
        <p className="m-0">Define token types and preview how they'll appear on the card.</p>
      </div>

      {/* Card Preview Mockup */}
      <div className="relative mb-6 border border-gray-500 rounded" style={{ height: "14vh", width: "10.08vh" }}>
        {/* Background card image */}
        {(() => {
          const firstCardId = Object.keys(inputs.cardDb || {})[0];
          const cardImage = firstCardId && inputs.cardDb[firstCardId]?.A?.imageUrl;
          return cardImage ? (
            <img
              src={cardImage}
              alt="Card Preview"
              className="absolute top-0 left-0 w-full h-full object-cover rounded"
            />
          ) : (
            <div className="absolute top-0 left-0 w-full h-full bg-gray-300 rounded flex items-center justify-center text-xs text-gray-700">
              No card image found
            </div>
          );
        })()}

        {/* Token overlays */}
        {tokens.map((token, i) => (
          <img
            key={i}
            src={token.imageUrl}
            alt=""
            style={{
              position: "absolute",
              left: `${token.left}%`,
              top: `${token.top}%`,
              width: `${token.width}vh`,
              height: `${token.height}vh`,
              objectFit: "contain",
              pointerEvents: "none"
            }}
          />
        ))}
      </div>

      {/* Token Editors */}
      {tokens.map((token, index) => (
        <div key={index} className="mb-6 border border-gray-600 p-4 rounded bg-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => removeToken(index)} className="text-red-400 hover:text-red-600">
              <FontAwesomeIcon icon={faTrash} />
            </button>
            <input
              type="text"
              placeholder="Token ID"
              value={token.id}
              onChange={(e) => updateTokenField(index, "id", e.target.value)}
              className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm w-40"
            />
            <input
              type="text"
              placeholder="Label"
              value={token.label}
              onChange={(e) => updateTokenField(index, "label", e.target.value)}
              className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm w-40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 ml-10">
            <div>
              <label className="block text-xs mb-1 text-gray-300">Token left edge (% of card width)</label>
              <input
                type="number"
                value={token.left}
                onChange={(e) => updateTokenField(index, "left", Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-300">Token top edge (% of card height)</label>
              <input
                type="number"
                value={token.top}
                onChange={(e) => updateTokenField(index, "top", Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-300">Width (% of screen width)</label>
              <input
                type="number"
                value={token.width}
                onChange={(e) => updateTokenField(index, "width", Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-300">Height (% of screen height)</label>
              <input
                type="number"
                value={token.height}
                onChange={(e) => updateTokenField(index, "height", Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs mb-1 text-gray-300">Image URL</label>
              <input
                type="text"
                value={token.imageUrl}
                onChange={(e) => updateTokenField(index, "imageUrl", e.target.value)}
                className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm mb-1"
              />
              {token.imageUrl && (
                <img
                  src={token.imageUrl}
                  alt="Token Preview"
                  className="max-h-16 object-contain border border-gray-500 rounded"
                />
              )}
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addToken}
        className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
      >
        <FontAwesomeIcon icon={faPlus} />
        Add Token
      </button>
    </div>
  );
};
