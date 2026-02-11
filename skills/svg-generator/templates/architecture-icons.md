# Architecture Icon Templates

Copy-paste ready SVG icons for common architecture diagram elements. Each icon uses `viewBox="0 0 64 64"` and follows the flat design rules from SKILL.md.

## Server

Rack server with horizontal divider lines and status indicator dots.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#2f9e44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="10" y="6" width="44" height="52" rx="4" fill="#b2f2bb"/>
  <line x1="10" y1="23" x2="54" y2="23"/>
  <line x1="10" y1="40" x2="54" y2="40"/>
  <circle cx="18" cy="15" r="2" fill="#2f9e44"/>
  <circle cx="18" cy="32" r="2" fill="#2f9e44"/>
  <circle cx="18" cy="49" r="2" fill="#2f9e44"/>
  <line x1="42" y1="15" x2="48" y2="15"/>
  <line x1="42" y1="32" x2="48" y2="32"/>
  <line x1="42" y1="49" x2="48" y2="49"/>
</svg>
```

## Database

Cylinder with elliptical top and middle ring.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#c92a2a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="32" cy="16" rx="22" ry="8" fill="#ffc9c9"/>
  <path d="M10 16v32c0 4.4 9.8 8 22 8s22-3.6 22-8V16"/>
  <ellipse cx="32" cy="16" rx="22" ry="8"/>
  <path d="M10 32c0 4.4 9.8 8 22 8s22-3.6 22-8"/>
</svg>
```

## Cloud

Cloud silhouette built from a single compound path.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#1971c2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M16 44h32a12 12 0 0 0 0-24 12 12 0 0 0-11.3-8A16 16 0 0 0 8 28a8 8 0 0 0 8 16z" fill="#a5d8ff"/>
</svg>
```

## User / Actor

Circle head with a body arc below.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#495057" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="32" cy="20" r="12" fill="#e9ecef"/>
  <path d="M8 56c0-13.3 10.7-24 24-24s24 10.7 24 24" fill="#e9ecef"/>
</svg>
```

## Lock / Security

Padlock with rectangular body and arc shackle.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#6741d9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="12" y="28" width="40" height="28" rx="4" fill="#d0bfff"/>
  <path d="M20 28V18a12 12 0 0 1 24 0v10"/>
  <circle cx="32" cy="42" r="3" fill="#6741d9"/>
</svg>
```

## Queue / Message Buffer

Stacked rectangles with horizontal offset suggesting a queue.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#e67700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="6" y="10" width="36" height="16" rx="3" fill="#ffd8a8"/>
  <rect x="12" y="26" width="36" height="16" rx="3" fill="#ffd8a8"/>
  <rect x="18" y="42" width="36" height="16" rx="3" fill="#ffd8a8"/>
  <polyline points="50 50 56 50 56 38" stroke="#e67700"/>
  <polyline points="53 41 56 38 59 41" stroke="#e67700"/>
</svg>
```

## Monitor / Screen

Desktop monitor with screen and stand.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#1971c2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="6" y="6" width="52" height="36" rx="4" fill="#a5d8ff"/>
  <line x1="6" y1="34" x2="58" y2="34"/>
  <line x1="32" y1="42" x2="32" y2="52"/>
  <line x1="20" y1="52" x2="44" y2="52"/>
</svg>
```

## Shield / Protection

Shield outline with a centered checkmark.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#2f9e44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M32 6L8 18v16c0 14 10.7 22.7 24 28 13.3-5.3 24-14 24-28V18L32 6z" fill="#b2f2bb"/>
  <polyline points="22 34 30 42 44 26"/>
</svg>
```

## Globe / Internet

Circle with latitude and longitude arcs.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#f08c00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="32" cy="32" r="24" fill="#ffe066"/>
  <ellipse cx="32" cy="32" rx="10" ry="24"/>
  <line x1="8" y1="32" x2="56" y2="32"/>
  <path d="M12 18h40"/>
  <path d="M12 46h40"/>
