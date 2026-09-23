# Approved Portwhim identity

The straight-corner design in `approved-reference.png` was selected by the project owner on 2026-09-07.

`public/brand/mark.svg` is the editable geometric master, reconstructed from that reference for clear rendering at small sizes. It retains the square outline, central colon, mint right-hand port, and ivory background. The original image is retained unmodified, including its wordmark. The application uses its existing live wordmark beside the new mark.

`icon.png` is a 1024px export. `icon.ico` contains 16, 24, 32, 48, 64, 128 and 256px PNG images. `icon.icns` is the macOS multi-resolution icon generated from the same SVG with the Tauri icon command. Export these from the SVG when updating the master. Windows, macOS and Linux packaging configurations refer to these assets.

To regenerate the macOS asset without replacing the approved Windows exports:

```powershell
pnpm exec tauri icon public/brand/mark.svg --output .build-tools/brand-icons
Copy-Item .build-tools/brand-icons/icon.icns public/brand/icon.icns
```
