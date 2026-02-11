---
name: svg-generator
description: Generate SVG icons, illustrations, and decorative graphics for diagrams. Use when users need custom icons (server, database, cloud, etc.), badges, logos, or any visual element as SVG. The agent writes SVG code directly and saves to .svg files. Supports embedding SVGs into .excalidraw diagrams as image elements.
allowed-tools: Bash(node:*)
---

# SVG Generator for Diagrams

## Core Workflow

Creating SVG icons for excalidraw diagrams follows three steps:

1. **Write SVG** — Author SVG XML code directly (you have full creative control)
2. **Save to file** — Write the SVG to a `.svg` file on disk
3. **Embed into diagram** — Use `svg-embed.js` to attach the SVG as an image element in `.excalidraw`

```bash
# Example: create a server icon and embed it
# Step 1-2: Write SVG to file (use your Write/file tool)
# Step 3: Embed into excalidraw diagram
node skills/svg-generator/scripts/svg-embed.js \
  --svg server-icon.svg \
  --excalidraw diagram.excalidraw \
  --id "server-1" --x 100 --y 100 --width 64 --height 64
```

## SVG Design Rules for Diagrams

Follow these rules to create icons that look great at diagram scale:

### ViewBox and Size

- Use `viewBox="0 0 64 64"` as the standard icon canvas
- Leave **4px padding** inside the viewBox (draw within 4,4 to 60,60)
- Icons will typically display at 48-96px in diagrams

### Style Guidelines

- **Flat design** — no gradients, no filters, no drop shadows
- **Single stroke color** + optional fill — keeps icons clean at small sizes
- **Stroke width 2-3px** — visible without being heavy
- **Rounded caps/joins** — use `stroke-linecap="round" stroke-linejoin="round"`
- **No text in icons** — text doesn't scale well; use excalidraw text elements instead

### SVG Template

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <!-- Draw within 4,4 to 60,60 for padding -->
  <!-- Use stroke for outlines, fill for solid areas -->
</svg>
```

## Color Matching with Excalidraw Palettes

Use these exact hex values to match the excalidraw semantic color system:

| Category | Stroke Color | Fill Color | Use For                   |
| -------- | ------------ | ---------- | ------------------------- |
| frontend | `#1971c2`    | `#a5d8ff`  | UI, web apps, mobile      |
| backend  | `#2f9e44`    | `#b2f2bb`  | APIs, services, logic     |
| database | `#c92a2a`    | `#ffc9c9`  | Data storage (SQL, NoSQL) |
| cache    | `#6741d9`    | `#d0bfff`  | Redis, Memcached          |
| queue    | `#e67700`    | `#ffd8a8`  | Message queues            |
| external | `#f08c00`    | `#ffe066`  | Third-party services      |
| actor    | `#495057`    | `#e9ecef`  | Users, external systems   |
| neutral  | `#000000`    | `#ffffff`  | Generic/uncolored         |

### Color Usage in SVGs

```xml
<!-- Server icon in backend green -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#2f9e44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="8" y="8" width="48" height="48" rx="4" fill="#b2f2bb"/>
  <!-- icon details here -->
</svg>
```

## SVG Icon Examples

### Server

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#2f9e44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="10" y="6" width="44" height="52" rx="4" fill="#b2f2bb"/>
  <line x1="10" y1="23" x2="54" y2="23"/>
  <line x1="10" y1="40" x2="54" y2="40"/>
  <circle cx="18" cy="15" r="2" fill="#2f9e44"/>
  <circle cx="18" cy="32" r="2" fill="#2f9e44"/>
  <circle cx="18" cy="49" r="2" fill="#2f9e44"/>
</svg>
```

### Database

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#c92a2a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="32" cy="16" rx="22" ry="8" fill="#ffc9c9"/>
  <path d="M10 16v32c0 4.4 9.8 8 22 8s22-3.6 22-8V16"/>
  <ellipse cx="32" cy="16" rx="22" ry="8"/>
  <path d="M10 32c0 4.4 9.8 8 22 8s22-3.6 22-8"/>
</svg>
```

### Cloud

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#1971c2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16 44h32a12 12 0 0 0 0-24 12 12 0 0 0-11.3-8A16 16 0 0 0 8 28a8 8 0 0 0 8 16z" fill="#a5d8ff"/>
</svg>
```

### User

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#495057" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="32" cy="20" r="12" fill="#e9ecef"/>
  <path d="M8 56c0-13.3 10.7-24 24-24s24 10.7 24 24" fill="#e9ecef"/>
</svg>
```

