/**
 * R3FBrowsePanel - HTML overlay for browse controls in 3D mode
 * Rendered as a sibling to the Canvas (not inside it)
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useBrowseTopN } from '../../engine/hooks/useBrowseTopN';
import { useGameL10n } from '../../engine/hooks/useGameL10n';
import { useGameDefinition } from '../../engine/hooks/useGameDefinition';
import { useDoActionList } from '../../engine/hooks/useDoActionList';
import { setValues } from '../../store/gameUiSlice';
import { setDropdownMenu, setTyping } from '../../store/playerUiSlice';

export const R3FBrowsePanel = ({
  searchForProperty,
  setSearchForProperty,
  searchForText,
  setSearchForText,
  resetFilters,
}) => {
  const dispatch = useDispatch();
  const gameL10n = useGameL10n();
  const gameDef = useGameDefinition();
  const playerN = useSelector(state => state?.playerUi?.playerN);
  const groupId = useSelector(state => state?.gameUi?.game?.playerData?.[playerN]?.browseGroup?.id);
  const group = useSelector(state => state?.gameUi?.game?.groupById?.[groupId]);
  const game = useSelector(state => state?.gameUi?.game);
  const browseTopN = useBrowseTopN();
  const isPeeking = group?.stackIds?.some(stackId => {
    const cardId = game?.stackById?.[stackId]?.cardIds?.[0];
    return cardId && game?.cardById?.[cardId]?.peeking?.[playerN];
  }) ?? false;
  const doActionList = useDoActionList();

  if (!group || !groupId) return null;

  const stackIds = group?.stackIds || [];
  const numStacks = stackIds.length;

  var filterButtons = gameDef?.browse?.filterValuesSideA;
  if (!filterButtons) return null;
  filterButtons = ["All", ...filterButtons, "Other"];
  var pairedFilterButtons = filterButtons.reduce((acc, curr, i) => {
    if (i % 2 === 0) {
      acc.push([curr, filterButtons[i + 1]]);
    }
    return acc;
  }, []);

  const handleBarsClick = (event) => {
    event.stopPropagation();
    const dropdownMenu = {
      type: "group",
      group: group,
      title: gameL10n(gameDef.groups[groupId].label)
    };
    dispatch(setDropdownMenu(dropdownMenu));
  };

  const stopPeekingTopCard = () => {
    if (numStacks === 0) return null;
    const stackId0 = stackIds[0];
    const cardIds = game["stackById"][stackId0]["cardIds"];
    const cardId0 = cardIds[0];
    const updates = [["game", "cardById", cardId0, "peeking", playerN, false]];
    dispatch(setValues({ updates: updates }));
  };

  const handleCloseClick = (option) => {
    if (playerN) {
      if (option === "shuffle") closeAndShuffle();
      else if (option === "order") closeAndOrder();
      else if (option === "peeking") closeAndPeeking();
    }
    resetFilters();
  };

  const closeAndShuffle = () => {
    const actionList = [
      ["LOG", "$ALIAS_N", " closed ", gameL10n(group.label) + "."],
      ["STOP_LOOKING", "$PLAYER_N"],
      ["LOG", "$ALIAS_N", " shuffled ", gameL10n(group.label) + "."],
      ["SHUFFLE_GROUP", groupId]
    ];
    doActionList(actionList, "Closed and shuffled group " + group.label);
    if (group?.onCardEnter?.currentSide === "B") stopPeekingTopCard();
  };

  const closeAndOrder = () => {
    const actionList = [
      ["LOG", "$ALIAS_N", " closed ", gameL10n(group.label) + "."],
      ["STOP_LOOKING", "$PLAYER_N"],
    ];
    doActionList(actionList, "Closed and ordered group " + group.label);
    if (group?.onCardEnter?.currentSide === "B") stopPeekingTopCard();
  };

  const closeAndPeeking = () => {
    const actionList = [
      ["LOG", "$ALIAS_N", " is still peeking at ", gameL10n(group.label) + "."],
      ["STOP_LOOKING", "$PLAYER_N", "keepPeeking"]
    ];
    doActionList(actionList, "Closed and kept peeking at group " + group.label);
  };

  const handleInputTyping = (event) => {
    setSearchForText(event.target.value);
  };

  const darkBg = '#111827';
  const midBg = '#1f2937';
  const hoverBg = '#374151';

  const controlStyle = {
    background: darkBg,
    border: 'none',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
  };

  const btnStyle = (active) => ({
    padding: '5px 10px',
    borderRadius: '5px',
    cursor: 'pointer',
    background: active ? '#7f1d1d' : midBg,
    border: active ? '1px solid #ef4444' : '1px solid transparent',
    color: 'white',
    fontSize: '12px',
    textAlign: 'center',
    flex: '1 1 0',
    transition: 'background 0.1s',
  });

  const closeBtnStyle = {
    padding: '5px 10px',
    borderRadius: '5px',
    cursor: 'pointer',
    background: midBg,
    border: '1px solid transparent',
    color: 'white',
    fontSize: '12px',
    textAlign: 'center',
    width: '100%',
    transition: 'background 0.1s',
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '8px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(22, 22, 28, 0.97)',
      color: 'white',
      borderRadius: '10px',
      fontFamily: 'system-ui',
      fontSize: '13px',
      zIndex: 100,
      width: '640px',
      maxWidth: '92vw',
      boxShadow: '0 4px 24px rgba(0,0,0,0.85)',
      userSelect: 'none',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>

      {/* Header: group name + peek control */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '7px 12px',
        background: 'rgba(50, 50, 58, 0.9)',
        borderTopLeftRadius: '10px',
        borderTopRightRadius: '10px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
          {gameL10n(group.label)}
        </span>
        <div
          onClick={handleBarsClick}
          style={{
            cursor: 'pointer',
            fontSize: '11px',
            padding: '3px 8px',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)',
            flexShrink: 0,
            userSelect: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
        >
          More Options
        </div>
        <div style={{ flex: '1 1 auto' }} />
        <label style={{ fontSize: '11px', opacity: 0.6, flexShrink: 0 }}>Looking at side:</label>
        {[["A", "All"], ["B", "None"]].map(([label, topNValue]) => {
          const isActive = label === "A" ? isPeeking : !isPeeking;
          return (
            <div
              key={label}
              onClick={() => browseTopN(group.id, topNValue)}
              style={{
                padding: '3px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                background: isActive ? '#1d4ed8' : 'rgba(255,255,255,0.08)',
                border: isActive ? '1px solid #3b82f6' : '1px solid transparent',
                fontSize: '13px',
                fontWeight: 'bold',
                flexShrink: 0,
                transition: 'background 0.1s',
              }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Search row */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <input
          type="text"
          placeholder="🔍  Search cards..."
          value={searchForText}
          style={{
            ...controlStyle,
            cursor: 'text',
            width: '100%',
            boxSizing: 'border-box',
            padding: '5px 10px',
            background: darkBg,
            opacity: 0.9,
          }}
          onFocus={() => dispatch(setTyping(true))}
          onBlur={() => dispatch(setTyping(false))}
          onChange={handleInputTyping}
        />
      </div>

      {/* Body: filter buttons + close actions */}
      <div style={{ display: 'flex', gap: '0', padding: '8px 10px', alignItems: 'flex-start' }}>

        {/* Filter buttons grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 auto' }}>
          {pairedFilterButtons.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex', gap: '4px' }}>
              {row.map((item, itemIndex) => (
                item != null && (
                  <div
                    key={itemIndex}
                    style={btnStyle(searchForProperty === item)}
                    onClick={() => setSearchForProperty(item)}
                    onMouseEnter={e => { if (searchForProperty !== item) e.currentTarget.style.background = hoverBg; }}
                    onMouseLeave={e => { if (searchForProperty !== item) e.currentTarget.style.background = midBg; }}
                  >
                    {gameL10n(item)}
                  </div>
                )
              ))}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 10px', alignSelf: 'stretch' }} />

        {/* Close actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '0 0 auto', width: '100px' }}>
          <div style={{ fontSize: '10px', opacity: 0.5, textAlign: 'center', marginBottom: '1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Close &
          </div>
          {[["Shuffle", "shuffle"],
            ["Keep order", "order"],
            ["Keep peeking", "peeking"]
          ].map((row, rowIndex) => {
            if (!playerN && row[1] === "shuffle") return null;
            if (!playerN && row[1] === "peeking") return null;
            return (
              <div
                key={rowIndex}
                style={closeBtnStyle}
                onClick={() => handleCloseClick(row[1])}
                onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                onMouseLeave={e => e.currentTarget.style.background = midBg}
              >
                {gameL10n(row[0])}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default R3FBrowsePanel;
