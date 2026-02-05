# 3D Game Development Workspace

This workspace is designed to help you create 3D games using Three.js, Babylon.js, and other WebGL technologies.

## Getting Started

### Prerequisites

```bash
npm install three
npm install cannon-es  # For physics
npm install stats.js   # For performance monitoring
```

### Quick Start

1. Use the `/create-scene` command to generate a basic Three.js scene
2. Use the `/add-physics` command to add physics simulation
3. Start building your game!

## Workspace Structure

```
.claude-plugin/         - Plugin configuration
skills/                 - Specialized knowledge modules
  threejs-scene-setup.md
  game-physics.md
  shader-programming.md
  performance-optimization.md
commands/               - Quick action commands
  create-scene.md
  add-physics.md
  optimize-game.md
agents/                 - Expert AI agents
  graphics-expert.md
  physics-engineer.md
hooks/                  - Session hooks
  SessionStart/
    welcome.md
```

## Skills Available

- **Three.js Scene Setup**: Camera, renderer, lighting, and basic scene configuration
- **Game Physics**: Physics engine integration with Cannon.js
- **Shader Programming**: Custom GLSL shaders for visual effects
- **Performance Optimization**: Techniques to achieve 60 FPS

## Commands

- `/create-scene` - Generate a complete Three.js scene setup
- `/add-physics` - Add physics simulation to your project
- `/optimize-game` - Analyze and optimize performance

## Expert Agents

- **graphics-expert** - For advanced rendering and shader questions
- **physics-engineer** - For complex physics simulations

## Example Projects

### Basic 3D Scene
A simple rotating cube with lighting and camera controls.

### Physics Sandbox
Interactive physics simulation with falling objects and collisions.

### Shader Playground
Custom shader effects including water, fire, and particles.

## Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [Cannon.js Physics](https://schteppe.github.io/cannon.js/)
- [WebGL Fundamentals](https://webglfundamentals.org/)
- [The Book of Shaders](https://thebookofshaders.com/)

## Tips

1. Always start with a simple scene and add complexity gradually
2. Profile performance early and often
3. Use simple collision shapes for better physics performance
4. Implement LOD (Level of Detail) for large scenes
5. Test on target hardware regularly

Happy game development!
