---
name: CYPHER Electronics Store
description: A polished, premium next-generation electronics retail experience.
colors:
  primary-blue: "#0070dc"
  primary-cyan: "#00b8db"
  primary-yellow: "#facc15"
  dark-btn: "#041e42"
  icon-color: "#64748b"
  surface: "#f8fafc"
  surface-elevated: "#ffffff"
  border-subtle: "#e2e8f0"
  text-primary: "#0f172a"
  text-secondary: "#475569"
  text-muted: "#94a3b8"
typography:
  display:
    fontFamily: "Space Grotesk, var(--font-space-grotesk), sans-serif"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Inter, var(--font-inter), sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, var(--font-inter), sans-serif"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-shop:
    backgroundColor: "{colors.primary-blue}"
    textColor: "{colors.surface-elevated}"
    rounded: "{rounded.md}"
    padding: "10px 24px"
  button-shop-hover:
    backgroundColor: "{colors.dark-btn}"
  product-card:
    backgroundColor: "{colors.surface-elevated}"
    rounded: "{rounded.md}"
    padding: "16px"
  product-action:
    rounded: "{rounded.md}"
    padding: "8px 16px"
---

# Design System: CYPHER

## 1. Overview

**Creative North Star: "The Innovation Frame"**

CYPHER's design system, **The Innovation Frame**, exists to showcase next-generation tech products with modern restraint and high-fidelity polish. It treats the user interface as a silent, premium gallery frame—meticulously structured, highly responsive, and completely content-first. The products (smartphones, laptops, accessories) provide the color, excitement, and texture, while the UI establishes the layout structure, confident typographic specs, and clear interactive feedback.

This system explicitly rejects visual clutter, neon gamer tropes, and over-the-top decorative glassmorphism. It is built on high contrast, deliberate whitespace, and fine-tuned micro-interactions that foster deep user trust.

Key Characteristics:
- Product-first focal point using neutral canvases.
- Technical readability with prominent spec layouts.
- Flat-by-default structure elevating only on interaction.
- Generous spacing and clean geometric lines.

## 2. Colors

The color palette balances professional technology confidence with bright, innovative freshness.

