import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import axios from "axios";
import { formatDistanceToNow, parseISO } from "date-fns";
import { GoClock, GoPerson, GoPlay, GoSearch, GoTrashcan } from "react-icons/go";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useProfile from "../../hooks/useProfile";
import useDataApi from "../../hooks/useDataApi";
import { useAuthOptions } from "../../hooks/useAuthOptions";
import { PatreonModal } from "../store/support/PatreonModal";

interface SavedGame {
  uuid: string;
  metadata: Record<string, any> | null;
  plugin_id: number;
  plugin_name: string | null;
  player_aliases: string[];
  updated_at: string;
}

// How long a deleted game can be restored before the delete is sent
const UNDO_MS = 6000;
const PAGE_SIZE = 20;

const formatAbsolute = (date: Date, timeZone?: string) => {
  try {
    return date.toLocaleString(undefined, { timeZone, dateStyle: "medium", timeStyle: "short" });
  } catch (e) {
    // Unknown timezone name saved in the profile
    return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
};

const formatValue = (value: any) =>
  typeof value === "object" ? JSON.stringify(value) : String(value);

const SavedGameCard: React.FC<{
  game: SavedGame;
  timeZone?: string;
  onLoad: () => void;
  onDelete: () => void;
}> = ({ game, timeZone, onLoad, onDelete }) => {
  const date = parseISO(game.updated_at);
  const metadata = Object.entries(game.metadata || {}).filter(([, value]) => value != null);

  return (
    <li className="flex flex-col sm:flex-row sm:items-start gap-3 bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-lg p-4 transition-colors duration-150">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
          <span className="font-semibold text-white truncate">
            {game.plugin_name || `Plugin #${game.plugin_id}`}
          </span>
          <span className="flex items-center text-xs text-gray-400" title={formatAbsolute(date, timeZone)}>
            <GoClock className="mr-1" />
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        </div>
        {game.player_aliases.length > 0 && (
          <div className="flex items-center mt-1 text-xs text-gray-400">
            <GoPerson className="mr-1 flex-shrink-0" />
            <span className="truncate">{game.player_aliases.join(", ")}</span>
          </div>
        )}
        {metadata.length > 0 && (
          <table className="w-full mt-3 text-sm border-t border-gray-700">
            <tbody>
              {metadata.map(([key, value]) => (
                <tr key={key} className="border-b border-gray-700 last:border-b-0">
                  <th scope="row" className="w-px py-1 pr-6 text-left font-normal text-gray-400 align-top whitespace-nowrap">
                    {key}
                  </th>
                  <td className="py-1 text-gray-100 [overflow-wrap:anywhere]">{formatValue(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onLoad}
          className="flex items-center px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium transition-colors duration-150"
        >
          <GoPlay className="mr-1" />
          Load
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          aria-label="Delete saved game"
          className="p-2 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors duration-150"
        >
          <GoTrashcan />
        </button>
      </div>
    </li>
  );
};

export const MySavedGames: React.FC = () => {
  const user = useProfile();
  const history = useHistory();
  const authOptions = useAuthOptions();
  const { data, isError, doFetchUrl, doFetchHash } = useDataApi<any>("", null, false, authOptions);
  const [search, setSearch] = useState("");
  const [pluginFilter, setPluginFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [hidden, setHidden] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const [showPatreon, setShowPatreon] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);
  const authOptionsRef = useRef(authOptions);
  authOptionsRef.current = authOptions;

  useEffect(() => {
    if (user?.id == null) return;
    doFetchUrl("/be/api/replays");
  }, [user?.id]);

  const commitDelete = async (uuid: string) => {
    try {
      await axios.delete("/be/api/replays/" + encodeURIComponent(uuid), authOptionsRef.current);
      // Non-supporters get their next most recent game back in the list
      doFetchHash(Date.now());
    } catch (e) {
      setHidden((h) => h.filter((u) => u !== uuid));
      setDeleteError(true);
    }
  };

  const flushPending = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const uuid = pendingRef.current;
    pendingRef.current = null;
    setPendingDelete(null);
    if (uuid) commitDelete(uuid);
  };

  // Send any delete still waiting on undo when leaving the page
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pendingRef.current) {
      axios.delete("/be/api/replays/" + encodeURIComponent(pendingRef.current), authOptionsRef.current);
    }
  }, []);

  const startDelete = (uuid: string) => {
    flushPending();
    setDeleteError(false);
    setHidden((h) => [...h, uuid]);
    pendingRef.current = uuid;
    setPendingDelete(uuid);
    timerRef.current = setTimeout(flushPending, UNDO_MS);
  };

  const undoDelete = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const uuid = pendingRef.current;
    pendingRef.current = null;
    setPendingDelete(null);
    setHidden((h) => h.filter((u) => u !== uuid));
  };

  const games: SavedGame[] = useMemo(
    () => (data?.data || []).filter((g: SavedGame) => !hidden.includes(g.uuid)),
    [data, hidden]
  );

  const plugins = useMemo(() => {
    const names = new Map<number, string>();
    games.forEach((g) => names.set(g.plugin_id, g.plugin_name || `Plugin #${g.plugin_id}`));
    return Array.from(names.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [games]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return games.filter((g) => {
      if (pluginFilter && String(g.plugin_id) !== pluginFilter) return false;
      if (!term) return true;
      const haystack = [
        g.plugin_name || "",
        ...g.player_aliases,
        ...Object.entries(g.metadata || {}).map(([k, v]) => `${k} ${v == null ? "" : formatValue(v)}`),
      ].join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [games, search, pluginFilter]);

  if (user == null) {
    return null;
  }

  const isSupporter = user.supporter_level >= 3;
  const showControls = games.length > 5 || plugins.length > 1;

  return (
    <div className="text-white mx-auto w-full p-4 overflow-y-auto" style={{ maxWidth: "800px" }}>
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-xl font-semibold">My Saved Games</h1>
        {data && <span className="text-sm text-gray-400">{games.length} saved</span>}
      </div>

      {!isSupporter && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-4 text-sm">
          <span className="flex-1 text-gray-300">
            You're seeing your 3 most recent saved games. Supporters keep every game they save.
          </span>
          <button
            type="button"
            onClick={() => setShowPatreon(true)}
            className="flex items-center justify-center px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors duration-150"
          >
            <FontAwesomeIcon icon={faHeart} className="text-pink-400 mr-2" />
            Become a supporter
          </button>
        </div>
      )}

      {showControls && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <GoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
              placeholder="Search saved games"
              className="w-full bg-gray-800 border border-gray-700 focus:border-gray-500 rounded pl-9 pr-3 py-1 text-sm text-white placeholder-gray-500 outline-none"
            />
          </div>
          {plugins.length > 1 && (
            <select
              value={pluginFilter}
              onChange={(e) => { setPluginFilter(e.target.value); setVisibleCount(PAGE_SIZE); }}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm text-white outline-none"
            >
              <option value="">All plugins</option>
              {plugins.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {deleteError && (
        <div className="bg-red-900 bg-opacity-40 border border-red-800 rounded-lg px-4 py-2 mb-4 text-sm text-red-200">
          Couldn't delete that saved game. Please try again.
        </div>
      )}

      {isError && !data ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center text-sm text-gray-300">
          Couldn't load your saved games.{" "}
          <button type="button" className="text-blue-400 hover:underline" onClick={() => doFetchHash(Date.now())}>
            Try again
          </button>
        </div>
      ) : !data ? (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-20 bg-gray-800 border border-gray-700 rounded-lg animate-pulse" />
          ))}
        </ul>
      ) : games.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
          <p className="text-gray-200 font-medium mb-1">No saved games yet</p>
          <p className="text-sm text-gray-400">Games you save will show up here so you can pick up where you left off.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center text-sm text-gray-400">
          No saved games match your search.
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {filtered.slice(0, visibleCount).map((game) => (
              <SavedGameCard
                key={game.uuid}
                game={game}
                timeZone={user.timezone || undefined}
                onLoad={() => history.push("/plugin/" + game.plugin_id + "/load/" + game.uuid)}
                onDelete={() => startDelete(game.uuid)}
              />
            ))}
          </ul>
          {filtered.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount(visibleCount + PAGE_SIZE)}
              className="w-full mt-3 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 text-sm text-gray-300 transition-colors duration-150"
            >
              Show more ({filtered.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}

      {pendingDelete && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-4 bg-gray-900 border border-gray-600 rounded-lg shadow-lg px-4 py-2 text-sm">
          <span className="text-gray-200">Saved game deleted</span>
          <button type="button" onClick={undoDelete} className="font-semibold text-blue-400 hover:text-blue-300">
            Undo
          </button>
        </div>
      )}

      <PatreonModal isOpen={showPatreon} isLoggedIn={true} closeModal={() => setShowPatreon(false)} />
    </div>
  );
};
export default MySavedGames;
