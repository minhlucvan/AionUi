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
python3 scripts/excalidraw.py init
```

### 2. Create Layer Frames

```bash
# Presentation Layer (y=50)
python3 scripts/excalidraw.py add-frame --id frame-presentation --name "Presentation Layer" --x 50 --y 50 --width 700 --height 180

# Business Logic Layer (y=380, spacing: 50+180+150)
python3 scripts/excalidraw.py add-frame --id frame-business --name "Business Logic Layer" --x 50 --y 380 --width 700 --height 180

# Data Layer (y=710, spacing: 50+2*(180+150))
python3 scripts/excalidraw.py add-frame --id frame-data --name "Data Layer" --x 50 --y 710 --width 700 --height 180
```

### 3. Presentation Layer Components

```bash
# Web Application (frontend palette = blue)
python3 scripts/excalidraw.py add-shape --id web-app --type rectangle --x 120 --y 110 --width 180 --height 100 --palette frontend
python3 scripts/excalidraw.py add-text --id text-web-app --text "Web Application\n(React)" --x 160 --y 140 --container-id web-app
python3 scripts/excalidraw.py link-text web-app text-web-app

# Mobile Application (frontend palette = blue)
python3 scripts/excalidraw.py add-shape --id mobile-app --type rectangle --x 380 --y 110 --width 180 --height 100 --palette frontend
python3 scripts/excalidraw.py add-text --id text-mobile --text "Mobile App\n(iOS/Android)" --x 420 --y 140 --container-id mobile-app
python3 scripts/excalidraw.py link-text mobile-app text-mobile
```

### 4. Business Logic Layer Components

```bash
# API Gateway (backend palette = green)
python3 scripts/excalidraw.py add-shape --id api-gateway --type rectangle --x 120 --y 440 --width 180 --height 100 --palette backend
python3 scripts/excalidraw.py add-text --id text-api --text "API Gateway\n(Node.js)" --x 160 --y 470 --container-id api-gateway
python3 scripts/excalidraw.py link-text api-gateway text-api

# Auth Service (backend palette = green)
python3 scripts/excalidraw.py add-shape --id auth-service --type rectangle --x 380 --y 440 --width 180 --height 100 --palette backend
python3 scripts/excalidraw.py add-text --id text-auth --text "Auth Service\n(OAuth2)" --x 420 --y 470 --container-id auth-service
python3 scripts/excalidraw.py link-text auth-service text-auth

# Redis Cache (cache palette = purple)
python3 scripts/excalidraw.py add-shape --id cache --type rectangle --x 580 --y 440 --width 140 --height 100 --palette cache
python3 scripts/excalidraw.py add-text --id text-cache --text "Redis\nCache" --x 620 --y 475 --container-id cache
python3 scripts/excalidraw.py link-text cache text-cache
```

### 5. Data Layer Components

```bash
# PostgreSQL Database (database palette = red)
python3 scripts/excalidraw.py add-shape --id database --type rectangle --x 180 --y 770 --width 180 --height 100 --palette database
python3 scripts/excalidraw.py add-text --id text-db --text "PostgreSQL\nDatabase" --x 220 --y 800 --container-id database
python3 scripts/excalidraw.py link-text database text-db

# S3 Storage (external palette = yellow)
python3 scripts/excalidraw.py add-shape --id s3 --type rectangle --x 420 --y 770 --width 180 --height 100 --palette external
python3 scripts/excalidraw.py add-text --id text-s3 --text "S3 Storage\n(Files)" --x 460 --y 800 --container-id s3
python3 scripts/excalidraw.py link-text s3 text-s3
```

### 6. Connect Presentation to Business Layer

```bash
# Web App → API Gateway (vertical arrow, 150px gap)
python3 scripts/excalidraw.py add-arrow --id arrow-web-api --x 210 --y 210 --points "[[0,0],[0,230]]"
python3 scripts/excalidraw.py bind-arrow arrow-web-api web-app api-gateway

# Mobile App → API Gateway (diagonal arrow)
python3 scripts/excalidraw.py add-arrow --id arrow-mobile-api --x 470 --y 210 --points "[[0,0],[-90,230]]"
python3 scripts/excalidraw.py bind-arrow arrow-mobile-api mobile-app api-gateway
```

### 7. Connect Business to Data Layer

```bash
# API Gateway → Database (diagonal arrow)
python3 scripts/excalidraw.py add-arrow --id arrow-api-db --x 210 --y 540 --points "[[0,0],[60,230]]"
python3 scripts/excalidraw.py bind-arrow arrow-api-db api-gateway database

# API Gateway → Cache (horizontal arrow)
python3 scripts/excalidraw.py add-arrow --id arrow-api-cache --x 300 --y 490 --points "[[0,0],[280,0]]"
python3 scripts/excalidraw.py bind-arrow arrow-api-cache api-gateway cache
```

### 8. Analyze Quality (Optional)

```bash
# Check diagram quality
python3 scripts/excalidraw.py analyze

# Capture final snapshot
python3 scripts/excalidraw.py snapshot -o 3-tier-architecture.json
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
