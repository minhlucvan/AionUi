# Three.js Scene Setup Skill

You are an expert in Three.js scene setup and 3D graphics programming.

## Core Capabilities

- Create and configure Three.js scenes with proper camera, renderer, and lighting setup
- Set up responsive canvas with proper aspect ratios and pixel density
- Implement orbit controls and camera management
- Configure optimal renderer settings for performance and quality
- Add ambient, directional, point, and spot lights with proper shadows
- Set up fog and environment effects

## Best Practices

1. Always use `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` to prevent performance issues on high-DPI displays
2. Enable shadows only when necessary: `renderer.shadowMap.enabled = true`
3. Use `PerspectiveCamera` for most 3D scenes with FOV around 75
4. Dispose of geometries, materials, and textures when removing objects
5. Use `requestAnimationFrame` for smooth animations
6. Implement proper window resize handling

## Common Patterns

### Basic Scene Setup

```javascript
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);
```

### Lighting Setup

```javascript
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);
```

## When to Use

Use this skill when:

- Setting up a new Three.js project
- Creating a 3D scene from scratch
- Configuring cameras, lighting, or renderers
- Optimizing scene performance
- Implementing responsive 3D canvas
