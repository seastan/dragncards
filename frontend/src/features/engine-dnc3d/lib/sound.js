// Sound effects for the dnc3d engine.
//
// Each clip lives in public/sounds/ and is decoded once then cached; every play
// uses a fresh AudioBufferSourceNode so rapid repeats don't cut each other off.

const SHUFFLE_URL = '/sounds/card-shuffle.mp3'; // pre-cropped slice of the source clip
const FLIP_URL    = '/sounds/flipcard.mp3';
const PICKUP_URL  = '/sounds/card-pickup.mp3';  // first 25% of "Card Deal 6"
const DROP_URL    = '/sounds/card-drop.mp3';    // "Card Deal 3"
const VOLUME      = 1.0;

let _ctx = null;
const _buffers = {}; // url -> Promise<AudioBuffer>, decoded once then cached

function getCtx() {
  if (_ctx) return _ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { _ctx = new AC(); } catch (e) { _ctx = null; }
  return _ctx;
}

function getBuffer(ctx, url) {
  if (!_buffers[url]) {
    _buffers[url] = fetch(url)
      .then(res => res.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .catch(err => { delete _buffers[url]; throw err; }); // allow a later retry
  }
  return _buffers[url];
}

// Plays a clip once. Safe to call repeatedly and safe when audio is
// blocked/unavailable.
function playSound(url, volume = VOLUME) {
  const ctx = getCtx();
  if (!ctx) return;
  // Autoplay policy: the context may start suspended until a user gesture. The
  // sounds fire from user-triggered actions, so a resume here normally succeeds.
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } }

  getBuffer(ctx, url).then(buffer => {
    const src  = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }).catch(() => { /* fetch/decode/playback failed — fail silently */ });
}

export function playShuffleSound() {
  playSound(SHUFFLE_URL);
}

export function playPickupSound() {
  playSound(PICKUP_URL, VOLUME * 1.3); // pickup is quieter than the other cues
}

export function playDropSound() {
  playSound(DROP_URL, VOLUME * 0.8);
}

// A single action can flip many cards in one reconcile tick (e.g. flipping a
// whole group). Collapse those into one sound rather than a cacophony of
// overlapping copies, while still allowing distinct flips a few frames apart.
let _lastFlipAt = 0;
const FLIP_DEBOUNCE_MS = 60;
export function playFlipSound() {
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (now - _lastFlipAt < FLIP_DEBOUNCE_MS) return;
  _lastFlipAt = now;
  playSound(FLIP_URL, VOLUME);
}
