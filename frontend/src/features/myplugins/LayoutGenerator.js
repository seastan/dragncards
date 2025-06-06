import React, { useState, useRef, useEffect } from "react";
import { Rnd } from "react-rnd";

export default function LayoutGenerator() {
  const [rectangles, setRectangles] = useState([]);
  const [numRows, setNumRows] = useState(5);
  const [gridSnap, setGridSnap] = useState([10, 10]);
  const [chatBox, setChatBox] = useState({
    left: "75%",
    top: "80%",
    width: "25%",
    height: "20%"
  });
  const [importText, setImportText] = useState("");
  const canvasRef = useRef(null);

  useEffect(() => {
    const updateGridSnap = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        const rowHeight = height / numRows;
        setGridSnap([width * 0.01, rowHeight * 0.10]);
      }
    };

    updateGridSnap();
    window.addEventListener("resize", updateGridSnap);
    return () => window.removeEventListener("resize", updateGridSnap);
  }, [numRows]);

  const parseValueToPercent = (value) => {
    if (typeof value === "string" && value.includes("/")) {
      const [num, denom] = value.split("/").map(Number);
      if (!isNaN(num) && !isNaN(denom) && denom !== 0) {
        return `${((num / denom) * 100).toFixed(1)}%`;
      }
    }
    return value;
  };

  const addRectangle = () => {
    const canvas = canvasRef.current;
    const rowHeight = canvas ? canvas.offsetHeight / numRows : window.innerHeight / numRows;
    setRectangles((prev) => [
      ...prev,
      {
        id: Date.now(),
        x: 0,
        y: 0,
        width: gridSnap[0] * 12,
        height: Math.round(rowHeight),
        text: "",
        type: "row",
        direction: "horizontal"
      }
    ]);
  };

  const updateRectangle = (id, updates) => {
    setRectangles((prev) =>
      prev.map((rect) => (rect.id === id ? { ...rect, ...updates } : rect))
    );
  };

  const importLayout = () => {
    try {
        const data = JSON.parse(importText);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;

        const parseFractionOrPercent = (v, total) => {
        if (typeof v === "string" && v.includes("/")) {
            const [num, denom] = v.split("/").map(Number);
            return (num / denom) * total;
        }
        const numeric = typeof v === "string" ? parseFloat(v) : v;
        return numeric > 1 ? (numeric / 100) * total : numeric * total;
        };

        const newRects = Object.values(data.regions || {}).map((region) => {
        return {
            id: Date.now() + Math.random(),
            x: parseFractionOrPercent(region.left, width),
            y: parseFractionOrPercent(region.top, height),
            width: parseFractionOrPercent(region.width, width),
            height: parseFractionOrPercent(region.height, height),
            text: region.groupId || "",
            type: region.type || "row",
            direction: region.direction || "horizontal"
        };
        });

        setRectangles(newRects);

        if (data.chat) {
        setChatBox({
            left: parseValueToPercent(data.chat.left),
            top: parseValueToPercent(data.chat.top),
            width: parseValueToPercent(data.chat.width),
            height: parseValueToPercent(data.chat.height)
        });
        }
    } catch (e) {
        alert("Invalid JSON");
    }
    };

  const exportJSON = () => {
    const canvas = canvasRef.current;
    if (!canvas) return "";

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    const base = {
      cardSize: Math.ceil((1 / numRows) * 100 - 4),
      rowSpacing: 3,
      chat: chatBox
    };

    const regions = {};
    rectangles.forEach(({ x, y, width: w, height: h, text: groupId, type, direction }) => {
      regions[groupId] = {
        groupId: groupId,
        type: type,
        direction: direction,
        left: `${((x / width) * 100).toFixed(1)}%`,
        top: `${((y / height) * 100).toFixed(1)}%`,
        width: `${((w / width) * 100).toFixed(1)}%`,
        height: `${((h / height) * 100).toFixed(1)}%`
      };
    });

    base.regions = regions;

    return JSON.stringify(base, null, 2);
  };

  return (
    <div className="flex h-screen">
      {/* Left column */}
      <div className="w-80 bg-gray-900 p-4 flex flex-col gap-4 overflow-auto">
        <button
          onClick={addRectangle}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Add Group
        </button>

        <label className="text-sm text-white font-medium">Number of rows</label>
        <input
          type="number"
          min="1"
          value={numRows}
          onChange={(e) => setNumRows(Math.max(1, parseInt(e.target.value)))}
          className="px-2 py-1 border rounded w-full text-sm"
        />

        <div className="text-white text-sm">
          <label className="block mb-2 font-medium">Chat Box</label>
          <div className="grid grid-cols-4 gap-2">
            {['left', 'top', 'width', 'height'].map((key) => (
              <div key={key} className="flex flex-col items-start">
                <label className="text-xs capitalize mb-1">{key}</label>
                <input
                  type="text"
                  value={chatBox[key]}
                  onChange={(e) => {
                    const value = e.target?.value ?? "";
                    setChatBox((prev) => ({ ...prev, [key]: value }));
                  }}
                  className="px-2 py-1 border rounded w-full text-xs text-black"
                />
              </div>
            ))}
          </div>
        </div>


        <div className="flex-1 border p-2 shadow overflow-auto">
          <h2 className="text-sm font-bold mb-2 text-white">JSON</h2>
          <textarea
            className="w-full h-full bg-gray-400 text-xs p-1 border resize-none"
            readOnly
            value={exportJSON()}
          />
        </div>

        <textarea
          className="w-full h-40 bg-gray-200 text-xs p-1 border resize-none text-black"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Optional: Paste layout JSON to import here"
        />
        <button
          onClick={importLayout}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
        >
          Import Layout
        </button>

      </div>

      {/* Right canvas area */}
      <div ref={canvasRef} className="flex-1 bg-gray-700 relative">
        {[...Array(numRows)].map((_, i) => (
          <div
            key={i}
            className="absolute left-0 w-full border-t border-dashed border-white"
            style={{ top: `${(i * 100) / numRows}%` }}
          />
        ))}

        {/* Static chat rectangle */}
        <div
          className="absolute bg-gray-800 text-white text-xs flex items-center justify-center border border-white"
          style={{
            left: chatBox.left,
            top: chatBox.top,
            width: chatBox.width,
            height: chatBox.height
          }}
        >
          Chat
        </div>

        {rectangles.map((rect) => (
          <Rnd
            key={rect.id}
            size={{ width: rect.width, height: rect.height }}
            position={{ x: rect.x, y: rect.y }}
            onDragStop={(e, d) => {
              updateRectangle(rect.id, {
                x: Math.round(d.x / gridSnap[0]) * gridSnap[0],
                y: Math.round(d.y / gridSnap[1]) * gridSnap[1]
              });
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
              updateRectangle(rect.id, {
                width: Math.round(ref.offsetWidth / gridSnap[0]) * gridSnap[0],
                height: Math.round(ref.offsetHeight / gridSnap[1]) * gridSnap[1],
                x: Math.round(position.x / gridSnap[0]) * gridSnap[0],
                y: Math.round(position.y / gridSnap[1]) * gridSnap[1]
              });
            }}
            bounds="parent"
            dragGrid={gridSnap}
            resizeGrid={gridSnap}
            className="bg-gray-100 border border-gray-700 p-1"
          >
            <div className="flex flex-col items-center w-full h-full text-xs">
              <input
                type="text"
                value={rect.text}
                placeholder="Enter Group ID"
                onChange={(e) => updateRectangle(rect.id, { text: e.target.value })}
                className="text-center w-full bg-white outline-none m-1 p-1 border rounded text-sm"
              />
              <div className="flex gap-1 mb-1">
                {['free', 'row', 'pile'].map((type) => (
                  <label
                    key={type}
                    className={`px-2 py-1 border rounded cursor-pointer ${rect.type === type ? 'bg-gray-300' : 'bg-white'}`}
                  >
                    <input
                      type="radio"
                      name={`type-${rect.id}`}
                      value={type}
                      checked={rect.type === type}
                      onChange={() => updateRectangle(rect.id, { type })}
                      className="hidden"
                    />
                    {type}
                  </label>
                ))}
              </div>
              <div className="flex gap-1">
                {['horizontal', 'vertical'].map((dir) => (
                  <label
                    key={dir}
                    className={`px-2 py-1 border rounded cursor-pointer ${rect.direction === dir ? 'bg-gray-300' : 'bg-white'}`}
                  >
                    <input
                      type="radio"
                      name={`direction-${rect.id}`}
                      value={dir}
                      checked={rect.direction === dir}
                      onChange={() => updateRectangle(rect.id, { direction: dir })}
                      className="hidden"
                    />
                    {dir}
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                    onClick={() => {
                    setRectangles((prev) => {
                        const target = prev.find((r) => r.id === rect.id);
                        const others = prev.filter((r) => r.id !== rect.id);
                        return [target, ...others];
                    });
                    }}
                    className="text-blue-600 text-xs underline hover:text-blue-800"
                >
                    Send to Back
                </button>
                <button
                    onClick={() => setRectangles((prev) => prev.filter((r) => r.id !== rect.id))}
                    className="text-red-600 text-xs underline hover:text-red-800"
                >
                    Delete
                </button>
              </div>
            </div>
          </Rnd>
        ))}
      </div>
    </div>
  );
}
