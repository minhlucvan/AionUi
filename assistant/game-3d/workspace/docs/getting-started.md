# Getting Started with 3D Game Development

This guide will help you get started with building 3D games using this template.

## Prerequisites

- Node.js 18+ installed
- Basic knowledge of JavaScript
- Familiarity with 3D concepts (optional but helpful)

## Installation

1. Navigate to the workspace directory
2. Install dependencies:

```bash
npm install
```

This will install:
- `three` - Three.js 3D library
- `cannon-es` - Physics engine
- `vite` - Build tool and dev server

## Choosing a Template

The workspace includes three starter templates:

### 1. Basic Scene Template

Perfect for beginners or simple 3D visualizations.

**Features:**
- Rotating cube and sphere
- Orbit camera controls
- Directional and ambient lighting
- Shadow mapping
- FPS counter
- Responsive window resizing

**Use this when:**
- Learning Three.js basics
- Building simple 3D visualizations
- Creating product showcases
- Prototyping ideas

**Get started:**
```bash
cp -r templates/basic-scene/* .
npm run dev
```

### 2. Physics Game Template

For interactive games with realistic physics.

**Features:**
- Cannon.js physics integration
- Click to spawn objects
- Collision detection
- Gravity simulation
- Reset functionality
- Physics/graphics synchronization

**Use this when:**
- Building physics-based games
- Creating interactive simulations
- Prototyping game mechanics
- Learning physics integration

**Get started:**
```bash
cp -r templates/physics-game/* .
npm run dev
```

### 3. Shader Examples Template

For custom visual effects and advanced graphics.

**Features:**
- Basic animated shader
- Water surface effect
- Custom vertex/fragment shaders
- Uniform variable examples
- Noise functions

**Use this when:**
- Creating custom visual effects
- Learning GLSL shaders
- Building artistic experiences
- Optimizing rendering

**Get started:**
```bash
cp -r templates/shader-examples/* .
npm run dev
```

## Project Structure After Setup

Once you've copied a template, your project will look like:

```
.
├── index.html           # Main HTML file
├── src/
│   ├── main.js         # Entry point
│   ├── styles.css      # Styles (basic-scene)
│   └── ...             # Other source files
├── package.json
├── vite.config.js
└── ...
```

## Development Workflow

### 1. Start the Dev Server

```bash
npm run dev
```

This starts Vite dev server with:
- Hot module replacement (HMR)
- Fast rebuilds
- Auto-opening browser
- Network access for mobile testing

### 2. Make Changes

Edit files in `src/` and see changes instantly in the browser.

### 3. Build for Production

```bash
npm run build
```

Outputs optimized files to `dist/` directory.

### 4. Preview Production Build

```bash
npm run preview
```

## Next Steps

### Customize the Scene

1. **Add Objects**: Create new geometries and materials
2. **Change Lighting**: Adjust lights for mood and performance
3. **Add Interactions**: Handle mouse/keyboard input
4. **Optimize**: Profile and improve performance

### Use Claude Code Skills

- Invoke `threejs-scene-setup` for scene guidance
- Use `game-physics` for physics help
- Try `shader-programming` for custom effects
- Run `performance-optimization` for speed

### Run Commands

- `/create-scene` - Generate new scene code
- `/add-physics` - Add physics to existing project
- `/optimize-game` - Analyze and optimize

### Consult Experts

- Ask **graphics-expert** for rendering questions
- Consult **physics-engineer** for simulation help

## Common Tasks

### Adding a New Object

```javascript
// Create geometry
const geometry = new THREE.BoxGeometry(1, 1, 1);

// Create material
const material = new THREE.MeshStandardMaterial({
    color: 0xff0000
});

// Create mesh
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 1, 0);
cube.castShadow = true;

// Add to scene
scene.add(cube);
```

### Handling Window Resize

```javascript
window.addEventListener('resize', () => {
    // Update camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
```

### Adding Physics

```javascript
// Create physics body
const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
const body = new CANNON.Body({ mass: 1, shape });
body.position.set(0, 5, 0);
world.addBody(body);

// Sync in animation loop
mesh.position.copy(body.position);
mesh.quaternion.copy(body.quaternion);
```

## Troubleshooting

### Black Screen

- Check browser console for errors
- Ensure camera is positioned correctly
- Verify scene has lights
- Check if objects are added to scene

### Low FPS

- Reduce polygon count
- Limit shadow-casting objects
- Use simpler materials
- Implement LOD (Level of Detail)
- Check FPS counter for bottlenecks

### Physics Not Working

- Ensure physics world is stepping
- Check body masses (0 = static)
- Verify shapes match visual geometry
- Synchronize positions each frame

## Learning Resources

- Check other guides in `docs/`
- Read `claude.md` for project overview
- Browse Three.js examples
- Experiment with templates

## Getting Help

If you're stuck:

1. Check the documentation
2. Use Claude Code skills
3. Ask Claude Code agents
4. Review template code
5. Check browser console

Happy game development!