### Lock

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#6741d9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="12" y="28" width="40" height="28" rx="4" fill="#d0bfff"/>
  <path d="M20 28V18a12 12 0 0 1 24 0v10"/>
  <circle cx="32" cy="42" r="3" fill="#6741d9"/>
</svg>
```

### API Badge

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#e67700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="6" y="16" width="52" height="32" rx="8" fill="#ffd8a8"/>
  <text x="32" y="37" text-anchor="middle" font-family="Arial,sans-serif"
        font-size="14" font-weight="bold" fill="#e67700" stroke="none">API</text>
</svg>
```

## Embed CLI Reference

Use `svg-embed.js` to attach SVG files as image elements in excalidraw diagrams.

### Usage

```bash
node skills/svg-generator/scripts/svg-embed.js \
  --svg <path-to-svg> \
  --excalidraw <path-to-excalidraw> \
  --id <element-id> \
  --x <x-position> \
  --y <y-position> \
  [--width <width>] \
  [--height <height>]
```

### Parameters

| Param          | Required | Default       | Description              |
| -------------- | -------- | ------------- | ------------------------ |
| `--svg`        | Yes      | --            | Path to .svg file        |
| `--excalidraw` | Yes      | --            | Path to .excalidraw file |
| `--id`         | No       | `img-{hash8}` | Element ID for the image |
| `--x`          | Yes      | --            | X position in diagram    |
| `--y`          | Yes      | --            | Y position in diagram    |
| `--width`      | No       | 64            | Display width            |
| `--height`     | No       | 64            | Display height           |

### Examples

```bash
# Embed a server icon at position (100, 200)
node skills/svg-generator/scripts/svg-embed.js \
  --svg icons/server.svg --excalidraw arch.excalidraw \
  --id "srv-1" --x 100 --y 200

# Embed a larger database icon (96x96)
node skills/svg-generator/scripts/svg-embed.js \
  --svg icons/database.svg --excalidraw arch.excalidraw \
  --id "db-main" --x 400 --y 500 --width 96 --height 96

# Embed multiple icons in sequence
node skills/svg-generator/scripts/svg-embed.js --svg icons/cloud.svg --excalidraw arch.excalidraw --id "cloud-1" --x 100 --y 100
node skills/svg-generator/scripts/svg-embed.js --svg icons/server.svg --excalidraw arch.excalidraw --id "srv-1" --x 300 --y 100
node skills/svg-generator/scripts/svg-embed.js --svg icons/database.svg --excalidraw arch.excalidraw --id "db-1" --x 500 --y 100
```

## Common Icon Patterns

Quick reference for drawing common diagram icons. Use these as creative prompts — adapt freely.

| Icon              | SVG Approach                                       |
| ----------------- | -------------------------------------------------- |
| Server            | Rectangle + horizontal divider lines + status dots |
| Database          | Ellipse top + cylinder body with curved lines      |
| Cloud             | Overlapping arcs forming cloud silhouette          |
| User/Actor        | Circle head + arc body below                       |
| Lock/Security     | Rectangle body + arc shackle on top                |
| API Badge         | Rounded rectangle + centered text                  |
| Queue/Buffer      | Multiple stacked rectangles with offset            |
| Monitor/Screen    | Rectangle screen + trapezoid stand                 |
| Shield            | Pointed-bottom path with checkmark                 |
| Globe/Internet    | Circle + curved latitude/longitude lines           |
| Container/Docker  | Rectangle with horizontal lines (whale shape)      |
| Gear/Settings     | Circle with triangular teeth around edge           |
| Lightning/Lambda  | Zigzag path (serverless/function)                  |
| Envelope/Email    | Rectangle + V-shaped flap                          |
| Bell/Notification | Bell curve path                                    |
| Chart/Analytics   | Rectangle frame + rising bar chart                 |
| Key/Auth          | Circle bow + rectangular blade                     |
| Folder/Storage    | Folder tab shape + rectangle body                  |
| Mobile/Phone      | Tall rounded rectangle + notch                     |
| Clock/Scheduler   | Circle + two hands from center                     |

## Workflow Tips

1. **Create icons first**, then embed — write all SVG files before running embed commands
2. **Reuse SVGs** — same `.svg` file can be embedded multiple times at different positions
3. **Match palette to context** — database icons in red, server icons in green, etc.
4. **Size consistently** — use 64x64 for standard icons, 48x48 for small, 96x96 for featured
5. **Position near labels** — place icons next to or above their excalidraw text labels
6. **Reference templates** — see `templates/architecture-icons.md` for complete examples
