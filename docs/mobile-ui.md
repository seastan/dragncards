# Mobile UI (work in progress — `mobile-friendly` branch)

A **per-device** setting (Settings → *This device* → Mobile UI, stored in
`localStorage`, or `?mobile=1` / `?mobile=0` in the URL), so turning it on from
a phone doesn't switch the same account's desktop. It is available only when
the plugin defines `gameDef.mobileLayout`; otherwise *This device* says so and
offers no switch.

It replaces touch mode, which is now always off (`hooks/useMobileUI.js`); the
favourite hotkeys panel and the drag-for-favourites ring cover what its touch
bar did on the regular table. The touch mode code is left in place, unused. A
device that never set Mobile UI takes "on" from a profile that had touch mode
on, so touch mode users land in the mobile UI wherever their game has a mobile
layout.

On a touchscreen, for a game with a mobile layout, the room offers Mobile UI
once (`TouchModePrompt.js`), then
adding DragnCards to the home screen. Creating a room from a phone or tablet in
the browser first shows a full-screen install step (`lobby/InstallGate.js`)
with a "Continue in browser" way past it; in a room in the Android browser the
first tap goes full screen.

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
- One player's board on screen at a time (`observingPlayerN`). Swiping the top
  bar's player panel shows each player's stats and puts their hand in the hand
  row; *Look* on a player's panel, or a two-finger swipe across the table, puts
  their board on the table, sliding over from the side. A second finger landing
  during a card drag abandons the drag (the card goes home).
- The room's real layout is not touched; desktop players in the same room see
  no change.

## Writing a `mobileLayout`

Same shape as an entry of `gameDef.layouts`, with these differences:

