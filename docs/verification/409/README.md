# Installable PWA identity verification (#409)

Evidence for issue [#409](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/issues/409)
and PR [#554](https://github.com/Nucleo-Estudantes-Informatica-ISEP/fallstack-website/pull/554).
Design references, unit tests and emulator runs are not substitutes for the
device checks recorded here.

## Build under test

- Branch: `feat/confirm-favicon-and-installable-pwa-identity-on-real-devices`
- Revision: `8a696eb`
  - Repository head when this record was opened: `8a696eb`, which includes the
    icon and favicon replacement from `3503b32`.
- Build command: `pnpm build + pnpm start`
- Identity assets: `public/icons/maskable_icon_x{96,128,192,384,512}.png` and
  `public/favicon.ico` as changed by `3503b32`.
  - Appearance at that revision: the 2026 `FALLSTACK` wordmark in white on a
    transparent background; `favicon.ico` is a single `222×256` frame.
  - Previous revision (`88253ca`, the one covered by the earlier reviews):
    the same wordmark on an opaque dark gradient background, with a four-frame
    `16/32/48/64` favicon.

## Devices

| Platform | Device             | OS              | Browser  | Origin                                                      | Date         |
| -------- | ------------------ | --------------- | -------- | ----------------------------------------------------------- | ------------ |
| Android  | `Nothing Phone 3a` | `Android 16`    | `Chrome` | `http://localhost:3000` via `adb reverse tcp:3000 tcp:3000` | `13/11/2026` |
| iOS      | `<model>`          | `<iOS version>` | `Safari` | `<HTTPS origin>`                                            | `<date>`     |
| Desktop  | `MSI Laptop`       | `Windows 11`    | `Brave`  | `http://localhost:3000`                                     | `13/11/2026` |

## Android results

- Install surface: `Install app prompt`
- Home-screen icon: `maskable_icon` ([capture](android-home-screen.png))
- Installed name: `Fallstack 2026`
- Launch behavior: `standalone window with no browser UI` ([capture](android-launch.png))
- Offline launch: `offline.html fallback shown`

## iOS results

(TODO)

- Installation path: Safari Share menu → `Adicionar ao ecrã principal`
- Home-screen icon: `<describe the rendered icon>` ([capture](iphone-home-screen.png))
- Installed name: `<name shown below the icon>` (expected `Fallstack 2026`)
- Launch behavior: `<standalone window, no Safari UI>` ([capture](iphone-launch.png))
- Guidance hidden when opened from the Home Screen (`navigator.standalone`):
  `<yes/no>`

## Install prompt behavior

- Android, `beforeinstallprompt` available: `native prompt shown and button works`
- iOS, event unavailable: `<manual guidance shown, no install button>` (TODO)
- Desktop browsers: `popup hidden until the event fires`

## Defects found

- None

## Not covered

- None

## Reproduction

Android, using the production build on the host:

```powershell
pnpm build
pnpm start
# separate shell, with USB debugging authorised
adb reverse tcp:3000 tcp:3000
```

Open `http://localhost:3000` in Chrome on the device (`localhost` is a secure
context, so the service worker registers and the install surface is available).
Uninstall the installed app and clear site data before re-checking a revision
whose manifest icons or start URL changed.

iOS requires an HTTPS origin; `localhost` on the phone does not reach the host.
Record the origin and the revision served there.

## Captures

Screenshots live in this directory and are referenced above. Expected files:

- `android-home-screen.png`
- `android-launch.png`
- `iphone-home-screen.png`
- `iphone-launch.png`
