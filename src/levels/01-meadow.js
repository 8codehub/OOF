/* Level 1 — Meadow  (≈ 90 seconds at default speed)
   Audio: src/audio/level_1.mp3 is auto-played by game.js if present. */
(window.LRLevels = window.LRLevels || []).push({
  // Level-select UI
  n: 1,
  name: 'Meadow',
  sub: 'Rolling hills',
  locked: false,
  stars: 3,

  // Game engine — 142 px/s × 90 s ≈ 12 780 px
  theme:  'meadow',
  speed:  142,
  gaps:   20,
  spikes: 8,
  saws:   2,
  len:    12800,
});
