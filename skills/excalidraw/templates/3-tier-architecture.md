# 3-Tier Architecture Template

Creates a layered system architecture with presentation, business logic, and data layers.

## Pattern Information

- **Layout**: Vertical layers (top to bottom)
- **Spacing**: 150px between layers
- **Color Scheme**: Frontend (blue) → Backend (green) → Database (red)
- **Components**: 7 total (2 frontend, 3 backend, 2 data)

## Query Pattern Data

```bash
# Get pattern details
python3 scripts/search.py "3-tier architecture"

# Get component dimensions
python3 scripts/search.py "frontend component"
python3 scripts/search.py "backend component"

# Get spacing rules
python3 scripts/search.py "layer spacing"
```

## Commands

### 1. Initialize Session

```bash
node scripts/excalidraw.js init --file architecture.excalidraw
```

### 2. Create Layer Frames

```bash
# Presentation Layer (y=50)
node scripts/excalidraw.js add-frame --file architecture.excalidraw --id frame-presentation --name "Presentation Layer" --x 50 --y 50 --width 700 --height 180

# Business Logic Layer (y=380, spacing: 50+180+150)
node scripts/excalidraw.js add-frame --file architecture.excalidraw --id frame-business --name "Business Logic Layer" --x 50 --y 380 --width 700 --height 180

# Data Layer (y=710, spacing: 50+2*(180+150))
node scripts/excalidraw.js add-frame --file architecture.excalidraw --id frame-data --name "Data Layer" --x 50 --y 710 --width 700 --height 180
```

### 3. Presentation Layer Components

```bash
# Web Application (frontend palette = blue)
node scripts/excalidraw.js add-shape --file architecture.excalidraw --id web-app --type rectangle --x 120 --y 110 --width 180 --height 100 --palette frontend
node scripts/excalidraw.js add-text --file architecture.excalidraw --id text-web-app --text "Web Application\n(React)" --x 160 --y 140 --container-id web-app
node scripts/excalidraw.js link-text --file architecture.excalidraw web-app text-web-app

# Mobile Application (frontend palette = blue)
node scripts/excalidraw.js add-shape --file architecture.excalidraw --id mobile-app --type rectangle --x 380 --y 110 --width 180 --height 100 --palette frontend
node scripts/excalidraw.js add-text --file architecture.excalidraw --id text-mobile --text "Mobile App\n(iOS/Android)" --x 420 --y 140 --container-id mobile-app
node scripts/excalidraw.js link-text --file architecture.excalidraw mobile-app text-mobile
```

### 4. Business Logic Layer Components

```bash
# API Gateway (backend palette = green)
node scripts/excalidraw.js add-shape --file architecture.excalidraw --id api-gateway --type rectangle --x 120 --y 440 --width 180 --height 100 --palette backend
node scripts/excalidraw.js add-text --file architecture.excalidraw --id text-api --text "API Gateway\n(Node.js)" --x 160 --y 470 --container-id api-gateway
node scripts/excalidraw.js link-text --file architecture.excalidraw api-gateway text-api

# Auth Service (backend palette = green)
node scripts/excalidraw.js add-shape --file architecture.excalidraw --id auth-service --type rectangle --x 380 --y 440 --width 180 --height 100 --palette backend
node scripts/excalidraw.js add-text --file architecture.excalidraw --id text-auth --text "Auth Service\n(OAuth2)" --x 420 --y 470 --container-id auth-service
node scripts/excalidraw.js link-text --file architecture.excalidraw auth-service text-auth

# Redis Cache (cache palette = purple)
node scripts/excalidraw.js add-shape --file architecture.excalidraw --id cache --type rectangle --x 580 --y 440 --width 140 --height 100 --palette cache
node scripts/excalidraw.js add-text --file architecture.excalidraw --id text-cache --text "Redis\nCache" --x 620 --y 475 --container-id cache
node scripts/excalidraw.js link-text --file architecture.excalidraw cache text-cache
```

### 5. Data Layer Components

