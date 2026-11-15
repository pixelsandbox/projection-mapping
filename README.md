# Mario Wall: projection mapping

Turn any wall into a Mario world. Point a projector at a wall, draw boxes over real things (shelves, frames, the floor line), drop in characters, and press play. The whole wall comes alive, moving to a built-in 8-bit beat or to any song in the room.

One HTML page, plain JavaScript, no build step, no dependencies.

## Try it

Open `index.html` through any static web server:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Or host the folder on GitHub Pages (Settings → Pages → Deploy from branch → `main` / root).

> The microphone ("React to my song") only works on `https://` or `localhost`. GitHub Pages is https, so it works there.

## How it works

1. **Map your wall:** drag on the black area to draw boxes over real objects. Pick a skin for each box (bricks, ? blocks, pipes, clouds, neon, lava, water, ice, rainbow and more), or **Blank** to keep it invisible but walkable.
2. **Build:** drag heroes, enemies, items and scenery from the right panel onto your boxes. Give characters left–right or up–down motion and drag the cyan dots to set how far they go. Or tap **Build it for me** for a random level.
3. **Play:** choose **React to my song** (listens through the mic and follows the beat) or **Play automatically** (built-in chiptune). Press **F** for fullscreen on the projector.

Extras: Corner fit (projector keystone), a wall photo to trace over, grid and snap, a glow effect, undo/redo, a score display, and a built-in **Help me learn** walkthrough. Your wall is saved in the browser.

## Keyboard

| Key | Action |
| --- | --- |
| F | Fullscreen |
| Space | Play / pause (while playing) |
| E | Back to editing (while playing) |
| H | Hide / show the editing tools |
| Delete | Delete the selection |
| Ctrl/Cmd + Z / Shift + Z | Undo / redo |
| Ctrl/Cmd + D | Duplicate |
| Arrow keys | Nudge (hold Shift for bigger steps) |

## Project layout

```
index.html      page structure
css/app.css     styles
js/font.js      5x7 pixel font
js/art.js       pixel-art sprites, tiles and skins
js/audio.js     built-in chiptune + mic/song beat tracking
js/engine.js    renderer, gameplay and the random level builder
js/editor.js    the wall editor
js/help.js      the "Help me learn" walkthrough
js/app.js       screens, player and projector corner fit
```

## Disclaimer

A non-commercial fan project. Not affiliated with or endorsed by Nintendo. Mario and related characters are trademarks of Nintendo. All pixel art and code in this repository were made for this project.
