# Creppie mascot art

The mascot poses live here (cut out of the 2026-09 renders; `signin` reuses `success.png`
until a wave pose exists). To change one, replace the PNG or point the mood at a new file in
`src/components/creppie/moods.ts` (`art: require('../../../assets/creppie/<file>')`).
Nothing else in the app needs to change.

| Mood      | File          | Pose                                          | Shown on |
|-----------|---------------|-----------------------------------------------|----------|
| loading   | `loading.png` | scrubbing a shoe                              | app launch |
| empty     | `empty.png`   | shrug next to an empty shoe rack              | no orders / no updates yet |
| error     | `error.png`   | slipped on a wet sole, sweating               | something failed (with Try Again) |
| offline   | `offline.png` | phone with no signal bars                     | no connection |
| success   | `success.png` | thumbs up, holding a clean shoe               | booking confirmed |
| signin    | `signin.png`  | waving at the shop door                       | guest on Orders / Inbox / Profile |

**Spec for the designer:** transparent PNG, square, 512×512 (the app shows them at
64–96 px, so keep shapes bold and readable small), brand colours navy `#0A1F44`,
blue `#1A6FD4`, ice `#E8F1FB`. Optional later: the same poses as Lottie `.json`
for subtle animation.
