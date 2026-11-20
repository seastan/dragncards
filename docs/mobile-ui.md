# Mobile UI (work in progress — `mobile-friendly` branch)

A phone-first, portrait table, separate from touch mode. It is a **per-device**
setting (Settings → *This device* → Mobile UI, stored in `localStorage`, or
`?mobile=1` / `?mobile=0` in the URL), so turning it on from a phone doesn't
switch the same account's desktop.

Mobile UI only takes over when the plugin defines `gameDef.mobileLayout`.
Without one the regular table is shown.

## What changes

- Always the 3D (dnc3d) renderer, flat (0° tilt).
- **Top bar** (64px): ☰ and the shared counters (`topBarCounters.shared`) on the
  left half; the players (`TopBarUser`) on the right half, one per page, swiped
  sideways. ☰ drops down Menu / View / Builder; menus open on tap and nested
  menus expand in place.
- **Bottom bar**: *Piles* opens the hidden-piles drawer from the left: the
  layout's `hiddenPiles` as real piles you drag cards onto and off, each with
  its name, count, and browse / menu buttons. Four per page, with arrows past
  that. *Chat* slides chat/log up from the bottom.
- **Card tap** opens a full-screen sheet: the card on the top half, its menu
  options (scrollable) on the next third, and a *View table* button. Group menus
  use the same sheet with the group's name on top. No hover preview.
- **Browse** shows its fan at the top of the table, cards half a card apart; a
  sideways swipe scrolls it, dragging a card down out of it moves the card. The
  same swipe-to-scroll works on any row or fan that overflows.
- One player's board on screen at a time; *Look* on a player's panel switches
  to theirs (`observingPlayerN`).
- The room's real layout is not touched; desktop players in the same room see
  no change.

## Writing a `mobileLayout`

Same shape as an entry of `gameDef.layouts`, with these differences:

| | |
|---|---|
| One layout for every player count | Shared regions are always shown. A region whose `groupId` contains `playerN` shows the board of the player currently on screen. You don't write separate 1/2/3/4-player mobile layouts. |
| `cardSize` | Measured in 1% of the **table area's height** (between the mobile top and bottom bars), which region positions are also fractions of, so a card fits its row the same on a phone or a tablet; width only changes how many fit across. With seven rows of 1/7 (≈14.3%), `cardSize: 12` leaves a little room in each. |
| `chat` | Optional and ignored; chat has its own panel. |
| `hiddenPiles` | Groups kept off the table and shown as piles in the Piles drawer instead. Each entry is a groupId, or `{"groupId": ..., "showWhenEmpty": true}`: empty piles are left out unless marked, and a pile you drop the first card onto (a discard) needs the mark. `playerN` resolves to the player on screen. |
| `region.perspective` | `"viewed"` (default) follows the on-screen player. `"self"` always means the viewer's own seat — use it for your hand so it stays yours while you look at a teammate's board. |
| `region.syncVisibility` | If a mobile region's key also exists in the room's current layout, the mobile region copies that region's `visible` flag, so show/hide buttons (e.g. `TOGGLE_TABLE_BUTTON`) keep working. `false` opts out. |

Positions are fractions of the table area between the top and bottom bars,
exactly like desktop layouts.

### Example (LotR LCG, portrait)

Seven rows of 1/7 each: quest / active location / encounter deck and discard,
staging, engaged, three play rows (the last shared with your deck and
discard), and your hand. The other piles live in the drawer.

