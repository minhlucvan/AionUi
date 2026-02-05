uniform float uTime;
uniform vec3 uColor;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
    // Animated gradient based on UV coordinates and time
    vec3 color = uColor;
    color.r += sin(vUv.x * 10.0 + uTime) * 0.5;
    color.g += cos(vUv.y * 10.0 + uTime) * 0.5;
    color.b += sin((vUv.x + vUv.y) * 5.0 + uTime) * 0.5;

    gl_FragColor = vec4(color, 1.0);
}
