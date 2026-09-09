# Darling Reclaimed — Shopify theme

Craft-based theme carrying the Darling Reclaimed design.

## Structure

Shopify's GitHub integration requires theme folders at the repository root:

    assets/  config/  layout/  locales/  sections/  snippets/  templates/

## Custom sections

| File | Purpose |
| --- | --- |
| `sections/dr-hero.liquid` | Full-bleed hero with scrim |
| `sections/dr-intro.liquid` | Centered section intro, optional image |
| `sections/dr-featured-finish.liquid` | Product feature with live variant spec table |
| `sections/dr-process.liquid` | Numbered steps with line icons |
| `sections/dr-feature.liquid` | Editorial block, media above/below/beside |
| `sections/dr-shop-by-space.liquid` | Collection tiles with overlaid labels |
| `sections/dr-peel-stick.liquid` | Two offset images plus copy |
| `sections/dr-coverage-calculator.liquid` | Inline coverage calculator |
| `sections/dr-trade.liquid` | Trade programme benefits list |

Shared pieces:

- `snippets/dr-calculator-form.liquid` — the calculator form, used by both the
  inline section and the global pop-up so the two cannot drift apart.
- `snippets/dr-calculator-modal.liquid` — the pop-up, rendered once in
  `layout/theme.liquid`. Any link to `#calculator` opens it.
- `assets/dr-theme.css` — brand palette, type and shared component styles.
- `assets/dr-coverage-calculator.js` — calculator maths and pop-up wiring.

## Design tokens

| Token | Hex | Role |
| --- | --- | --- |
| Bone | `#EFE8DC` | primary light background |
| Off-white | `#FFFDF9` | alternate light background |
| Ink | `#1E1B18` | dark background, headings on light |
| Greige | `#DDD4CA` | cards, rules, placeholders |
| Clay | `#C57B57` | primary accent button |
| Rust | `#A66044` | eyebrow on light |
| Taupe | `#A68C77` | eyebrow and body on dark |
| Cocoa | `#5B3A29` | secondary button |

Headings are Jost (loaded from Google Fonts in `layout/theme.liquid`); body is
Montserrat from Shopify's font library.

## Constraints worth remembering

- A theme is capped at **50 section files**. This one sits at 43; eight unused
  stock Craft sections were removed to make room.
- `range` settings must use **integer** min/max/step/default.
- `inline_richtext` defaults may not contain `<br>`. Headings that need a line
  break use a `textarea` setting rendered with `newline_to_br`.
- Range `unit` must be ASCII and at most three characters.
