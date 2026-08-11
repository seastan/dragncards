import React from "react";
import { useSelector } from "react-redux";
import { useGameL10n } from "./hooks/useGameL10n";
import { useSiteL10n } from "../../hooks/useSiteL10n";
import { useGetDefaultAction } from "./hooks/useGetDefaultAction";
import { useTouchAction } from "./hooks/useTouchAction";

// The "tap again to <action>" hint that touch mode puts on the active card.
// Rendered by both renderers: the 2D Card component, and the dnc3d token host
// portal (the only per-card DOM React owns in that renderer).
export const DefaultActionLabel = React.memo(({
    cardId,
    // dnc3d only: its host element is spun to match the card's game rotation, so
    // on an exhausted card the hint would read sideways. Cancelling that rotation
    // keeps the text upright, the same trick Token uses for its counters.
    counterRotate = false,
}) => {
    const l10n = useGameL10n();
    const siteL10n = useSiteL10n();
    const touchMode = useSelector(state => state?.playerUi?.userSettings?.touchMode);
    const isActive = useSelector(state => {return state?.playerUi?.activeCardId === cardId});
    const rotation = useSelector(state => state?.gameUi?.game?.cardById?.[cardId]?.rotation);
    const selectedTouchAction = useTouchAction();
    const getDefaultAction = useGetDefaultAction(cardId);
    const defaultAction = touchMode && isActive && (selectedTouchAction == null) ? getDefaultAction() : null;

    if (!defaultAction || defaultAction.label === "") return null;

    // Inset from the card edge rather than a full-width bar: it covers far less
    // art, and the rounded dark chrome matches the rest of the 3D UI. Sizes are
    // in dvh so the hint scales with the table the way cards do.
    //
    // Two rows, not one: action names like "Commit to the quest" don't come close
    // to fitting across a card, and on one line they truncated to an ellipsis.
    // Splitting the fixed "Tap to" off as a small eyebrow hands the whole width
    // to the part that actually varies, which then gets two lines of its own.
    const atBottom = defaultAction.position === "bottom";

    return (
        <div
            className="absolute w-full flex justify-center pointer-events-none"
            style={{
                [atBottom ? "bottom" : "top"]: "5%",
                left: 0,
                padding: "0 3%",
                boxSizing: "border-box",
            }}>
            <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.1dvh",
                maxWidth: "100%",
                padding: "0.5dvh 0.9dvh",
                borderRadius: "0.8dvh",
                background: "rgba(15, 23, 42, 0.92)",
                border: "1px solid rgba(74, 222, 128, 0.6)",
                boxShadow: "0 0.2dvh 0.8dvh rgba(0,0,0,0.65), 0 0 1dvh rgba(34,197,94,0.25)",
                color: "white",
                transform: counterRotate ? `rotate(${-(rotation || 0)}deg)` : undefined,
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35dvh",
                    fontSize: "1.05dvh",
                    fontWeight: 600,
                    lineHeight: 1,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.62)",
                    whiteSpace: "nowrap",
                }}>
                    <span style={{ fontSize: "1.15dvh", lineHeight: 1 }}>👆</span>
                    {siteL10n("touchTapTo")}
                </div>
                <div style={{
                    fontSize: "1.35dvh",
                    fontWeight: 700,
                    lineHeight: 1.15,
                    textAlign: "center",
                    // Two lines, then ellipsis — enough for every realistic action
                    // name without the hint growing tall enough to hide the art.
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    // Long unbroken words (some plugins use compound labels) would
                    // otherwise overflow the pill rather than wrap.
                    overflowWrap: "anywhere",
                }}>
                    {l10n(defaultAction.label)}
                </div>
            </div>
        </div>
    )
})
