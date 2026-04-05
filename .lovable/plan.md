

# Slack Emoji Creator

A single-page tool that lets users upload an image and instantly converts it to Slack-compatible emoji format (128×128px, ≤128KB, square).

## Design
- **Joyful, colorful theme** using Slack brand colors as accents:
  - Cyan `#36C5F0`, Green `#2EB67D`, Yellow `#ECB22E`, Pink `#E01E5A`
- **Light/dark mode** auto-detected from system preference, with manual toggle
- Playful typography, rounded corners, subtle gradients using the 4 Slack colors
- Clean single-page layout: hero headline → upload area → preview/download

## Core Flow
1. **Upload zone** — drag-and-drop or click to upload (accepts PNG, JPG, WEBP, GIF)
2. **Client-side processing** using Canvas API:
   - Crop to square (center crop, with option to adjust)
   - Resize to 128×128
   - Compress to ≤128KB (iterative quality reduction)
3. **Live preview** — shows before/after side by side with file size indicator
4. **Download button** — saves the processed emoji-ready image

## Coming Soon Section
- **"Animate" tab** — visually present but disabled with a "Coming Soon" badge
- Shows teaser of animation styles (bounce, spin, shake, etc.) as static previews
- **GIF support** — mentioned as coming soon alongside animations

## Components
- `ThemeToggle` — sun/moon icon to switch light/dark
- `ImageUploader` — dropzone with drag-and-drop
- `ImageProcessor` — canvas-based resize/compress logic
- `EmojiPreview` — before/after comparison with size info
- `ComingSoonSection` — disabled animation/GIF feature teaser

## Tech
- All processing done client-side (no backend needed)
- Canvas API for image manipulation
- Shadcn UI components + Tailwind for styling

