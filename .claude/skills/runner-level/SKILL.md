---
name: runner-level
description: Build or edit a Runner game level. Use whenever working on files in src/levels/ or the per-theme background in src/game.js — covers the level object contract, the z-index world layering, the intro/run/win lifecycle, and the parallax conventions. Level 1 (src/levels/01-meadow.js, theme "nyc") is the reference example.
---

# Runner level skill

A Runner level is a self-contained IIFE in `src/levels/NN-name.js` that pushes
one level object onto the global `window.LRLevels` array. The engine
(`src/game.js`) owns the fox, physics, camera, input (ink drawing), HUD and the
per-theme background; the level object only adds level-specific config,
scenery, and cutscenes.

**Level 1 — `src/levels/01-meadow.js` (theme `"nyc"`, "New York / The Escape") is
the canonical example. Mirror its structure when building or fixing any level.**

## World layering (z-index, front → back)

Draw and reason about every scene as these layers, front (nearest the player,
fastest parallax, highest z) to back (farthest, slowest, lowest z):

1. **Fox / main character** — owned by the engine, runs on the ground. Front-most gameplay layer.
2. **Ground** — the strip the fox runs on (`world.baseY`). Engine-drawn; leave as-is unless the level needs it changed.
3. **Fast-moving background (higher z, nearer)** — foreground scenery that scrolls faster, e.g. the Statue of Liberty in `nyc`. Drawn after the slow layer so it sits in front.
4. **Slow-moving background (lowest z, farthest)** — distant skyline / hills. Scrolls slowest and just slides; it must never morph.

Closer layers move faster and are drawn later (on top). Keep parallax fraction
and draw order consistent with this ordering.

## Parallax: layers slide, they never morph

Backgrounds are tiled by `skyline()` / `pines()` / `ridges()` in `src/game.js`,
positioned by `para(f) = -(camX * f)` — larger `f` = faster = nearer.

**Each repeated element's shape is pinned to a GLOBAL world index `k`, not the
on-screen loop index.** Height = `f(k)` via `imod(k*C, M)`, and screen
`x = k*unit - scroll` where `scroll = -off`. This guarantees element `k` keeps
the same height and only slides as the camera moves. Deriving shape from the
on-screen index (the old bug) makes the whole layer's heights jump every time
the tiling wraps — buildings "change" instead of moving. Never reintroduce
that; keep shape a pure function of `k`.

## The level object contract

```js
(window.LRLevels = window.LRLevels || []).push({
  n: 1, name: 'New York', sub: 'The Escape', locked: false, stars: 3,
  theme: 'nyc',                 // selects the background in game.js drawBackground()
  speed: 142, gaps: 9, spikes: 3, saws: 1, len: 6150,  // difficulty / length

  onBuild(w)            { /* init level state on w (e.g. w.nyc = {...}); place scenery, set w.camOffset */ },
  onUpdate(w, dt)       { /* per-frame: drive intro cutscene, then run, then win scene */ },
  onWin(w, proceed)     { /* return true to take over the win sequence; call proceed() when done */ },
  onRender(ctx, C, w)   { /* custom drawing: world-space pass, then screen-space pass */ },
});
```

- `w` is the shared world: `w.fox`, `w.camX`, `w.camOffset`, `w.baseY`, `w.t`,
  `w.startX`, `w.worldEnd`, `w.drawing`, `w.strokes`.
- `C` is the theme palette (`C.ink`, `C.accent`, `C.surface`, `C.bg`, …).
- Store all level state in a single namespaced object on `w` (level 1 uses
  `w.nyc`) so it is easy to find and reset.

### Lifecycle phases (level 1 pattern)

Intro cutscene → run → win scene, driven by a string state machine in
`onUpdate`:

- **Intro** (`intro: 'cage' → 'opening' → 'runout' → 'run'`): freeze the fox at
  `w.startX`, set a wide `w.camOffset` (e.g. `INTRO_CAMOFF`), advance phases on
  `phaseT`, then ease `camOffset` back to the run value once `'run'` begins.
- **Run**: normal gameplay; engine moves the fox and camera.
- **Win** (`onWin` returns true, sets `w.<ns>.winScene`): a phase machine
  (`walk → board → liftoff → flyaway → done`) that animates the fox/vehicle,
  then calls `proceed()` exactly once in the final phase.

### Rendering passes in `onRender`

1. **World-space** (camera translate already applied): scenery anchored to world
   coords (the van, fox running out of the van).
2. **Screen-space**: `ctx.save(); ctx.translate(w.camX, 0); … ctx.restore();` to
   cancel the camera for HUD-like / fixed elements (the win helicopter).

Cull off-screen draws (`hSX > -200 && hSX < cssW + 200`).

## Backgrounds live in game.js

Per-theme backgrounds are in `drawBackground(theme, camX)` in `src/game.js`
(sky gradient + `skyline/pines/ridges` layers + any hero scenery like the
Statue of Liberty). Add a new theme as an `else if (theme === '…')` branch and
set the level's `theme` field to match. Reuse the shared tiling helpers so
parallax stays correct.

## Sharing helpers between levels

Level-specific draw helpers can be exported on `window` for reuse, e.g. level 1
does `window.LRDrawHeli = drawHeli;` and level 2's intro reuses it. The fox is
drawn via `LRFox.drawFoxCanvas(...)`.

## Checklist when adding / editing a level

- [ ] State namespaced on `w` and fully initialised in `onBuild`.
- [ ] Layers ordered/parallaxed per the z-index rules; tiled shapes pinned to global index `k`.
- [ ] Intro freezes the fox and restores `camOffset`; `'run'` hands control back to the engine.
- [ ] `onWin` returns `true` and calls `proceed()` exactly once.
- [ ] `onRender` separates world-space and screen-space passes and culls off-screen draws.
- [ ] `theme` matches a branch in `drawBackground`.
- [ ] `node --check src/game.js` (and the level file) passes.