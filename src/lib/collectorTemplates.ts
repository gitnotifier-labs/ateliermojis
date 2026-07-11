export interface CollectorTemplate {
  id: string;
  label: string;
  url: string;
  /**
   * Optional foreground image drawn on top of the user emoji, e.g. a bubble
   * border that should appear in front of the user's image.
   */
  foreground?: string;
  /**
   * Overlay box expressed as fractions (0..1) of the template's pixel dimensions.
   * This makes the registry resolution-independent.
   */
  overlay: { x: number; y: number; width: number; height: number };
  /** Prefix used when naming the downloaded file, e.g. "old-man-yells-at-" */
  outputPrefix: string;
}

/**
 * Master list of collector templates.
 * To add a new template:
 *   1. Drop the image into /public/collectors/
 *   2. Add an entry here with the correct overlay fractions.
 */
export const COLLECTOR_TEMPLATES: CollectorTemplate[] = [
  {
    id: "old-man-yells-at",
    label: "Old man yells",
    url: "/collectors/old_man_yells_at.png",
    // Emoji placed top-left at 1/3 × 1/3 of the template (preserves existing behaviour)
    overlay: { x: 0, y: 0, width: 1 / 3, height: 1 / 3 },
    outputPrefix: "old-man-yells-at-",
  },
  {
    id: "bufo-thinking",
    label: "Bufo thinking 💭",
    url: "/collectors/bufo_thinking_bg.png",
    // Bubble border drawn on top so it frames the user image correctly
    foreground: "/collectors/bufo_thinking_fg.png",
    // User image placed inside the thought-bubble circle (top-right)
    // Circle center ≈ (182, 68), inner radius 53 → inscribed square at (129, 15), 106×106
    overlay: { x: 129 / 256, y: 15 / 256, width: 106 / 256, height: 106 / 256 },
    outputPrefix: "bufo-thinking-",
  },
];