| | |
|---|---|
| One layout for every player count | Shared regions are always shown. A region whose `groupId` contains `playerN` shows the board of the player currently on screen. You don't write separate 1/2/3/4-player mobile layouts. |
| `cardSize` | Measured in 1% of the **table area's height** (between the mobile top and bottom bars), which region positions are also fractions of, so a card fits its row the same on a phone or a tablet; width only changes how many fit across. With seven rows of 1/7 (≈14.3%), `cardSize: 12` leaves a little room in each. |
| `chat` | Optional and ignored; chat has its own panel. |
| `defaultFavorites` | Deprecated here: use the top-level `gameDef.defaultFavorites` (see Favourite hotkeys). Read when that's absent. The hotkeys a player starts with as favourites until they star or unstar one themselves. Entries are `"<tab>:<key>"`, the tab being the hotkeys sheet's: `token:<key>`, `card:<key>`, `game:<key>` or `dragn:<key>`. Entries matching no hotkey are skipped. LotR: `["game:W", "game:E", "token:1", "token:2", "token:3", "card:Q"]` (advance the round, reveal an encounter card, the resource, progress and damage tokens, commit / uncommit). |
| `hiddenPiles` | Groups kept off the table and shown as piles in the Piles drawer instead. Each entry is a groupId, or `{"groupId": ..., "showWhenEmpty": true}`: empty piles are left out unless marked, and a pile you drop the first card onto (a discard) needs the mark. `playerN` resolves to the player on screen. |
| `textBoxes` | As in desktop layouts. A box whose key also exists in the room's current layout shows that box's `label` and `visible` (which game actions update, e.g. LotR's `roundAdvancement` hint) at this box's own position and style; `syncContent: false` opts out. A visible box spanning the top edge (top 0, left 0, full width) reserves its height: the regions are squeezed into the space below it. Like the 3D table generally, only boxes with `hover: true` are drawn. |
| `region.perspective` | `"viewed"` (default) follows the on-screen player. `"self"` always means the viewer's own seat, for a region that should stay yours whoever you *Look* at. `"panel"` follows the player whose page the top bar's player panel shows, so swiping the panel changes it without moving the board: LotR's hand uses it (another player's hand is face down unless they've shown it). |
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
      "playerNHand":            {"groupId": "playerNHand",            "type": "fan",  "direction": "horizontal", "left": 0,    "top": "6/7", "width": 1,    "height": "1/7", "style": {"background": "rgba(0, 0, 0, 0.3)"}}
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

## Favourite hotkeys (every table)

Favourites are not mobile-only, and are saved on the account (per game, as
`plugin_settings[pluginId].favoriteHotkeys`, a JSON string since the server
appends lists when merging settings), so they follow a player between devices;
signed out, or before the account has a list, the device's copy is used. The
plugin's starting set is the top-level
`gameDef.defaultFavorites` (`["<tab>:<key>", ...]`; `mobileLayout.defaultFavorites`
is still read when that's absent). Players change them by starring
hotkeys.

- Regular table: View → *Favorite hotkeys* opens a draggable panel
  (`DesktopFavorites.js`), replacing the full hotkey list that menu item used to
  open (holding Tab still shows every hotkey). Click a game / engine hotkey to
  run it; click a token / card hotkey to switch it on, and it applies to every
  card clicked until the table is clicked (a blue pill says what's on). *Edit*
  lists every hotkey with a star.
- Dragging on empty table opens the favourites ring (the mobile radial menu);
  a plain click is still a click.
- A switched-on token / card action now applies to clicked cards in any mode,
  not just touch mode.

## Hidden piles drawer on the regular table

`DesktopHiddenPiles.js`, 3D renderer, Mobile UI off. Every group the layout
doesn't put on the table is a pile in a drawer on the right edge: piles with
cards by default, all of them with *Show all*. It slides out when the mouse, or
a card being dragged, reaches the table's right edge, and back when the pointer
leaves it (it stays while a menu it opened is up). It runs the table's full
height and scrolls with the wheel, a row at a time. Each pile's name, count,
and look / menu buttons are to its right. Resting on a pile for a second
spreads its cards over the top half of the table: every card whole, side by
side, wrapping onto as many rows as needed, scrolling when they don't fit.
Leaving the pile and the spread folds it back.

As in the mobile drawer, the piles are real (raised) table regions, so cards
drag onto and off them, including to and from the spread. Engine support:

- region option `hideLabel`: no label strip or count badge of its own;
- region option `grid` on a `fan` (with `direction: "vertical"`): the
  wrapping, non-overlapping layout, with drops landing between cards;
- `regionSlideX` values may be `{x, y}`: the drawer scrolls its piles by
  sliding them, without rebuilding the table.

The drawer is laid out on the 3D table's tilted surface, its right edge pulled
in so the magnified bottom stays on screen.

## The ☰ menu

Full screen (`MobileFullMenu.js`): the Menu / View / Builder menus and a
DragnCards section (Gesture Guide, home, account) as sections of square tiles
with icons. A tile with more options opens them as a page of its own, with a
back arrow, instead of a nested dropdown. These are the desktop menus
(`TopBarMenu` etc.) rendered as tiles: `Menu` / `SubMenu` / `MenuItem` in
`components/basic/Menu.tsx` switch to tiles inside `MenuTilesContext` and take
an optional `icon`; a tile without one uses its page's icon, so plugin-defined
options (Plugin Options, Clear table, ...) get a sensible one.

## Hotkeys without a keyboard

- **Card view → Hotkeys** lists the plugin's card hotkeys (`hotkeys.card`)
  and the engine's card ones (target, arrow, trigger ability); a tap runs one
  on that card and returns to the table.
- **Bottom bar → Hotkeys** has four tabs:
  - *Token* (`hotkeys.token` entries with a `tokenType`) and *Card* (`hotkeys.card`,
    action entries in `hotkeys.token`, and the engine's target / arrow): tap one
    to arm it. It then applies to every card you tap until you tap the table
    (like touch mode's armed button, but kept on the device rather than in the
    game, so it isn't logged and undo never re-arms it), and the bottom bar
    shows what's armed, with Undo and an × to disarm. An armed token also takes swipes
    on cards: up adds one, down removes one. A sideways drag on a card opens a
    slider above it (+1 right / −1 left, then a step per ~22px); letting go
    adds / removes that many.
  - *Game* (`hotkeys.game`) and *Dragn* (the engine's own): tap to run; the star
    adds one as a button to the favourites bar, which sits just above the
    bottom bar and is shown / hidden with the bottom bar's *Favorites* button.
    Favourites are saved per device and per plugin, the bar's on/off per device;
    until a player changes them, the plugin's `mobileLayout.defaultFavorites`
    apply.
  - Press on empty table: the favourites open in a ring around the finger
    straight away; drag toward one and release to run / arm it, come back to
    the middle to cancel. A press released without moving is a normal tap.
    Near a screen edge the ring is shifted inward to fit; the pick follows the
    direction the finger moves from where it pressed, so it still goes to the
    bubble the finger heads for.
- **Piles:** tapping a card in a pile (deck, discard, drawer pile) opens the
  pile's menu; its first option, *Select top card*, opens that card's view.

## Gesture Guide

`MobileGestureGuide.js`: a full-screen page with one card per gesture, each with
a small looping demo (`css/mobile-guide.css`) drawn with placeholder cards, so
it suits any plugin. Face-down cards use the plugin's first card back, and the
token demos its first token hotkey's image. The flick card only appears when
the plugin has `cardFling`.

- Opens by itself the first time the mobile UI is used on a device.
- Always reachable from the *Gesture Guide* tile in the ☰ menu, and from View →
  Preferences → This device.
- A dismissable banner at the bottom of the table offers it to a player who
  hasn't used the mobile UI for 30 days, or when `GUIDE_VERSION` has gone up
  since they last saw it: bump `GUIDE_VERSION` when gestures change.
- Hints that retire once you've shown you know the gesture:
  - turning the favourites bar on shows an alert that the table press reaches
    the same favourites, until the radial menu has been used once;
  - the radial menu shows "rearrange your favourites by holding and dragging
    them in the favourites bar" until you have reordered favourites, or used
    the ring 10 times.

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