```bash
# PostgreSQL Database (database palette = red)
node scripts/excalidraw.js add-shape --file architecture.excalidraw --id database --type rectangle --x 180 --y 770 --width 180 --height 100 --palette database
node scripts/excalidraw.js add-text --file architecture.excalidraw --id text-db --text "PostgreSQL\nDatabase" --x 220 --y 800 --container-id database
node scripts/excalidraw.js link-text --file architecture.excalidraw database text-db

# S3 Storage (external palette = yellow)
node scripts/excalidraw.js add-shape --file architecture.excalidraw --id s3 --type rectangle --x 420 --y 770 --width 180 --height 100 --palette external
node scripts/excalidraw.js add-text --file architecture.excalidraw --id text-s3 --text "S3 Storage\n(Files)" --x 460 --y 800 --container-id s3
node scripts/excalidraw.js link-text --file architecture.excalidraw s3 text-s3
```

### 6. Connect Presentation to Business Layer

```bash
# Web App → API Gateway (vertical arrow, 150px gap)
node scripts/excalidraw.js add-arrow --file architecture.excalidraw --id arrow-web-api --x 210 --y 210 --points "[[0,0],[0,230]]"
node scripts/excalidraw.js bind-arrow --file architecture.excalidraw arrow-web-api web-app api-gateway

# Mobile App → API Gateway (diagonal arrow)
node scripts/excalidraw.js add-arrow --file architecture.excalidraw --id arrow-mobile-api --x 470 --y 210 --points "[[0,0],[-90,230]]"
node scripts/excalidraw.js bind-arrow --file architecture.excalidraw arrow-mobile-api mobile-app api-gateway
```

### 7. Connect Business to Data Layer

```bash
# API Gateway → Database (diagonal arrow)
node scripts/excalidraw.js add-arrow --file architecture.excalidraw --id arrow-api-db --x 210 --y 540 --points "[[0,0],[60,230]]"
node scripts/excalidraw.js bind-arrow --file architecture.excalidraw arrow-api-db api-gateway database

# API Gateway → Cache (horizontal arrow)
node scripts/excalidraw.js add-arrow --file architecture.excalidraw --id arrow-api-cache --x 300 --y 490 --points "[[0,0],[280,0]]"
node scripts/excalidraw.js bind-arrow --file architecture.excalidraw arrow-api-cache api-gateway cache
```

### 8. Analyze Quality

```bash
# Check diagram quality
node scripts/excalidraw.js analyze --file architecture.excalidraw

# Export final diagram
node scripts/excalidraw.js export-excalidraw --file architecture.excalidraw -o 3-tier-architecture-final.excalidraw
```

## Diagram Structure

```
┌─────────────────────────────────────────┐
│      Presentation Layer (y=50)          │
│  [Web App]        [Mobile App]          │
│     ↓                  ↓                 │
└─────────────────────────────────────────┘
              150px spacing
┌─────────────────────────────────────────┐
│    Business Logic Layer (y=380)         │
│  [API Gateway] [Auth] [Cache] ←→        │
│       ↓           ↓                      │
└─────────────────────────────────────────┘
              150px spacing
┌─────────────────────────────────────────┐
│        Data Layer (y=710)               │
│    [PostgreSQL]      [S3 Storage]       │
└─────────────────────────────────────────┘
```

## Customization Tips

### Adjust Spacing

Change layer Y positions to adjust spacing:

- Frame 1: y=50
- Frame 2: y=50 + 180 + SPACING
- Frame 3: y=50 + 2\*(180 + SPACING)

### Adjust Component Positions

Modify X positions to change horizontal layout:

- Left column: x=120
- Center column: x=380
- Right column: x=580

### Change Colors

Use different palettes:

- `--palette frontend` (blue)
- `--palette backend` (green)
- `--palette database` (red)
- `--palette cache` (purple)
- `--palette queue` (orange)
- `--palette external` (yellow)

### Add More Components

Copy any component block and adjust:

1. Change `--id` to unique value
2. Adjust `--x` and `--y` positions
3. Update text content
4. Use appropriate `--palette`

## Expected Output

- **Layers**: 3 frames (Presentation, Business Logic, Data)
- **Components**: 7 shapes with text labels
- **Connections**: 4 arrows showing data flow
- **Colors**: Semantic (blue, green, red, purple, yellow)
- **Quality Score**: Should achieve 85+ with proper spacing

## See Also

- `templates/microservices.md` - Hub-spoke architecture
- `templates/flowchart.md` - Process flowchart
- `templates/sequence-diagram.md` - Request-response flow
