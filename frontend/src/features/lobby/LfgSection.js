import React, { useState, useCallback, useEffect, useMemo } from "react";
import axios from "axios";
import ReactModal from "react-modal";
import useProfile from "../../hooks/useProfile";
import useIsLoggedIn from "../../hooks/useIsLoggedIn";
import useChannel from "../../hooks/useChannel";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { Link } from "react-router-dom";
import { ToggleSwitch } from "../engine/AutomationModal";

ReactModal.setAppElement("#root");

const experienceLevels = [
  { value: "any", label: "Any" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert", label: "Expert" },
];

const formatDateTime = (utcString) => {
  if (!utcString) return "";
  const date = new Date(utcString + (utcString.endsWith("Z") ? "" : "Z"));
  return date.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const formatTimeOnly = (utcString) => {
  if (!utcString) return "";
  const date = new Date(utcString + (utcString.endsWith("Z") ? "" : "Z"));
  return date.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
};

const formatTimeRange = (fromUtc, toUtc) => {
  if (!fromUtc || !toUtc) return "";
  const fromDate = new Date(fromUtc + (fromUtc.endsWith("Z") ? "" : "Z"));
  const toDate = new Date(toUtc + (toUtc.endsWith("Z") ? "" : "Z"));
  const sameDay = fromDate.getFullYear() === toDate.getFullYear() &&
    fromDate.getMonth() === toDate.getMonth() &&
    fromDate.getDate() === toDate.getDate();
  if (sameDay) {
    return `${formatDateTime(fromUtc)} – ${formatTimeOnly(toUtc)}`;
  }
  return `${formatDateTime(fromUtc)} – ${formatDateTime(toUtc)}`;
};

const getShortTimezoneLabel = () => {
  try {
    return new Date().toLocaleTimeString(undefined, { timeZoneName: "short" }).split(" ").pop();
  } catch {
    return "";
  }
};

// Convert slot (0–95) to a time label like "12:00 AM", "7:15 PM"
const slotToTimeLabel = (slot) => {
  const hours24 = Math.floor(slot / 4);
  const minutes = (slot % 4) * 15;
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
};

// Returns e.g. "America/New_York (UTC-5)"
const getTimezoneLabel = () => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offsetMin = new Date().getTimezoneOffset();
  const sign = offsetMin <= 0 ? "+" : "-";
  const absHours = Math.floor(Math.abs(offsetMin) / 60);
  const absMin = Math.abs(offsetMin) % 60;
  const offsetStr = absMin === 0 ? `UTC${sign}${absHours}` : `UTC${sign}${absHours}:${String(absMin).padStart(2, "0")}`;
  return `${tz} (${offsetStr})`;
};

// Combine a date string "YYYY-MM-DD" and slot (0–95) into a UTC ISO string
const slotsToUtcIso = (dateStr, slot) => {
  const hours = Math.floor(slot / 4);
  const minutes = (slot % 4) * 15;
  const d = new Date(`${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  return d.toISOString();
};

// Convert a UTC ISO string to a local slot (0–95), clamped
const utcToLocalSlot = (utcString) => {
  if (!utcString) return 0;
  const date = new Date(utcString + (utcString.endsWith("Z") ? "" : "Z"));
  return date.getHours() * 4 + Math.floor(date.getMinutes() / 15);
};

// Get today's date as "YYYY-MM-DD" in local time
const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Dual range slider component for time selection
const TimeRangeSlider = ({ startSlot, endSlot, onStartChange, onEndChange, minSlot = 0, maxSlot = 95 }) => {
  const leftPct = ((startSlot - minSlot) / (maxSlot - minSlot)) * 100;
  const rightPct = ((endSlot - minSlot) / (maxSlot - minSlot)) * 100;

  return (
    <div>
      <div style={{ position: "relative", height: 40, marginTop: 4 }}>
        {/* Track background */}
        <div style={{
          position: "absolute", top: 16, left: 0, right: 0, height: 8,
          backgroundColor: "#4a5568", borderRadius: 4,
        }} />
        {/* Highlighted range */}
        <div style={{
          position: "absolute", top: 16, height: 8, borderRadius: 4,
          backgroundColor: "#3b82f6",
          left: `${leftPct}%`,
          width: `${rightPct - leftPct}%`,
        }} />
        {/* Start slider */}
        <input
          type="range"
          min={minSlot}
          max={maxSlot}
          step={1}
          value={startSlot}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val < endSlot) onStartChange(val);
          }}
          style={{
            position: "absolute", top: 6, left: 0, width: "100%",
            WebkitAppearance: "none", appearance: "none",
            background: "transparent", pointerEvents: "none",
            height: 28, margin: 0, zIndex: 3,
          }}
          className="lfg-range-thumb"
        />
        {/* End slider */}
        <input
          type="range"
          min={minSlot}
          max={maxSlot}
          step={1}
          value={endSlot}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val > startSlot) onEndChange(val);
          }}
          style={{
            position: "absolute", top: 6, left: 0, width: "100%",
            WebkitAppearance: "none", appearance: "none",
            background: "transparent", pointerEvents: "none",
            height: 28, margin: 0, zIndex: 4,
          }}
          className="lfg-range-thumb"
        />
      </div>
      <div className="flex justify-between text-sm text-gray-200 mt-1">
        <span>{slotToTimeLabel(startSlot)}</span>
        <span>{slotToTimeLabel(endSlot)}</span>
      </div>
      {/* Inline style for slider thumbs */}
      <style>{`
        .lfg-range-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          border: 2px solid white;
          cursor: pointer;
          pointer-events: auto;
        }
        .lfg-range-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          border: 2px solid white;
          cursor: pointer;
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
};

export const LfgSection = ({ plugin }) => {
  const myUser = useProfile();
  const isLoggedIn = useIsLoggedIn();
  const authOptions = useAuthOptions();
  const [posts, setPosts] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [joinPostId, setJoinPostId] = useState(null);
  const [joinSlot, setJoinSlot] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [description, setDescription] = useState("Standard game");
  const [numPlayersWanted, setNumPlayersWanted] = useState(1);
  const [experienceLevel, setExperienceLevel] = useState("any");
  const [availableDate, setAvailableDate] = useState(getTodayDate);
  const [startSlot, setStartSlot] = useState(0);
  const [endSlot, setEndSlot] = useState(95);

  const pluginId = plugin?.id;
  const timezoneLabel = useMemo(() => getTimezoneLabel(), []);

  // Fetch posts on mount
  useEffect(() => {
    if (!pluginId) return;
    const fetchPosts = async () => {
      try {
        const res = await axios.get(`/be/api/v1/lfg/${pluginId}`);
        setPosts(res.data.posts || []);
      } catch (err) {
        console.log("LFG fetch error", err);
      }
    };
    fetchPosts();
  }, [pluginId]);

  // Fetch subscription status
  useEffect(() => {
    if (!pluginId || !isLoggedIn) return;
    const fetchSub = async () => {
      try {
        const res = await axios.get(`/be/api/v1/lfg/subscribe/${pluginId}`, authOptions);
        setSubscribed(res.data.subscribed);
      } catch (err) {
        console.log("LFG sub status error", err);
      }
    };
    fetchSub();
  }, [pluginId, isLoggedIn]);

  // Channel subscription for real-time updates
  const onChannelMessage = useCallback(
    (event, payload) => {
      if (event === "lfg_update" && payload.posts != null) {
        setPosts(payload.posts);
      }
    },
    []
  );
  useChannel(`lfg:${pluginId}`, onChannelMessage, myUser?.id);

  const handleCreatePost = async () => {
    setError(null);
    const fromIso = slotsToUtcIso(availableDate, startSlot);
    const toIso = slotsToUtcIso(availableDate, endSlot);
    const now = new Date();
    if (new Date(toIso) <= now) {
      setError("The end time is in the past. Please pick a later time or a future date.");
      return;
    }
    if (new Date(fromIso) <= now) {
      setError("The start time is in the past. Please pick a later time or a future date.");
      return;
    }
    try {
      await axios.post("/be/api/v1/lfg", {
        post: {
          plugin_id: pluginId,
          description,
          num_players_wanted: numPlayersWanted,
          experience_level: experienceLevel,
          available_from: slotsToUtcIso(availableDate, startSlot),
          available_to: slotsToUtcIso(availableDate, endSlot),
        },
      }, authOptions);
      setShowCreateForm(false);
      setDescription("Standard game");
      setNumPlayersWanted(1);
      setExperienceLevel("any");
      setAvailableDate(getTodayDate());
      setStartSlot(0);
      setEndSlot(95);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to create post");
    }
  };

  const handleJoin = async (postId) => {
    setError(null);
    try {
      const post = posts.find((p) => p.id === postId);
      const postFromSlot = utcToLocalSlot(post?.available_from);
      const dateStr = post?.available_from
        ? (() => { const d = new Date(post.available_from + (post.available_from.endsWith("Z") ? "" : "Z")); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })()
        : getTodayDate();
      const slotVal = joinSlot != null ? joinSlot : postFromSlot;
      await axios.post(`/be/api/v1/lfg/${postId}/respond`, {
        earliest_start: slotsToUtcIso(dateStr, slotVal),
      }, authOptions);
      setJoinPostId(null);
      setJoinSlot(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to join post");
    }
  };

  const handleLeave = async (postId) => {
    setError(null);
    try {
      await axios.delete(`/be/api/v1/lfg/${postId}/respond`, authOptions);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to leave post");
    }
  };

  const handleDelete = async (postId) => {
    setError(null);
    try {
      await axios.delete(`/be/api/v1/lfg/${postId}`, authOptions);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Failed to delete post");
    }
  };

  const handleToggleSubscribe = async () => {
    try {
      if (subscribed) {
        await axios.delete(`/be/api/v1/lfg/subscribe/${pluginId}`, authOptions);
        setSubscribed(false);
      } else {
        await axios.post(`/be/api/v1/lfg/subscribe/${pluginId}`, {}, authOptions);
        setSubscribed(true);
      }
    } catch (err) {
      console.log("LFG subscribe error", err);
    }
  };

  const hasJoined = (post) => {
    return post.responses?.some((r) => r.user_id === myUser?.id);
  };

  const isFull = (post) => {
    return (post.responses?.length || 0) >= post.num_players_wanted;
  };

  const getJoinSlotBounds = (post) => {
    const fromSlot = utcToLocalSlot(post.available_from);
    const toSlot = utcToLocalSlot(post.available_to);
    return { minSlot: fromSlot, maxSlot: toSlot };
  };

  return (
    <div className="w-full mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white text-lg">Looking for Game</h2>
        {isLoggedIn && (
          <div className="text-white text-sm flex items-center gap-2">
            <span>Email me new LFG posts</span>
            <ToggleSwitch checked={subscribed} onChange={handleToggleSubscribe} />
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-200 text-red-800 p-2 rounded mb-2 text-sm">
          {error}
        </div>
      )}

      {/* Post list */}
      <div className="space-y-2 mb-3">
        {posts.length === 0 && (
          <div className="text-gray-400 text-sm p-2">No active LFG posts for this game.</div>
        )}
        {posts.map((post) => {
          const bounds = getJoinSlotBounds(post);
          return (
            <div key={post.id} className="bg-gray-600-30 rounded-lg p-3 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-semibold">{post.user_alias}</span>
                  <span className="ml-2 text-sm text-gray-300">
                    {post.experience_level !== "any" && `[${post.experience_level}]`}
                  </span>
                </div>
                <span className="text-sm text-gray-300">
                  {(post.responses?.length || 0)}/{post.num_players_wanted} players
                </span>
              </div>

              {post.description && (
                <div className="text-sm mt-1 text-gray-200">{post.description}</div>
              )}

              <div className="text-sm text-white font-bold mt-1">
                {formatTimeRange(post.available_from, post.available_to)}
                <span className="font-normal text-gray-400 text-xs ml-1">{getShortTimezoneLabel()}</span>
              </div>

              {post.status === "filled" && post.confirmed_start_time && (
                <div className="text-sm text-green-400 mt-1">
                  Game confirmed for {formatDateTime(post.confirmed_start_time)}
                </div>
              )}

              {post.room_slug && (
                <div className="mt-2">
                  <Link
                    to={`/room/${post.room_slug}`}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm no-underline"
                  >
                    Join Room
                  </Link>
                </div>
              )}

              {/* Respondents */}
              {post.responses && post.responses.length > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  Joined: {post.responses.map((r) => r.user_alias).join(", ")}
                </div>
              )}

              {/* Actions */}
              {isLoggedIn && (
                <div className="mt-2 flex gap-2">
                  {!isFull(post) && !hasJoined(post) && post.user_id !== myUser?.id && (
                    <>
                      {joinPostId === post.id ? (
                        <div className="w-full">
                          <label className="text-xs block mb-1">Earliest you can start:</label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 whitespace-nowrap">{slotToTimeLabel(bounds.minSlot)}</span>
                            <input
                              type="range"
                              min={bounds.minSlot}
                              max={bounds.maxSlot}
                              step={1}
                              value={joinSlot != null ? joinSlot : bounds.minSlot}
                              onChange={(e) => setJoinSlot(parseInt(e.target.value))}
                              className="lfg-range-thumb flex-1"
                              style={{ accentColor: "#3b82f6" }}
                            />
                            <span className="text-xs text-gray-400 whitespace-nowrap">{slotToTimeLabel(bounds.maxSlot)}</span>
                          </div>
                          <div className="text-xs text-gray-300 text-center mt-1">
                            {slotToTimeLabel(joinSlot != null ? joinSlot : bounds.minSlot)}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleJoin(post.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => { setJoinPostId(null); setJoinSlot(null); }}
                              className="text-gray-400 hover:text-white text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setJoinPostId(post.id);
                            setJoinSlot(bounds.minSlot);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Join
                        </button>
                      )}
                    </>
                  )}
                  {hasJoined(post) && (
                    <button
                      onClick={() => handleLeave(post.id)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Leave
                    </button>
                  )}
                  {(post.user_id === myUser?.id || myUser?.admin) && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create post button / form */}
      {isLoggedIn && !showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-gray-600-30 hover:bg-red-600-30 text-white px-4 py-2 rounded-lg w-full"
        >
          I'm Looking for a Game
        </button>
      )}

      {showCreateForm && (
        <div className="bg-gray-600-30 rounded-lg p-4 text-white">
          <h3 className="text-md mb-3">Post LFG</h3>

          <div className="mb-2">
            <label className="block text-sm mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded p-2 text-black text-sm"
              rows={2}
              placeholder="What are you looking to play?"
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm mb-1">Players wanted</label>
            <input
              type="number"
              min={1}
              max={20}
              value={numPlayersWanted}
              onChange={(e) => setNumPlayersWanted(parseInt(e.target.value) || 1)}
              className="rounded p-2 text-black text-sm w-20"
            />
          </div>

          <div className="mb-2">
            <label className="block text-sm mb-1">Experience level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="rounded p-2 text-black text-sm"
            >
              {experienceLevels.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-2">
            <label className="block text-sm mb-1">Date</label>
            <input
              type="date"
              value={availableDate}
              min={getTodayDate()}
              onChange={(e) => setAvailableDate(e.target.value)}
              className="rounded p-2 text-black text-sm"
            />
          </div>

          <div className="mb-3">
            <label className="block text-sm mb-1">Available window</label>
            <TimeRangeSlider
              startSlot={startSlot}
              endSlot={endSlot}
              onStartChange={setStartSlot}
              onEndChange={setEndSlot}
            />
            <div className="text-xs text-gray-400 mt-1">
              Times shown in {timezoneLabel}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreatePost}
              disabled={numPlayersWanted < 1}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white px-4 py-2 rounded text-sm"
            >
              Post
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LfgSection;
