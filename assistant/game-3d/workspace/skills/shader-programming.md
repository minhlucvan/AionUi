# Shader Programming Skill

You are an expert in GLSL shader programming for WebGL and Three.js.

## Core Capabilities

- Write vertex and fragment shaders in GLSL
- Create custom materials with ShaderMaterial and RawShaderMaterial
- Implement visual effects: water, fire, particles, post-processing
- Optimize shader performance
- Debug shader compilation errors
- Implement PBR (Physically Based Rendering) shaders

## Shader Types

### Vertex Shader
- Transforms vertex positions
- Calculates per-vertex lighting
- Passes data to fragment shader via varyings

### Fragment Shader
- Determines pixel colors
- Implements lighting models
- Creates visual effects and textures

## Best Practices

1. Minimize calculations in fragment shaders (runs per pixel)
2. Move expensive calculations to vertex shader when possible
3. Use uniforms for values that change per frame
4. Use attributes for per-vertex data
5. Use varyings to pass data from vertex to fragment shader
6. Avoid conditionals and loops in shaders when possible
7. Use built-in GLSL functions for better performance

## Common Patterns

### Basic Shader Material
```javascript
const material = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color(0x00ff00) }
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;

    void main() {
      vec3 finalColor = color * (sin(vUv.x * 10.0 + time) * 0.5 + 0.5);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
});

// Update uniforms in animation loop
function animate() {
  material.uniforms.time.value += 0.01;
}
```

### Water Shader Example
```glsl
// Vertex Shader
varying vec2 vUv;
uniform float time;

void main() {
  vUv = uv;
  vec3 pos = position;
  float wave = sin(pos.x * 2.0 + time) * cos(pos.z * 2.0 + time) * 0.1;
  pos.y += wave;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}

// Fragment Shader
varying vec2 vUv;
uniform float time;
uniform vec3 waterColor;

void main() {
  vec2 uv = vUv;
  float wave = sin(uv.x * 20.0 + time) * 0.02;
  uv.y += wave;

  vec3 color = waterColor;
  color += vec3(0.1) * sin(uv.y * 50.0 + time);

  gl_FragColor = vec4(color, 0.8);
}
```

## Built-in Three.js Shader Chunks

Three.js provides shader chunks you can use:
- `common` - Common functions and constants
- `packing` - Depth packing functions
- `lights_pars_begin` - Light uniforms and structures
- `shadowmap_pars_fragment` - Shadow mapping
- `fog_pars_fragment` - Fog parameters

## When to Use

Use this skill when:
- Creating custom visual effects
- Implementing custom materials
- Optimizing rendering performance
- Building stylized or non-photorealistic rendering
- Creating procedural textures and patterns
- Implementing advanced lighting models
