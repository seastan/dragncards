import React, { useRef, useEffect, useState } from "react";
import { Rnd } from "react-rnd";

//const expandOptions = (options, maxPlayers) => {
function expandPlayerGroups(baseGroups, maxPlayers) {
  const existingPlayerIndices = new Set();

  // Find base player group suffixes (e.g., "Deck", "Discard")
  const suffixes = new Set();
  for (const group of baseGroups) {
    const match = group.match(/^player(\d+)(.+)$/);
    if (match) {
      existingPlayerIndices.add(Number(match[1]));
      suffixes.add(match[2]);
    }
  }

  const newOptions = [];
  for (const suffix of suffixes) {
    for (let i = 0; i < maxPlayers; i++) {
      newOptions.push(`{playerN${i === 0 ? "" : "+" + i}}${suffix}`);
    }
  }

  return [...newOptions, ...baseGroups];
}

const CustomDropdown = ({ selected, options, onSelect, maxPlayers }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();
  const expandedOptions = expandPlayerGroups(options, maxPlayers);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full text-sm" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-white text-black px-2 py-1 border rounded text-left"
      >
        {selected || "(Choose a group)"}
      </button>
      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow z-10 max-h-40 overflow-y-auto">
          {expandedOptions.map((option) => (
            <div
              key={option}
              onClick={() => {
                onSelect(option);
                setOpen(false);
              }}
              className="px-3 py-1 hover:bg-blue-100 cursor-pointer"
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


export const LayoutRectangle = ({
  rect,
  gridSnap,
  updateRectangle,
  deleteRectangle,
  bringToFront,
  groups,
  maxPlayers
}) => {
  return (
    <Rnd
      key={rect.id}
      size={{ width: rect.width, height: rect.height }}
      default={{
        x: rect.x ?? 0,
        y: rect.y ?? 0
      }}
      onDragStop={(e, d) =>
        updateRectangle(rect.id, {
          x: Math.round(d.x / gridSnap[0]) * gridSnap[0],
          y: Math.round(d.y / gridSnap[1]) * gridSnap[1]
        })
      }
      onResizeStop={(e, direction, ref, delta, position) =>
        updateRectangle(rect.id, {
          width: Math.round(ref.offsetWidth / gridSnap[0]) * gridSnap[0],
          height: Math.round(ref.offsetHeight / gridSnap[1]) * gridSnap[1],
          x: Math.round(position.x / gridSnap[0]) * gridSnap[0],
          y: Math.round(position.y / gridSnap[1]) * gridSnap[1]
        })
      }
      bounds="parent"
      dragGrid={gridSnap}
      resizeGrid={gridSnap}
      className="bg-gray-100 border border-gray-700 p-1 text-black"
    >
      <div className="flex flex-col items-center w-full h-full text-xs">
        <CustomDropdown
          selected={rect.text}
          options={groups.map((g) => g.groupId)}
          onSelect={(value) => updateRectangle(rect.id, { text: value })}
          maxPlayers={maxPlayers}
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
            onClick={() => bringToFront(rect.id)}
            className="text-blue-600 text-xs underline hover:text-blue-800"
          >
            Send to Back
          </button>
          <button
            onClick={() => deleteRectangle(rect.id)}
            className="text-red-600 text-xs underline hover:text-red-800"
          >
            Delete
          </button>
        </div>
      </div>
    </Rnd>
  );
};

const defaultChatBox = {
  left: "75%",
  top: "80%",
  width: "25%",
  height: "20%"
};

const defaultNumRows = 5;

export default function Layout({ inputs, setInputs }) {
  const layout = inputs.layout || {};
  const rectangles = layout.rectangles || [];
  const chatBox = layout.chatBox || defaultChatBox;
  const numRows = layout.numRows || defaultNumRows;

  const setLayoutField = (field, value) => {
    setInputs((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        [field]: value
      }
    }));
  };

  const setRectangles = (newRects) => setLayoutField("rectangles", newRects);
  const setChatBox = (newChat) => setLayoutField("chatBox", newChat);
  const setNumRows = (rows) => setLayoutField("numRows", rows);

  const [gridSnap, setGridSnap] = useState([10, 10]);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!inputs.layout) {
      setInputs((prev) => ({
        ...prev,
        layout: {
          rectangles: [],
          chatBox: defaultChatBox,
          numRows: defaultNumRows,
          canvasWidth: canvasRef.current ? canvasRef.current.offsetWidth : window.innerWidth,
          canvasHeight: canvasRef.current ? canvasRef.current.offsetHeight : window.innerHeight
        }
      }));
    }
  }, [inputs.layout, setInputs]);

  useEffect(() => {
    const updateGridSnap = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        const rowHeight = height / numRows;
        setGridSnap([width * 0.01, rowHeight * 0.10]);
        setInputs((prev) => ({
          ...prev,
          layout: {
            ...prev.layout,
            canvasWidth: width,
            canvasHeight: height
          }
        }));
      }
    };

    updateGridSnap();
    window.addEventListener("resize", updateGridSnap);
    return () => window.removeEventListener("resize", updateGridSnap);
  }, [numRows]);

  const addRectangle = () => {
    const canvas = canvasRef.current;
    const rowHeight = canvas ? canvas.offsetHeight / numRows : window.innerHeight / numRows;
    setRectangles([
      ...rectangles,
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
    const oldRects = rectangles;
    const newRects = oldRects.map((r) => (r.id === id ? { ...r, ...updates } : r));
    console.log({oldRects, newRects, updates});
    setRectangles(newRects);
  };

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-80 bg-gray-900 p-4 flex flex-col gap-4 overflow-auto">
        <button
          onClick={addRectangle}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Group
        </button>

        <label className="text-sm text-white font-medium">Number of rows</label>
        <input
          type="number"
          min="1"
          value={numRows}
          onChange={(e) => setNumRows(Math.max(1, parseInt(e.target.value)))}
          className="px-2 py-1 border rounded w-full text-sm text-black"
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
                  onChange={(e) =>
                    setChatBox({ ...chatBox, [key]: e.target.value ?? "" })
                  }
                  className="px-2 py-1 border rounded w-full text-xs text-black"
                />
              </div>
            ))}
          </div>
        </div>
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

        <div
          className="absolute bg-gray-800 text-white text-xs flex items-center justify-center border border-white"
          style={{ ...chatBox }}
        >
          Chat
        </div>

        {rectangles.map((rect) => (
            <LayoutRectangle
              key={rect.id}
              rect={rect}
              gridSnap={gridSnap}
              updateRectangle={updateRectangle}
              deleteRectangle={(id) => {
                setRectangles(rectangles.filter((r) => r.id !== id));
              }}
              bringToFront={(id) =>
                setRectangles([
                  rectangles.find((r) => r.id === id),
                  ...rectangles.filter((r) => r.id !== id)
                ])
              }
              groups={inputs.groups || []}
              maxPlayers={inputs.maxPlayers}
            />
        ))}
      </div>
    </div>
  );
}
