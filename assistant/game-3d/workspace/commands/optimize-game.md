# Optimize Game Command

Analyze and optimize a 3D game project for better performance.

## Task

Perform comprehensive performance optimization:
1. Analyze current performance bottlenecks
2. Optimize geometry and reduce draw calls
3. Implement Level of Detail (LOD) system
4. Optimize textures and materials
5. Implement object pooling for frequently created objects
6. Enable frustum culling
7. Optimize physics simulation
8. Add performance monitoring

## Implementation Steps

1. **Performance Analysis**
   - Add Stats.js and browser performance profiling
   - Identify frame rate drops and bottlenecks
   - Measure draw calls, triangle count, and memory usage

2. **Geometry Optimization**
   - Merge static geometries to reduce draw calls
   - Use BufferGeometry instead of Geometry
   - Implement instancing for repeated objects
   - Simplify complex meshes

3. **LOD System**
   - Create multiple detail levels for complex objects
   - Add LOD switching based on camera distance
   - Test performance improvements

4. **Texture Optimization**
   - Resize textures to power-of-2 dimensions
   - Enable mipmapping
   - Use texture atlases where possible
   - Compress textures (consider basis/ktx2)

5. **Material Optimization**
   - Reduce number of unique materials
   - Disable shadows on distant objects
   - Use simpler materials for background objects

6. **Object Pooling**
   - Implement pool for bullets, particles, effects
   - Reuse objects instead of creating/destroying
   - Reduce garbage collection pressure

7. **Physics Optimization**
   - Use simple collision shapes
   - Reduce physics world size
   - Implement physics LOD

8. **Monitoring**
   - Add FPS counter
   - Monitor memory usage
   - Track draw calls and triangle count

## Expected Output

An optimized game with:
- Consistent 60 FPS performance
- Reduced draw calls by 50%+
- Lower memory usage
- Smoother gameplay
- Performance monitoring dashboard
- Detailed optimization report

## Performance Targets

- **Desktop**: 60 FPS at 1080p with < 1000 draw calls
- **Mobile**: 30-60 FPS at 720p with < 500 draw calls
- **Memory**: < 500MB total memory usage
- **Load Time**: < 5 seconds initial load

## Example Usage

After running this command:
- Game runs smoothly on target hardware
- Performance metrics displayed in-game
- Optimization report generated
- Identified bottlenecks resolved
- Ready for production deployment
