---
name: Obsidian Ledger
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fd'
  surface-container: '#eeedf7'
  surface-container-high: '#e8e7f1'
  surface-container-highest: '#e3e1ec'
  on-surface: '#1a1b22'
  on-surface-variant: '#45464c'
  inverse-surface: '#2f3038'
  inverse-on-surface: '#f1effa'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#575e70'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#141b2b'
  on-primary-container: '#7d8497'
  inverse-primary: '#c0c6db'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#2a1700'
  on-tertiary-container: '#b87500'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce2f7'
  primary-fixed-dim: '#c0c6db'
  on-primary-fixed: '#141b2b'
  on-primary-fixed-variant: '#404758'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#fbf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e3e1ec'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.025em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: '0'
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
  numeric-metric:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.03em
  numeric-table:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers a calm, razor-sharp, and architectonic digital experience tailored for high-focus personal wealth tracking and financial clarity. Drawing inspiration from the quiet productivity models of Notion and Linear, it rejects chaotic fintech tropes—such as neon gradients, hyperactive gamification, and visually loud badges—in favor of deliberate restraint, spatial equilibrium, and high information legibility.

### Personality & Visual Tenets
- **Quiet Authority:** Premium finishes defined by warm off-white canvases, deep obsidian anchors, and whisper-thin boundaries.
- **Architectural Precision:** Consistent hairline rules, tabular numeric alignment, and compact spatial rhythms allow data density without cognitive friction.
- **Muted Functional Feedback:** Color is reserved strictly for state and semantic meaning (allocations, budget variances, positive or negative momentum) rather than decorative filler.

## Colors

The palette embraces a warm, organic canvas paired with surgical dark accents.

### Light Mode Surfaces & Text
- **Canvas / Background:** `#FBFBFA` (soft parchment white to reduce prolonged eye fatigue).
- **Surface / Cards:** `#FFFFFF` (crisp, optical contrast against the warm canvas).
- **Elevated Surface / Popovers:** `#FFFFFF` paired with micro-borders (`#E4E4E7`).
- **Primary Text:** `#18181B` (deep charcoal-black, softer than harsh `#000000`).
- **Secondary Text:** `#71717A` (mid-tone zinc for secondary metrics and column labels).
- **Muted / Inactive Text:** `#A1A1AA` (subtle captions, timestamps, empty placeholders).
- **Dividers & Strokes:** `#E4E4E7` primary borders; `#F0F0F2` subtle internal gridlines.

### Dark Mode Semantic Mapping
- **Canvas / Background:** `#0F0F11` (rich dark stone).
- **Surface / Cards:** `#18181B` (warm-tinged obsidian).
- **Elevated Surface:** `#232328` (distinct floating layer for active menus and dialogs).
- **Primary Text:** `#F4F4F5`.
- **Secondary Text:** `#A1A1AA`.
- **Muted Text:** `#71717A`.
- **Dividers & Strokes:** `#27272A` / `rgba(255, 255, 255, 0.08)`.

### Functional Semantic Palette
- **Positive / Inflow:** Emerald (`#10B981` light; `#34D399` dark; soft wash badge `#ECFDF5`).
- **Warning / Variable Allocation:** Amber (`#F59E0B` light; `#FBBF24` dark; soft wash badge `#FFFBEB`).
- **Critical / Overspent:** Crimson (`#EF4444` light; `#F87171` dark; soft wash badge `#FEF2F2`).
- **Neutral / Fixed Expense:** Slate (`#64748B` light; `#94A3B8` dark; soft wash badge `#F1F5F9`).

## Typography

Inter serves as the unified typographical foundation across headlines, labels, and analytical metrics to maintain structural cohesion.

### Tabular Figures & Numeric Alignment
All numerical presentations—including balances, percentages, transaction ledgers, and currency breakdowns—must enforce `font-variant-numeric: tabular-nums lining-nums`. This prevents optical jitter during value shifts and ensures clean vertical column scanning.

### Hierarchy & Letter Spacing
- Primary titles utilize tight negative tracking (`-0.02em` to `-0.03em`) for a solid editorial presence.
- Eyebrow labels and table column headers enforce uppercase styling paired with `label-sm` and a gentle positive tracking (`0.04em`) to delineate metadata from core content.

## Layout & Spacing

The layout structure balances Notion-like modular dashboard blocks with Linear's strict structural alignment.

