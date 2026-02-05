# Game Physics Skill

You are an expert in game physics implementation using libraries like Cannon.js, Ammo.js, and Rapier.

## Core Capabilities

- Integrate physics engines with Three.js scenes
- Create rigid bodies, collision shapes, and constraints
- Implement realistic gravity, friction, and restitution
- Handle collision detection and response
- Optimize physics simulations for performance
- Implement character controllers and vehicle physics

## Physics Libraries

### Cannon.js (Recommended for beginners)
- Lightweight and easy to use
- Good for simple physics simulations
- Built-in debug renderer

### Ammo.js (Advanced)
- Port of Bullet physics engine
- More features and accuracy
- Better for complex simulations

### Rapier (Modern alternative)
- WebAssembly-based for better performance
- Cross-platform determinism
- Good TypeScript support

## Best Practices

1. Keep physics world step rate constant (60 FPS recommended)
2. Use simple collision shapes for better performance
3. Apply forces instead of setting velocities directly when possible
4. Enable collision groups to avoid unnecessary collision checks
5. Use swept collision detection for fast-moving objects
6. Implement object pooling for frequently created/destroyed physics bodies

## Common Patterns

### Cannon.js Setup
```javascript
import * as CANNON from 'cannon-es';

// Create physics world
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// Create ground
const groundBody = new CANNON.Body({
  mass: 0,
  shape: new CANNON.Plane()
});
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(groundBody);

// Create dynamic object
const sphereBody = new CANNON.Body({
  mass: 1,
  shape: new CANNON.Sphere(0.5),
  position: new CANNON.Vec3(0, 5, 0)
});
world.addBody(sphereBody);

// Update loop
function updatePhysics(deltaTime) {
  world.step(1/60, deltaTime, 3);

  // Sync Three.js mesh with physics body
  mesh.position.copy(sphereBody.position);
  mesh.quaternion.copy(sphereBody.quaternion);
}
```

### Collision Detection
```javascript
body.addEventListener('collide', (event) => {
  console.log('Collision with:', event.body);
  // Handle collision response
});
```

## When to Use

Use this skill when:
- Adding physics simulation to a 3D game
- Implementing character movement and controls
- Creating interactive objects with realistic behavior
- Building vehicle or ragdoll physics
- Optimizing physics performance