### Primary
- **Primary Blue** (#0070dc): Trust, technology, and brand-defining action. The main CTA color.
- **Primary Cyan** (#00b8db): Innovation, freshness, link hovers, active indicators.
- **Primary Yellow** (#facc15): Special deals, highlights, limited-time badges, and key alerts.
- **Dark Navy** (#041e42): Heading colors, premium depth, and secondary solid CTAs.

### Neutral
- **Surface** (#f8fafc): Bright, clean default body background.
- **Surface Elevated** (#ffffff): Cards, lists, and dialog containers.
- **Border Subtle** (#e2e8f0): Razor-thin separation lines for layouts.
- **Text Primary** (#0f172a): Deepest neutral for technical specs, product titles, and high-readability copying.
- **Text Secondary** (#475569): Soft neutral for paragraph descriptions.
- **Text Muted** (#94a3b8): Labels, placeholders, and inactive states.

**The 90-10 Brand Rule.** 90% of the screen consists of clean, neutral surfaces, spacing, and typography. The primary blue and cyan accent colors are reserved for the remaining 10% of critical action elements, ensuring high impact and visual hierarchy.

## 3. Typography

**Display Font:** Space Grotesk (with sans-serif fallbacks)
**Body Font:** Inter (with system-ui fallbacks)

The pairing of Space Grotesk and Inter creates a clean, technical, and highly legible reading flow. Space Grotesk brings a modern, geometric tech-oriented personality to display headings, while Inter provides neutral, high-legibility rendering for specs, pricing, and dense product copy.

### Hierarchy
- **Display** (Bold 700, clamp(2rem, 5vw, 3.5rem), 1.2): Main hero titles and large announcement text.
- **Headline** (Bold 700, 1.75rem, 1.25): Category layouts and primary section titles.
- **Title** (Semi-bold 600, 1.25rem, 1.3): Product names, card headers, and subheaders.
- **Body** (Regular 400, 1rem, 1.5): Specifications tables, product descriptions, reviews. Capped at 70ch.
- **Label** (Medium 500, 0.875rem, 1.2): Badges, buttons, metadata, technical attributes.

**The Technical Scannability Rule.** Large specifications (e.g., "8GB RAM", "1TB SSD") must be displayed using bold weights or clear label sizes, immediately adjacent to their respective metric labels to allow high-speed scanning by tech buyers.

## 4. Elevation

CYPHER uses a flat-by-default hybrid design. Surfaces are clean and rely on background color separation (`--surface` vs `--surface-elevated`) and thin border boundaries (`--border-subtle`) for layout structure. Shadows are used extremely sparingly to indicate elevated components.

### Shadow Vocabulary
- **Elevated Hover** (`box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05)`): Applied to product cards and buttons on hover to indicate elevation response.
- **Nav Shadow** (`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02)`): Subtle elevation separation for the fixed top navigation bar.

**The Flat-Rest Rule.** All cards, containers, and buttons must remain completely flat at rest with border lines. Tonal shift or shadow-elevation triggers ONLY as a response to active user interaction (hover, focus).

## 5. Components

### Buttons
- **Shape:** Slightly rounded corners (6px / `rounded-md`).
- **Primary:** `--primary-blue` background, `--surface-elevated` text, `10px 24px` padding.
- **Hover / Focus:** Transitions to `--dark-btn` background with a smooth 200ms ease and an elevated shadow.

### Cards / Containers
- **Corner Style:** Rounded corners (6px / `rounded-md`).
- **Background:** `--surface-elevated` (#ffffff).
- **Shadow Strategy:** Flat at rest with a subtle `--border-subtle` stroke; elevations emerge on hover.
- **Internal Padding:** Spacing scale (`16px` to `24px`) for appropriate breathing room.

### Inputs / Fields
- **Style:** Clean white background, `--border-subtle` stroke, `rounded-md` corners.
- **Focus:** `outline: 2px solid var(--primary-blue); outline-offset: 2px;` with clean outlines.

### Navigation
- **Style:** Fixed sticky header, utilizing `--surface-elevated` background and a subtle navigation shadow.

### Signature Component: Product Card
The primary item-display tile of the storefront. It combines content-first structural frames with smart interaction cues.
- **Border:** `border border-border-subtle` for distinct layout bounds.
- **Hover Reaction:** Smooth 200ms transition to a soft elevation shadow (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05)`) and slight product image scaling (105%).
- **Overlays:** Top rated label overlay (Primary Blue, white text) and discount overlay (Primary Yellow, Navy text) positioned in the upper-left of the image canvas.
- **Interactive Triggers:** Reveals action buttons and additional spec attributes dynamically on hover.

### Product Action Button
A smart, context-aware add-to-cart controller embedded in each product card.
- **States:**
  - *Out of Stock:* Disabled, neutral surface background (`--surface`), muted text.
  - *In Cart:* Light accent styling (`bg-primary-blue/10 text-primary-blue border border-primary-blue/20`) to confirm checkout readiness.
  - *Hover Active:* Vibrant Primary Blue background (`bg-primary-blue`) transitioning to Dark Navy (`bg-dark-btn`) on hover.
  - *Rest State:* Soft neutral background (`bg-surface`) with secondary text.

## 6. Do's and Don'ts

### Do:
- **Do** use strict neutral layouts to let product imagery carry the color and texture.
- **Do** showcase clear specs and prices with prominent typographic weight.
- **Do** utilize smooth, quick transitions (200-300ms) for interactive elements.

### Don't:
- **Don't** use colored left/right side-stripes on product cards, warnings, or badges.
- **Don't** use gradient text under any circumstances; maintain solid, legible colors.
- **Don't** apply neon backgrounds or flashing accents.
- **Don't** resort to bloated modal overlay flows when inline progressive disclosure can reveal specs easily.
- **Don't** clutter the grid layout with generic same-sized icons; vary card structures or use whitespace to create rhythm.