</svg>
```

## Key / Authentication

Key with circular bow and rectangular blade.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"
     stroke="#6741d9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="22" cy="24" r="14" fill="#d0bfff"/>
  <line x1="33" y1="30" x2="56" y2="50"/>
  <line x1="48" y1="44" x2="54" y2="38"/>
  <line x1="42" y1="38" x2="48" y2="32"/>
</svg>
```

---

## End-to-End Workflow Example

Create a 3-component diagram with custom icons: Cloud (frontend), Server (backend), and Database.

### Step 1: Initialize diagram

```bash
cd skills/excalidraw
node scripts/excalidraw.js init --file arch-with-icons.excalidraw
```

### Step 2: Write SVG icons to files

Use your Write/file tool to create these three files:

**icons/cloud.svg** — copy the Cloud SVG from above
**icons/server.svg** — copy the Server SVG from above
**icons/database.svg** — copy the Database SVG from above

### Step 3: Add shapes and text with excalidraw CLI

```bash
# Frontend box
node scripts/excalidraw.js add-shape --file arch-with-icons.excalidraw \
  --type rectangle --id "fe" --x 100 --y 100 --width 200 --height 120 --palette frontend
node scripts/excalidraw.js add-text --file arch-with-icons.excalidraw \
  --text "Web App" --x 160 --y 170 --container-id "fe"
node scripts/excalidraw.js link-text --file arch-with-icons.excalidraw fe fe-text

# Backend box
node scripts/excalidraw.js add-shape --file arch-with-icons.excalidraw \
  --type rectangle --id "be" --x 100 --y 320 --width 200 --height 120 --palette backend
node scripts/excalidraw.js add-text --file arch-with-icons.excalidraw \
  --text "API Server" --x 150 --y 390 --container-id "be"
node scripts/excalidraw.js link-text --file arch-with-icons.excalidraw be be-text

# Database box
node scripts/excalidraw.js add-shape --file arch-with-icons.excalidraw \
  --type rectangle --id "db" --x 100 --y 540 --width 200 --height 120 --palette database
node scripts/excalidraw.js add-text --file arch-with-icons.excalidraw \
  --text "PostgreSQL" --x 145 --y 610 --container-id "db"
node scripts/excalidraw.js link-text --file arch-with-icons.excalidraw db db-text
```

### Step 4: Embed icons into the diagram

```bash
# Place icons inside their respective boxes (centered near top)
node skills/svg-generator/scripts/svg-embed.js \
  --svg icons/cloud.svg --excalidraw skills/excalidraw/arch-with-icons.excalidraw \
  --id "icon-cloud" --x 168 --y 108 --width 64 --height 64

node skills/svg-generator/scripts/svg-embed.js \
  --svg icons/server.svg --excalidraw skills/excalidraw/arch-with-icons.excalidraw \
  --id "icon-server" --x 168 --y 328 --width 64 --height 64

node skills/svg-generator/scripts/svg-embed.js \
  --svg icons/database.svg --excalidraw skills/excalidraw/arch-with-icons.excalidraw \
  --id "icon-db" --x 168 --y 548 --width 64 --height 64
```

### Step 5: Add arrows to connect components

```bash
node scripts/excalidraw.js add-arrow --file arch-with-icons.excalidraw \
  --id "fe-be" --x 200 --y 220 --points "[[0,0],[0,100]]"
node scripts/excalidraw.js bind-arrow --file arch-with-icons.excalidraw fe-be fe be

node scripts/excalidraw.js add-arrow --file arch-with-icons.excalidraw \
  --id "be-db" --x 200 --y 440 --points "[[0,0],[0,100]]"
node scripts/excalidraw.js bind-arrow --file arch-with-icons.excalidraw be-db be db
```

### Step 6: Analyze and export

```bash
node scripts/excalidraw.js analyze --file arch-with-icons.excalidraw
node scripts/excalidraw.js export-excalidraw --file arch-with-icons.excalidraw -o arch-final.excalidraw
```

The result is a 3-tier architecture diagram where each component has a distinctive icon inside its box, making it immediately clear what each component represents — not just colored rectangles.
