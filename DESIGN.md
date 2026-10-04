# DESIGN

How Clean Crep looks and feels on every surface: the app, the website and the staff dashboard.
Derived from `project/colors_and_type.css` and cut down for a more premium look: fewer colours,
bolder headlines, more room. The code tokens live in `packages/shared/src/tokens.ts` (shared) and
`apps/mobile/src/theme.ts` (React Native styles built from them). **Change a value there, not
inline.**

_Last updated: 2026-10-04_

## 1. Colour: navy, white, one blue

| Token | Hex | Use |
| --- | --- | --- |
| `navy` | `#0A1F44` | Brand. Headlines, body text, dark surfaces (hero, order ticket, primary dark button). |
| `white` | `#FFFFFF` | Cards, text on navy. |
| `offWhite` | `#F5F7FA` | Page background. |
| `blue` (accent) | `#1A6FD4` | **The only accent.** One primary action per screen, prices, selected state, progress. |

Navy and blue tints are allowed as long as they're the same hue (they're not new colours):

| Tint | Hex | Use |
| --- | --- | --- |
| `ink.muted` | `#5A6A8A` | Captions, secondary text, inactive icons (navy at ~65%). |
| `line` | `#E0E8F4` | Hairline borders, dividers. |
| `ice` | `#E8F1FB` | Selected/tinted surfaces, icon tiles (blue at ~10%). |
| `onNavy.muted` | `#A8C8F0` | Secondary text on navy. |

Retired from the UI: charcoal `#2A2D35` (body text is navy now), the amber/green/red status palette,
and WhatsApp green as a button fill (the WhatsApp button is a secondary button with the glyph).
**One exception:** `danger` `#B3261E` for error text only, never as decoration.

## 2. Type

Two families. Headlines and prices use a bold display font; everything else is DM Sans.

**Display font: Archivo (ExtraBold 800 / Bold 700).** Candidates considered:

- **Archivo**: a grotesque from athletic and retail branding, with tight bold weights and
  tabular figures, so prices line up and look like a price tag. It sits well next to DM Sans
  because both have geometric bones, and Archivo's heavier, squarer cut gives the contrast.
- **Space Grotesk**: has character, but its quirky letterforms (the `a`, the `G`) read
  "tech startup" more than "sneaker shop", and its bold is lighter.

Picked Archivo. Loaded in the app with `@expo-google-fonts/archivo`. On the web, use
`next/font/google` → `Archivo({ weight: ['700','800'] })`.

| Style | Font | Size / line | Use |
| --- | --- | --- | --- |
| `display` | Archivo 800 | 34 / 38, -0.5 tracking | Hero lines ("Your Creps Deserve Better."). One per screen. |
| `title` | Archivo 800 | 26 / 30, -0.3 | Screen titles (Orders, Book a Clean). |
| `headline` | Archivo 700 | 19 / 24 | Card titles, item names on tickets. |
| `price` | Archivo 800 | 22 / 26 | Prices on cards. `priceLg` 30 / 34 for totals. |
| `body` | DM Sans 400 | **15** / 22 | All running text. **Never smaller than 15.** |
| `bodyStrong` | DM Sans 500 | 15 / 22 | Emphasis inside body, list-row titles. |
| `button` | DM Sans 700 | 16 / 20 | Button labels. |
| `caption` | DM Sans 400 | 13 / 18 | Meta only (dates, order numbers, helper text). Not for sentences longer than a line. |
| `overline` | DM Sans 500 | 12 / 16, +1.6 tracking, UPPERCASE | Section labels ("ALL ORDERS"). |

Rules: Archivo never for paragraphs. Don't use DM Sans for prices. No more than three sizes on one card.

## 3. Spacing

4-point grid. Tokens: `xxs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · xxl 48`.

- Screen gutter: `lg` (24) on phones.
- Gap between cards: `sm` (12). Gap between sections: `xl` (32).
- Card padding: `md`–`lg` (16–24). Never less than 16.
- Touch targets: at least 44 × 44. Primary buttons are 52 tall.

## 4. Radius

| Token | px | Use |
| --- | --- | --- |
| `sm` | 8 | Tags, inputs, small chips |
| `md` | 14 | Buttons, list rows, icon tiles |
| `lg` | 20 | Cards, the order ticket, hero |
| `pill` | 999 | Status pills, floating Creppie button |

## 5. Shadow

Navy-tinted, soft, and rare. A surface has a shadow **or** a border, not both.

| Token | Value | Use |
| --- | --- | --- |
| `none` | none | Flat rows inside a card, anything with a border |
| `card` | `0 2px 10px rgba(10,31,68,0.06)` | Resting cards on off-white |
| `raised` | `0 12px 28px rgba(10,31,68,0.18)` | The order ticket, floating buttons, sheets |

## 6. Motion and feel

- Springs, not linear easing: `damping 16, stiffness 180` for UI (reanimated `withSpring`).
- Haptics (`apps/mobile/src/lib/haptics.ts`, no-ops on web):
  - **light** on add-on toggles and selection chips
  - **success** on Confirm Booking (booked) and when an order turns **Ready for Pickup**
- One looping animation per screen at most (e.g. the current step's pulse on the ticket).

## 7. Components

- **Primary button**: blue fill, white `button` label, `md` radius, 52 tall. One per screen.
- **Dark button**: navy fill. **Secondary**: white with a `line` border and navy label.
- **Order ticket**: the boarding pass. Navy card, `lg` radius, `raised` shadow, perforation with
  off-white notches, a stub with order no. / service / add-ons / drop-off + ready days, and the
  status timeline.
- **Status pill**: `pill` radius. On white: ice background, navy text. On navy: white 12%
  background, white text. Completed: blue background, white text.

## Do / Don't

| Do | Don't |
| --- | --- |
| Use navy for text and blue for the one thing to tap | Add a new colour for a new feature |
| Put prices in Archivo | Set prices or headlines in DM Sans 500 (it looks timid) |
| Keep body text 15+ | Use 10–12px text for anything a customer must read |
| Pull values from `theme.ts` / `tokens.ts` | Type hex codes or font names into a screen |
| Give each screen one primary (blue) button | Stack two blue buttons next to each other |
| Use a shadow **or** a border | Use both on the same card |
| Leave space: 24 gutter, 32 between sections | Fill every gap with a divider |
| Fire haptics on toggles and on success | Buzz on every tap or on errors |
