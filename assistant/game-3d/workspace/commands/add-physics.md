# Add Physics Command

Integrate physics simulation into an existing Three.js scene using Cannon.js.

## Task

Add physics simulation to a Three.js project:
1. Install and configure Cannon.js physics engine
2. Create physics world with gravity
3. Set up ground plane with collision
4. Add physics bodies for existing 3D objects
5. Synchronize physics bodies with Three.js meshes
6. Implement collision detection callbacks
7. Add physics debug renderer

## Implementation Steps

1. Install cannon-es: `npm install cannon-es`
2. Create physics world with gravity settings
3. Set up ground physics body with plane shape
4. Create physics bodies for dynamic objects (spheres, boxes, etc.)
5. Add collision event listeners
6. Update physics world in animation loop
7. Synchronize Three.js mesh positions/rotations with physics bodies
8. Add CannonDebugger for visual physics debugging

## Expected Output

A physics-enabled 3D scene with:
- Realistic gravity and collisions
- Ground plane for objects to rest on
- Physics bodies synchronized with visual meshes
- Collision detection and response
- Debug visualization of physics shapes
- Proper physics timestep (60 FPS)

## Example Usage

After running this command:
- Objects will fall and collide realistically
- Ground prevents objects from falling infinitely
- Collisions trigger custom events
- Physics shapes visible in debug mode
- Ready for adding more complex physics interactions
