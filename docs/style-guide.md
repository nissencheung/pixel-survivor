# Pixelfx style guide

Measured from the sprite sheets already in `assets/` (first frames, opaque pixels with alpha ≥ 240, plus the semi-transparent halo). The game’s hero, tiles, and UI sit on this same 1px grid.

## Native size

Pixelfx frames are large because of glow padding. The solid body is smaller:

| Sheet | Frame | Opaque body |
| --- | --- | --- |
| slime | 112×88 | about 67×37 |
| bat | 112×80 | about 72×46 |
| ghost | 96×100 | about 31×42 |
| eyeball | 96×108 | about 41×51 |
| heart-pickup | 56×60 | about 21×34 |
| xp-orb | 72×56 | about 22×28 |
| fireball | 136×56 | about 66×20 |
| bullet-tracer | 200×40 | about 117×18 |

One source pixel is one game pixel. The playfield is **180×390** and is copied to the screen with an integer nearest-neighbor scale (2× on a 390×844 phone). Hero, tiles, text, and VFX all use that grid. Nothing is drawn at a fractional scale.

## Palette

Opaque pixels are hand-shaded, not a posterized 8-bit set, but they cluster. These are the colors the game is allowed to use, taken from those clusters:

| Role | Hex | Where it shows up |
| --- | --- | --- |
| Outline | `#0c0912` | bat wing edge, heart outline |
| Hair / eye socket | `#2e2426` | eyeball rim |
| Purple shadow | `#392645` | bat body, dark side |
| Purple mid | `#5b3f66` | bat |
| Purple light | `#8a608a` | bat highlight |
| Blue outline | `#33406e` | ghost edge |
| Blue deep | `#2f3b66` | same family, used for deep water |
| Blue mid | `#4a5d9a` | ghost rim, shallow water |
| Blue light | `#acc3f2` | ghost fill, water spark |
| Paper | `#f2f2f2` | ghost core |
| White | `#ffffff` | eye, bullet core, XP |
| Red | `#ae1c2e` | heart |
| Red light | `#ff9aa1` | heart highlight (also skin) |
| Red dark | `#2e0e15` | heart shadow |
| Skin | `#ffdddb` | heart specular |
| Orange | `#f2561d` | bullet / fireball edge |
| Gold | `#ffb236` | fireball mid |
| Ember | `#9e2c1d` | fireball dark rim |
| Slime deep | `#113f26` | slime dark |
| Slime body | `#155a3f` | slime |
| Slime light | `#2ba96c` | slime mid |
| Slime rim | `#59ff6a` | slime bright edge |
| Olive | `#3d531e` | XP shadow, dirt path |
| Brown | `#1a130a` | fireball glow base, path edge |
| XP yellow | `#ffff8b` | orb highlight |

## Outline

- Creatures that read as characters (bat, heart, eyeball) use a **1px near-black** edge (`#0c0912` or `#2e2426`), not a thick stroke.
- Magic and slime use a **colored rim** in the darkest local tone, plus a brighter outer pixel where the glow starts.
- The outline is one pixel. There is no second black stroke and no blurred stroke.

The hero and trees follow the character rule: 1px `#0c0912` outside the filled pixels.

## Shading

Bodies use about **three tones**: shadow, mid, highlight.

Light comes from the **upper left**. On the ghost, the bright centroid sits up and left of the dark centroid. On the heart, highlights sit on the upper-left lobe. On the bullet, the white core leads the orange tail.

Tiles use the same idea: a flat mid fill, one lighter pixel on the upper left of a tuft or canopy, and the dark tone on the lower right. No gradients.

## Dither and glow

About 6% (bat) to 40% (fireball, bullet) of non-empty pixels are **semi-transparent**. That halo is the glow. It is not a smooth vector gradient; it is sparse pixels with partial alpha.

Solid things (ground, hero, UI) stay fully opaque. Only the imported pixelfx sheets keep their built-in glow. Water sparkle is a single opaque `#acc3f2` pixel, not a fade.

## What the game does not do

- No `strokeText`, no system-font drawing on the final frame.
- ASCII and digits are a 3×5 bitmap. Chinese UI uses **Fusion Pixel 8px** (TakWolf, SIL OFL, subset in `assets/fusion-pixel-8.ttf`). Each glyph is drawn at 8px and snapped to one bit, so a character pixel is the same size as a sprite pixel.
- No radial vignette, no anti-aliased arcs. The joystick is a cross of rectangles.
- Enemies, bullets, slashes, and the chest stay the original pixelfx sheets at scale 1.
