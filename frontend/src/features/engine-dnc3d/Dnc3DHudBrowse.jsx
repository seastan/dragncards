import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useGameL10n } from '../engine/hooks/useGameL10n';
import { useGameDefinition } from '../engine/hooks/useGameDefinition';
import { useBrowseTopN } from '../engine/hooks/useBrowseTopN';
import { useDoActionList } from '../engine/hooks/useDoActionList';
import { usePlayerN } from '../engine/hooks/usePlayerN';
import { setValues } from '../store/gameUiSlice';
import { setDropdownMenu, setTyping } from '../store/playerUiSlice';
import { getParentCardsInGroup } from '../engine/functions/common';

const isNormalInteger = (val) => {
  const n = Math.floor(Number(val));
  return n !== Infinity && n === val && n >= 0;
};

export const Dnc3DHudBrowse = ({ onFilterChange }) => {
  const dispatch    = useDispatch();
  const gameL10n    = useGameL10n();
  const gameDef     = useGameDefinition();
  const playerN     = usePlayerN();
  const browseTopN  = useBrowseTopN();
  const doActionList = useDoActionList();

  const [searchForProperty, setSearchForProperty] = useState('All');
  const [searchForText, setSearchForText]         = useState('');

  const groupId        = useSelector(s => s?.gameUi?.game?.playerData?.[playerN]?.browseGroup?.id);
  const browseGroupTopN = useSelector(s => s?.gameUi?.game?.playerData?.[playerN]?.browseGroup?.topN);
  const group          = useSelector(s => s?.gameUi?.game?.groupById?.[groupId]);
  const game           = useSelector(s => s?.gameUi?.game);

  useEffect(() => {
    setSearchForProperty('All');
    setSearchForText('');
  }, [groupId]);

  // Mirror Browse.js filtering logic, producing an array of visible dc stack IDs.
  // Using dc stack IDs (not positional indices) keeps the engine filter call stable
  // even when this child effect fires before the parent's reconcile effect — the
  // engine matches by ID so there is no N→N-1 positional-index shift issue.
  const filteredStackIds = useMemo(() => {
    if (!group || !game || !groupId) return [];
    const stackIds    = group.stackIds || [];
    const numStacks   = stackIds.length;
    const parentCards = getParentCardsInGroup(game, groupId);

    let topNint = isNormalInteger(browseGroupTopN) ? parseInt(browseGroupTopN) : numStacks;
    if (topNint < 0 || topNint > numStacks) topNint = numStacks;
    let indices = [...Array(topNint).keys()];

    if (searchForProperty === 'Other') {
      indices = indices.filter(i => {
        const val    = parentCards[i]?.sides?.A?.[gameDef?.browse?.filterPropertySideA];
        const isOther = !gameDef?.browse?.filterValuesSideA?.includes(val);
        const visible = parentCards[i]?.peeking?.[playerN] || parentCards[i]?.currentSide === 'A';
        return stackIds[i] && visible && isOther;
      });
    } else if (searchForProperty !== 'All') {
      indices = indices.filter(i =>
        stackIds[i] &&
        parentCards[i]?.sides?.A?.[gameDef?.browse?.filterPropertySideA] === searchForProperty &&
        (parentCards[i]?.peeking?.[playerN] || parentCards[i]?.currentSide === 'A')
      );
    }

    if (searchForText) {
      const props = gameDef?.browse?.textPropertiesSideA || [];
      indices = indices.filter(i => {
        const card    = parentCards[i]?.sides?.A;
        const visible = parentCards[i]?.peeking?.[playerN] || parentCards[i]?.currentSide === 'A';
        return stackIds[i] && visible &&
          props.some(p => card?.[p]?.toLowerCase().includes(searchForText.toLowerCase()));
      });
    }

    return indices.map(i => stackIds[i]);
  }, [group, game, groupId, browseGroupTopN, searchForProperty, searchForText, gameDef, playerN]);

  useEffect(() => {
    onFilterChange?.(filteredStackIds);
  }, [filteredStackIds, onFilterChange]);

  if (!group || !groupId) return null;

  const stackIds = group.stackIds || [];
  const numStacks = stackIds.length;

  const isPeeking = stackIds.some(stackId => {
    const cardId = game?.stackById?.[stackId]?.cardIds?.[0];
    return cardId && game?.cardById?.[cardId]?.peeking?.[playerN];
  });

  const filterButtons = gameDef?.browse?.filterValuesSideA;
  if (!filterButtons) return null;
  const allFilterButtons = ['All', ...filterButtons, 'Other'];
  const pairedFilterButtons = allFilterButtons.reduce((acc, curr, i) => {
    if (i % 2 === 0) acc.push([curr, allFilterButtons[i + 1]]);
    return acc;
  }, []);

  const stopPeekingTopCard = () => {
    if (!numStacks) return;
    const cardId = game?.stackById?.[stackIds[0]]?.cardIds?.[0];
    if (!cardId) return;
    dispatch(setValues({ updates: [['game', 'cardById', cardId, 'peeking', playerN, false]] }));
  };

  const handleCloseClick = (option) => {
    if (option === 'shuffle') {
      doActionList([
        ['LOG', '$ALIAS_N', ' closed ', gameL10n(group.label) + '.'],
        ['STOP_LOOKING', '$PLAYER_N'],
        ['LOG', '$ALIAS_N', ' shuffled ', gameL10n(group.label) + '.'],
        ['SHUFFLE_GROUP', groupId],
      ], 'Closed and shuffled ' + group.label);
      if (group?.onCardEnter?.currentSide === 'B') stopPeekingTopCard();
    } else if (option === 'order') {
      doActionList([
        ['LOG', '$ALIAS_N', ' closed ', gameL10n(group.label) + '.'],
        ['STOP_LOOKING', '$PLAYER_N'],
      ], 'Closed ' + group.label);
      if (group?.onCardEnter?.currentSide === 'B') stopPeekingTopCard();
    } else if (option === 'peeking') {
      doActionList([
        ['LOG', '$ALIAS_N', ' is still peeking at ', gameL10n(group.label) + '.'],
        ['STOP_LOOKING', '$PLAYER_N', 'keepPeeking'],
      ], 'Kept peeking at ' + group.label);
    }
  };

  const handleBarsClick = (e) => {
    e.stopPropagation();
    dispatch(setDropdownMenu({ type: 'group', group, title: gameL10n(gameDef?.groups?.[groupId]?.label) }));
  };

  const darkBg  = '#111827';
  const midBg   = '#1f2937';
  const hoverBg = '#374151';

  // Size unit: all HUD dimensions scale with viewport height via the --hud-u
  // custom property set on the root container (1 unit ≈ 1px at a 1000px-tall
  // viewport). u(n) keeps the prior px numbers readable while making the whole
  // HUD proportional to the table as it resizes; tune --hud-u to rescale it all.
  // (1px hairline borders/dividers stay literal px so they don't blur.)
  const u = (n) => `calc(${n} * var(--hud-u))`;

  const btnStyle = (active) => ({
    padding: `${u(5)} ${u(10)}`, borderRadius: u(5), cursor: 'pointer',
    background: active ? '#7f1d1d' : midBg,
    border: active ? '1px solid #ef4444' : '1px solid transparent',
    color: 'white', fontSize: u(12), textAlign: 'center', flex: '1 1 0',
    transition: 'background 0.1s',
  });

  const closeBtnStyle = {
    padding: `${u(5)} ${u(10)}`, borderRadius: u(5), cursor: 'pointer',
    background: midBg, border: '1px solid transparent',
    color: 'white', fontSize: u(12), textAlign: 'center', width: '100%',
    transition: 'background 0.1s',
  };

  return (
    <div style={{
      '--hud-u': '0.1dvh',
      position: 'absolute', bottom: `calc(${u(8)} + 5%)`, left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(22, 22, 28, 0.97)', color: 'white',
      borderRadius: u(10), fontFamily: 'system-ui', fontSize: u(13),
      zIndex: 10000, width: u(640), maxWidth: '92vw',
      boxShadow: `0 ${u(4)} ${u(24)} rgba(0,0,0,0.85)`, userSelect: 'none',
      border: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: u(10),
        padding: `${u(7)} ${u(12)}`,
        background: 'rgba(50, 50, 58, 0.9)',
        borderTopLeftRadius: u(10), borderTopRightRadius: u(10),
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontWeight: 'bold', fontSize: u(14) }}>{gameL10n(group.label)}</span>
        <div
          onClick={handleBarsClick}
          style={{
            cursor: 'pointer', fontSize: u(11), padding: `${u(3)} ${u(8)}`,
            borderRadius: u(4), background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
        >
          More Options
        </div>
        <div style={{ flex: '1 1 auto' }} />
        <label style={{ fontSize: u(11), opacity: 0.6, flexShrink: 0 }}>Looking at side:</label>
        {[['A', 'All'], ['B', 'None']].map(([label, topNValue]) => {
          const active = label === 'A' ? isPeeking : !isPeeking;
          return (
            <div key={label} onClick={() => browseTopN(groupId, topNValue)} style={{
              padding: `${u(3)} ${u(12)}`, borderRadius: u(4), cursor: 'pointer',
              background: active ? '#1d4ed8' : 'rgba(255,255,255,0.08)',
              border: active ? '1px solid #3b82f6' : '1px solid transparent',
              fontSize: u(13), fontWeight: 'bold', flexShrink: 0, transition: 'background 0.1s',
            }}>
              {label}
            </div>
          );
        })}
      </div>

      {/* Search row */}
      <div style={{ padding: `${u(6)} ${u(10)}`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <input
          type="text"
          placeholder="🔍  Search cards..."
          value={searchForText}
          style={{
            background: darkBg, border: 'none', color: 'white',
            padding: `${u(5)} ${u(10)}`, borderRadius: u(4), fontSize: u(12),
            outline: 'none', cursor: 'text', width: '100%', boxSizing: 'border-box', opacity: 0.9,
          }}
          onFocus={() => dispatch(setTyping(true))}
          onBlur={() => dispatch(setTyping(false))}
          onChange={e => setSearchForText(e.target.value)}
        />
      </div>

      {/* Body: filter buttons + close actions */}
      <div style={{ display: 'flex', gap: '0', padding: `${u(8)} ${u(10)}`, alignItems: 'flex-start' }}>
        {/* Filter button grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: u(4), flex: '1 1 auto' }}>
          {pairedFilterButtons.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex', gap: u(4) }}>
              {row.map((item, itemIndex) => item != null && (
                <div
                  key={itemIndex}
                  style={btnStyle(searchForProperty === item)}
                  onClick={() => setSearchForProperty(item)}
                  onMouseEnter={e => { if (searchForProperty !== item) e.currentTarget.style.background = hoverBg; }}
                  onMouseLeave={e => { if (searchForProperty !== item) e.currentTarget.style.background = midBg; }}
                >
                  {gameL10n(item)}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', margin: `0 ${u(10)}`, alignSelf: 'stretch' }} />

        {/* Close actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: u(4), flex: '0 0 auto', width: u(100) }}>
          <div style={{ fontSize: u(10), opacity: 0.5, textAlign: 'center', marginBottom: u(1), textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Close &amp;
          </div>
          {[['Shuffle', 'shuffle'], ['Keep order', 'order'], ['Keep peeking', 'peeking']].map(([label, opt]) => (
            <div
              key={opt}
              style={closeBtnStyle}
              onClick={() => handleCloseClick(opt)}
              onMouseEnter={e => e.currentTarget.style.background = hoverBg}
              onMouseLeave={e => e.currentTarget.style.background = midBg}
            >
              {gameL10n(label)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
