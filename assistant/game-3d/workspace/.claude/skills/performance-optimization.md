# Performance Optimization Skill

You are an expert in optimizing 3D game performance for web applications.

## Core Capabilities

- Profile and identify performance bottlenecks
- Optimize geometry and draw calls
- Implement level of detail (LOD) systems
- Optimize texture memory and loading
- Implement object pooling and instancing
- Optimize physics simulations
- Reduce garbage collection impact

## Performance Metrics

Monitor these key metrics:

- **FPS (Frames Per Second)**: Target 60 FPS for smooth gameplay
- **Draw Calls**: Minimize to reduce CPU overhead
- **Triangle Count**: Keep under 100k for mobile, 1M+ for desktop
- **Memory Usage**: Monitor texture and geometry memory
- **Physics Step Time**: Should be < 16ms for 60 FPS

## Optimization Techniques

### 1. Geometry Optimization

```javascript
// Use BufferGeometry instead of Geometry
const geometry = new THREE.BufferGeometry();

// Merge geometries to reduce draw calls
const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);

// Simplify complex meshes
geometry.computeVertexNormals();
```

### 2. Instancing for Repeated Objects

```javascript
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const instancedMesh = new THREE.InstancedMesh(geometry, material, 1000);

for (let i = 0; i < 1000; i++) {
  const matrix = new THREE.Matrix4();
  matrix.setPosition(Math.random() * 100, Math.random() * 100, Math.random() * 100);
  instancedMesh.setMatrixAt(i, matrix);
}

scene.add(instancedMesh);
```

### 3. Level of Detail (LOD)

```javascript
const lod = new THREE.LOD();

// Add different detail levels
const highDetail = new THREE.Mesh(highPolyGeometry, material);
const mediumDetail = new THREE.Mesh(mediumPolyGeometry, material);
const lowDetail = new THREE.Mesh(lowPolyGeometry, material);

lod.addLevel(highDetail, 0);
lod.addLevel(mediumDetail, 50);
lod.addLevel(lowDetail, 100);

scene.add(lod);
```

### 4. Texture Optimization

```javascript
// Use power-of-2 textures for mipmapping
const texture = textureLoader.load('texture.jpg');
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;

// Use texture atlases to reduce texture switches
// Compress textures (use basis or ktx2 formats)
```

### 5. Frustum Culling

```javascript
// Automatically enabled in Three.js
mesh.frustumCulled = true;

// For complex scenes, use custom culling
if (!camera.frustum.intersectsObject(mesh)) {
  mesh.visible = false;
}
```

### 6. Object Pooling

```javascript
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.available = [];
    this.inUse = [];

    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.createFn());
    }
  }

  acquire() {
    const obj = this.available.length > 0 ? this.available.pop() : this.createFn();

    this.inUse.push(obj);
    return obj;
  }

  release(obj) {
    const index = this.inUse.indexOf(obj);
    if (index > -1) {
      this.inUse.splice(index, 1);
      this.resetFn(obj);
      this.available.push(obj);
    }
  }
}
```

## Best Practices

1. **Batch Static Objects**: Merge static meshes into single geometry
2. **Use InstancedMesh**: For many copies of same object
3. **Lazy Load Assets**: Load resources on demand
4. **Dispose Unused Resources**: Call dispose() on geometries, materials, textures
5. **Limit Shadow Casters**: Only important objects should cast shadows
6. **Use LOD Systems**: Switch detail based on distance
7. **Optimize Physics**: Use simple collision shapes, reduce physics world size
8. **Profile Regularly**: Use browser DevTools and Stats.js

## Profiling Tools

```javascript
// Stats.js for FPS monitoring
import Stats from 'stats.js';
const stats = new Stats();
document.body.appendChild(stats.dom);

function animate() {
  stats.begin();
  // Your render code
  stats.end();
}

// Chrome DevTools Performance tab
// Three.js Inspector browser extension
```

## When to Use

Use this skill when:

- Game is running below target FPS
- Experiencing frame drops or stuttering
- Memory usage is growing over time
- Draw calls are too high
- Loading times are too long
- Optimizing for mobile devices
