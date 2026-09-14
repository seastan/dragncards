import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle, faHeart } from "@fortawesome/free-solid-svg-icons";
import { formatBytes } from "./formatBytes";
import { tones } from "./tones";

const Meter = ({ label, used, max, unit }) => {
  const ratio = max > 0 ? Math.min(used / max, 1) : 0;
  const nearlyFull = ratio >= 0.9;
  const full = ratio >= 1;

  return (
    <div className="flex-1" style={{ minWidth: 140 }}>
      <div className="flex justify-between text-xs text-gray-300 mb-1">
        <span>{label}</span>
        <span className={full ? "text-red-400" : nearlyFull ? "text-yellow-400" : ""}>
          {unit === "bytes"
            ? `${formatBytes(used)} of ${formatBytes(max)}`
            : `${used.toLocaleString()} of ${max.toLocaleString()}`}
        </span>
      </div>
      {/* Inline styles: the app ships a prebuilt Tailwind file, so utility
          classes no existing component already uses are simply not defined. */}
      <div
        className="w-full rounded overflow-hidden"
        style={{ height: 8, backgroundColor: "#111827" }}
      >
        <div
          className="h-full rounded"
          style={{
            width: `${Math.max(ratio * 100, used > 0 ? 2 : 0)}%`,
            backgroundColor: full ? "#ef4444" : nearlyFull ? "#eab308" : "#22c55e",
          }}
        />
      </div>
    </div>
  );
};

// Rendered as a real link only when there is something to open. The manager is
// also mounted inside a modal with no Patreon handler, and a button that looks
// clickable but does nothing is worse than plain text.
const SupportLink = ({ onClick, className, children }) =>
  onClick ? (
    <button
      type="button"
      className={className}
      style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer", color: "inherit" }}
      onClick={onClick}
    >
      {children}
    </button>
  ) : (
    <span>{children}</span>
  );

export const QuotaBar = ({ quota, onSupportClick }) => {
  if (!quota) return null;

  return (
    <div className="rounded-lg bg-gray-800 p-3 mb-3">
      <div className="flex gap-4 flex-wrap">
        <Meter label="Images" used={quota.image_count} max={quota.max_files} unit="count" />
        <Meter label="Storage" used={quota.total_bytes} max={quota.max_bytes} unit="bytes" />
      </div>

      {quota.over_quota && (
        <div className="mt-3 flex items-start gap-2 rounded p-2 text-xs" style={tones.error}>
          <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5" />
          <div>
            You are over your limit, so new uploads are paused. Your existing images are
            still being served.
            {quota.prune_at && (
              <>
                {" "}
                Images uploaded most recently will be removed after{" "}
                <span className="font-semibold">
                  {new Date(quota.prune_at).toLocaleDateString()}
                </span>{" "}
                unless you delete some or{" "}
                <SupportLink onClick={onSupportClick} className="underline">
                  increase your support level
                </SupportLink>
                .
              </>
            )}
          </div>
        </div>
      )}

      {!quota.storage_ready && (
        <div className="mt-3 rounded p-2 text-xs" style={tones.error}>
          Image hosting is not available on this server right now.
        </div>
      )}

      {quota.storage_ready && quota.free_space_low && (
        <div className="mt-3 rounded p-2 text-xs" style={tones.warning}>
          The server is low on disk space, so uploads are paused for everyone.
        </div>
      )}

      {!quota.over_quota && quota.supporter_level < 10 && (
        <div className="mt-2 text-xs text-gray-400">
          <SupportLink onClick={onSupportClick} className="hover:text-red-400">
            <FontAwesomeIcon icon={faHeart} className="text-pink-400 mr-1" />
            Supporters get more image hosting.
          </SupportLink>
        </div>
      )}
    </div>
  );
};

export default QuotaBar;