```json
{
  "mobileLayout": {
    "cardSize": 12,
    "rowSpacing": 3,
    "regions": {
      "sharedMainQuest":        {"groupId": "sharedMainQuest",        "type": "row",  "direction": "horizontal", "left": 0,    "top": 0,     "width": 0.3,  "height": "1/7"},
      "sharedActiveLocation":   {"groupId": "sharedActiveLocation",   "type": "row",  "direction": "horizontal", "left": 0.3,  "top": 0,     "width": 0.28, "height": "1/7"},
      "sharedEncounterDeck":    {"groupId": "sharedEncounterDeck",    "type": "pile", "direction": "horizontal", "left": 0.6,  "top": 0,     "width": 0.2,  "height": "1/7"},
      "sharedEncounterDiscard": {"groupId": "sharedEncounterDiscard", "type": "pile", "direction": "horizontal", "left": 0.8,  "top": 0,     "width": 0.2,  "height": "1/7"},
      "sharedStagingArea":      {"groupId": "sharedStagingArea",      "type": "row",  "direction": "horizontal", "left": 0,    "top": "1/7", "width": 1,    "height": "1/7", "style": {"background": "rgba(30, 0, 0, 0.3)"}},
      "playerNEngaged":         {"groupId": "playerNEngaged",         "type": "row",  "direction": "horizontal", "left": 0,    "top": "2/7", "width": 1,    "height": "1/7"},
      "playerNPlay1":           {"groupId": "playerNPlay1",           "type": "row",  "direction": "horizontal", "left": 0,    "top": "3/7", "width": 1,    "height": "1/7"},
      "playerNPlay2":           {"groupId": "playerNPlay2",           "type": "row",  "direction": "horizontal", "left": 0,    "top": "4/7", "width": 1,    "height": "1/7"},
      "playerNPlay3":           {"groupId": "playerNPlay3",           "type": "row",  "direction": "horizontal", "left": 0,    "top": "5/7", "width": 0.6,  "height": "1/7"},
      "playerNDeck":            {"groupId": "playerNDeck",            "type": "pile", "direction": "horizontal", "left": 0.6,  "top": "5/7", "width": 0.2,  "height": "1/7"},
      "playerNDiscard":         {"groupId": "playerNDiscard",         "type": "pile", "direction": "horizontal", "left": 0.8,  "top": "5/7", "width": 0.2,  "height": "1/7"},
      "playerNHand":            {"groupId": "playerNHand",            "type": "fan",  "direction": "horizontal", "left": 0,    "top": "6/7", "width": 1,    "height": "1/7", "perspective": "self", "style": {"background": "rgba(0, 0, 0, 0.3)"}}
    },
    "hiddenPiles": [
      "sharedEncounterDeck2",
      "sharedEncounterDiscard2",
      "sharedSetAside",
      "sharedVictory",
      "playerNSideboard",
      "sharedExtra1",
      "sharedExtra2",
      "sharedExtra3"
    ]
  }
}
```

Region keys matter for visibility sync, which matches by key: regions that
plugin buttons toggle (e.g. `sharedSetAside`, `sharedMap`) should reuse the
desktop key.

## Fling (`gameDef.cardFling`)

A card released while still moving fast (a flick of the finger) runs an action
list instead of being dropped, with `$ACTIVE_CARD` set to it. The card carries
on in the flick's direction, slows to a stop, and the action's result (e.g. a
discard) moves it on from there. If the action leaves the card where it was,
it slides home after ~1.5s. 3D renderer only; works on desktop too, but by
default only for touch.

```json
{"cardFling": {"actionList": [["DISCARD_CARD", "$ACTIVE_CARD"]]}}
```

| | |
|---|---|
| `actionList` | Action list (or an `actionLists` id) for a fling in any direction. |
| `up` / `down` / `left` / `right` | Per-direction action lists, overriding `actionList`. A direction with neither isn't a fling: the card just drops. |
| `minSpeed` | Release speed needed, px per second (default 1000; an ordinary drag is well under, a flick well over). |
| `touchOnly` | Default `true`: a fast mouse drag to a far region would otherwise often count. |

## Local testing from a phone

`npm start` with `HOST=0.0.0.0`, then open `http://<laptop-ip>:3000` on a phone
on the same network. The dev proxy (`src/setupProxy.js`) forwards the game
socket too, so only port 3000 needs to be reachable. Endpoint firewalls (e.g.
FortiClient's) can block incoming connections even with the VPN off; Chrome
DevTools device mode works regardless.

## Not done yet

- Opening the drawer on its own when a drag starts (it has to be open first:
  opening it adds table regions, which rebuilds the table, and that can't
  happen mid-drag).
- Double-tap → token sheet; tap-again-for-default-action is still on.
- Hold a player to peek at their board; overview of every board.
- Hotkeys in the menu; unread badge on Chat.
