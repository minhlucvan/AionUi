# 3D Game Development Starter

Complete starter template for building 3D games with Three.js, physics, and shaders. Includes Claude Code integration for AI-assisted development.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Choose a Template

Pick a starter template based on your needs:

```bash
# Basic Three.js scene with lighting and controls
cp -r templates/basic-scene/* .

# Physics-enabled game with Cannon.js
cp -r templates/physics-game/* .

# Shader examples and effects
cp -r templates/shader-examples/* .
```

### 3. Start Development

```bash
npm run dev
```

Your game will be running at `http://localhost:5173`

## What's Included

- **Three.js Templates**: Pre-configured scenes with camera, renderer, lighting
- **Physics Integration**: Cannon.js with collision detection
- **Shader Examples**: GLSL shaders for water, fire, and effects
- **Build Tools**: Vite dev server with hot reload
- **Claude Code Integration**: AI skills, commands, and agents

## Project Structure

```
.
├── .claude/              # Claude Code configuration
│   ├── config.json      # Skills, commands, agents config
│   ├── skills/          # Specialized knowledge
│   ├── commands/        # Quick actions
│   └── agents/          # Expert AI agents
├── templates/           # Starter templates
│   ├── basic-scene/     # Simple Three.js scene
│   ├── physics-game/    # Physics simulation
│   └── shader-examples/ # Shader showcases
├── docs/                # Documentation
├── package.json         # Dependencies
├── vite.config.js       # Build configuration
└── claude.md            # Main context file
```

## Available Claude Code Skills

- **threejs-scene-setup** - Scene, camera, renderer configuration
- **game-physics** - Cannon.js integration and collision handling
- **shader-programming** - Custom GLSL shader development
- **performance-optimization** - FPS monitoring, instancing, LOD

## Commands

- `/create-scene` - Generate new Three.js scene
- `/add-physics` - Add physics simulation
- `/optimize-game` - Performance analysis and optimization

## Expert Agents

- **graphics-expert** - Advanced rendering and shaders
- **physics-engineer** - Complex physics simulations

## Templates

### Basic Scene

- Rotating cube and sphere
- Orbit controls
- Shadow mapping
- FPS counter
- Responsive canvas

### Physics Game

- Click to spawn objects
- Realistic physics simulation
- Collision detection
- Reset functionality

### Shader Examples

- Basic animated shaders
- Water surface effect
- Custom vertex/fragment shaders

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [Cannon.js Physics](https://github.com/schteppe/cannon.js)
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [The Book of Shaders](https://thebookofshaders.com/)

## Best Practices

1. **Performance**: Always use `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`
2. **Memory**: Dispose of geometries, materials, and textures when removing objects
3. **Physics**: Use simple collision shapes (boxes, spheres) for better performance
4. **Shadows**: Enable shadows only when necessary
5. **Testing**: Profile early and test on target hardware

## Getting Help

- Read `claude.md` for comprehensive project overview
- Check `docs/` for detailed guides
- Use Claude Code skills for expert guidance
- Ask agents for complex problem-solving

---

**Ready to build 3D games!** Start with a template and let Claude Code assist you every step of the way.
