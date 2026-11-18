# Mobile UI (work in progress — `mobile-friendly` branch)

A phone-first, portrait table, separate from touch mode. It is a **per-device**
setting (Settings → *This device* → Mobile UI, stored in `localStorage`, or
`?mobile=1` / `?mobile=0` in the URL), so turning it on from a phone doesn't
switch the same account's desktop.

Mobile UI only takes over when the plugin defines `gameDef.mobileLayout`.
Without one the regular table is shown.

## What changes

- Always rendered with the 3D (dnc3d) renderer.
- The sidebar, top bar, touch bar and on-table chat are replaced by one 44px
  strip: a menu button (reveals the regular top bar), one chip per player, and
  a chat button that slides chat/log up from the bottom.
- Only one player's board is on screen at a time. Tapping a player chip puts
  their board up (it sets `observingPlayerN`, the same thing the desktop top bar
  does, minus the "started observing" chat line).
- The room's real layout is not touched; desktop players in the same room see
  no change.

## Writing a `mobileLayout`

Same shape as an entry of `gameDef.layouts`, with these differences:

| | |
|---|---|
| One layout for every player count | Shared regions are always shown. A region whose `groupId` contains `playerN` shows the board of the player currently on screen. You don't write separate 1/2/3/4-player mobile layouts. |
| `cardSize` | Measured in 1% of the screen's **shorter side** (the width, in portrait), not 1% of the height. `cardSize: 22` → a card about 22% of the screen width tall, so about six cards fit across a row. |
| `chat` | Optional and ignored; chat has its own panel. |
| `region.perspective` | `"viewed"` (default) follows the on-screen player. `"self"` always means the viewer's own seat — use it for your hand, deck and discard so they stay yours while you look at a teammate's board. |
| `region.syncVisibility` | If a mobile region's key also exists in the room's current layout, the mobile region copies that region's `visible` flag, so show/hide buttons (e.g. `TOGGLE_TABLE_BUTTON`) keep working. `false` opts out. |

Positions are fractions of the table area below the strip, exactly like desktop
layouts.

### Example (LotR LCG, portrait)

Six rows of 1/6 each: quest/encounter, staging, engaged, two play rows, and
your own hand/deck/discard pinned to the bottom.

```json
{
  "mobileLayout": {
    "cardSize": 22,
    "rowSpacing": 3,
    "regions": {
      "sharedMainQuest":        {"groupId": "sharedMainQuest",        "type": "row",  "direction": "horizontal", "left": 0,    "top": 0,     "width": 0.24, "height": "1/6"},
      "sharedActiveLocation":   {"groupId": "sharedActiveLocation",   "type": "row",  "direction": "horizontal", "left": 0.24, "top": 0,     "width": 0.22, "height": "1/6"},
      "sharedEncounterDeck":    {"groupId": "sharedEncounterDeck",    "type": "pile", "direction": "horizontal", "left": 0.6,  "top": 0,     "width": 0.2,  "height": "1/6"},
      "sharedEncounterDiscard": {"groupId": "sharedEncounterDiscard", "type": "pile", "direction": "horizontal", "left": 0.8,  "top": 0,     "width": 0.2,  "height": "1/6"},
      "sharedStagingArea":      {"groupId": "sharedStagingArea",      "type": "row",  "direction": "horizontal", "left": 0,    "top": "1/6", "width": 1,    "height": "1/6", "style": {"background": "rgba(30, 0, 0, 0.3)"}},
      "playerNEngaged":         {"groupId": "playerNEngaged",         "type": "row",  "direction": "horizontal", "left": 0,    "top": "2/6", "width": 1,    "height": "1/6"},
      "playerNPlay1":           {"groupId": "playerNPlay1",           "type": "row",  "direction": "horizontal", "left": 0,    "top": "3/6", "width": 1,    "height": "1/6"},
      "playerNPlay2":           {"groupId": "playerNPlay2",           "type": "row",  "direction": "horizontal", "left": 0,    "top": "4/6", "width": 0.8,  "height": "1/6"},
      "playerNEvent":           {"groupId": "playerNEvent",           "type": "row",  "direction": "horizontal", "left": 0.8,  "top": "4/6", "width": 0.2,  "height": "1/6"},
      "playerNHand":            {"groupId": "playerNHand",            "type": "fan",  "direction": "horizontal", "left": 0,    "top": "5/6", "width": 0.6,  "height": "1/6", "perspective": "self", "style": {"background": "rgba(0, 0, 0, 0.3)"}},
      "playerNDeck":            {"groupId": "playerNDeck",            "type": "pile", "direction": "horizontal", "left": 0.6,  "top": "5/6", "width": 0.2,  "height": "1/6", "perspective": "self"},
      "playerNDiscard":         {"groupId": "playerNDiscard",         "type": "pile", "direction": "horizontal", "left": 0.8,  "top": "5/6", "width": 0.2,  "height": "1/6", "perspective": "self"}
    }
  }
}
```

Note the region keys: `playerNEngaged` here vs `player1Engaged` in the desktop
2-player layout. Visibility sync matches by key, so regions that plugin buttons
toggle (e.g. `sharedSetAside`, `sharedMap`) should reuse the desktop key.

## Not done yet

- Hand dock that tucks partly off screen and lifts on tap/swipe.
- Pile drawers (decks/discards off screen), with drop targets that appear while
  dragging.
- Card gestures: tap → action strip with the default action as its main button
  (replacing "tap the active card again"); double-tap → token sheet; hold →
  full-screen card preview.
- Hold a player chip to peek at their board; swipe between boards; overview of
  every board.
- Action menu with the plugin's touch-bar "game" actions and a searchable list
  of hotkeys.
- Unread badge on the chat button.