### Grid Rhythm
- **Desktop (1200px+):** Fluid 12-column structure with `1.5rem` gutters and dynamic section margins (`2.5rem` minimum safe space). Multi-card metric banks and parallel transaction databases sit side by side in split 6-column arrangements.
- **Tablet (768px – 1199px):** 6-column grid with `1rem` gutters; secondary modules collapse below primary balance snapshots.
- **Mobile (<768px):** Single-column stacked stream. Financial transaction ledgers transform from wide multi-column tables into concise list cards.

### Density & Compact Flow
Inner component padding stays crisp: card headers use `space-md` (`0.75rem`), metric cards feature `space-lg` (`1.25rem`), and transactional table rows are bounded to standard 40px row heights with `space-sm` vertical cell padding.

## Elevation & Depth

This system intentionally departs from heavy drop shadows, relying on surface stratification, calibrated micro-shadows, and crisp hairline strokes.

### Tonal Stratification
- **Level 0 (Canvas):** Pure `#FBFBFA` in light mode, `#0F0F11` in dark mode.
- **Level 1 (Card Containers):** Elevated purely via background contrast (`#FFFFFF` or `#18181B`) and a 1px perimeter outline (`#E4E4E7` or `rgba(255,255,255,0.08)`).
- **Level 2 (Hover / Actionable Modules):** Subtly lifted with an ambient micro-shadow: `0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02)`.
- **Level 3 (Overlays, Select Menus, Modals):** Crisp hairline border complemented by a focused elevation shadow: `0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)`.
- **Modal Backdrops:** Frosted treatment (`backdrop-filter: blur(8px)`) layered over a 30% tinted obsidian veil (`rgba(15, 23, 42, 0.3)`).

## Shapes

The geometry strikes a modern balance between soft ergonomics and structural discipline.

- **Micro Shapes (Badges, Chips, Pills):** Fully pill-shaped (`9999px`) or tight `4px` to preserve distinct tag identity without crowding adjacent text.
- **Interactive Elements (Buttons, Inputs, Selects):** Uniform `6px` corner rounding for a focused, technical aesthetic.
- **Structural Cards & Panels:** Standard `8px` (`rounded-lg`), scaling up to `12px` (`rounded-xl`) exclusively on large floating modal sheets.

## Components

### Metric Cards
- Container styled with `8px` radius, pure `#FFFFFF` background, and `1px` solid `#E4E4E7` border.
- Header row includes a muted zinc label (`label-sm`), optional micro-icon (`14px`), and status indicator.
- Metric readout uses `numeric-metric` with an aligned comparison chip (+/- percentage or budget variance indicator).

### Transaction Tables & Lists
- Table headers feature uppercase `label-sm` with bottom hairline divider.
- Cell vertical heights are set strictly to 40px with inline flex alignment.
- Financial figures are strictly right-aligned with `numeric-table`.
- Row hover produces a soft background shift to `#F4F4F5` (light) or `#1F1F23` (dark) with instant transition (`100ms ease-out`).

### Pill Badges & Chips
- Compact padding: `0.125rem 0.5rem` with `font-size: 0.6875rem` and `font-weight: 500`.
- **Fixed Expense:** Slate tint (`bg: #F1F5F9`, `text: #475569`).
- **Variable Expense:** Amber tint (`bg: #FEF3C7`, `text: #92400E`).
- **Inflow / Savings:** Emerald tint (`bg: #D1FAE5`, `text: #065F46`).

### Category Progress Meters
- Thin track height of `4px` with a subtle background of `#F0F0F2`.
- Active fill bars carry discrete, un-gradiented status tones (e.g., emerald for under 80% budget, amber for 80-99%, red for 100%+).

### Form Controls & Inputs
- Height constrained to 36px with `6px` corners.
- Idle stroke is `1px solid #E4E4E7`; focus state triggers a crisp double ring (`box-shadow: 0 0 0 1px #18181B, 0 0 0 3px rgba(24, 24, 27, 0.1)`).
- Monetary input fields feature fixed currency prefixes anchored in secondary text tone.

### Buttons
- **Primary:** Deep obsidian `#18181B` fill, white text, subtle hover lift to `#27272A`.
- **Secondary / Ghost:** Transparent surface with `1px solid #E4E4E7` border, text `#18181B`, hover background `#F4F4F5`.
- **Destructive:** Crisp white fill with crimson border and crimson text, active state shifts to `#FEF2F2`.