import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Scene Setup
 */
const canvas = document.querySelector('#webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

/**
 * Physics World
 */
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

/**
 * Materials
 */
const defaultMaterial = new CANNON.Material('default');
const defaultContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
  friction: 0.3,
  restitution: 0.6,
});
world.addContactMaterial(defaultContactMaterial);

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(10, 10, 10);
scene.add(camera);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

/**
 * Controls
 */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
scene.add(directionalLight);

/**
 * Floor
 */
const floorGeometry = new THREE.PlaneGeometry(30, 30);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x3a7d44 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body({
  mass: 0,
  shape: floorShape,
  material: defaultMaterial,
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

/**
 * Objects to Update
 */
const objectsToUpdate = [];

/**
 * Create Box
 */
function createBox(width, height, depth, position) {
  // Three.js mesh
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      metalness: 0.3,
      roughness: 0.4,
    })
  );
  mesh.position.copy(position);
  mesh.castShadow = true;
  scene.add(mesh);

  // Cannon.js body
  const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
  const body = new CANNON.Body({
    mass: 1,
    shape: shape,
    material: defaultMaterial,
  });
  body.position.copy(position);
  world.addBody(body);

  objectsToUpdate.push({ mesh, body });

  document.getElementById('objects').textContent = objectsToUpdate.length;
}

/**
 * Mouse Click to Spawn
 */
window.addEventListener('click', () => {
  createBox(Math.random() + 0.5, Math.random() + 0.5, Math.random() + 0.5, {
    x: (Math.random() - 0.5) * 3,
    y: 8,
    z: (Math.random() - 0.5) * 3,
  });
});

/**
 * Reset Scene
 */
window.addEventListener('keydown', (event) => {
  if (event.key === 'r' || event.key === 'R') {
    objectsToUpdate.forEach(({ mesh, body }) => {
      scene.remove(mesh);
      world.removeBody(body);
    });
    objectsToUpdate.length = 0;
    document.getElementById('objects').textContent = '0';
  }
});

/**
 * FPS Counter
 */
let lastTime = performance.now();
let frames = 0;

function updateFPS() {
  const currentTime = performance.now();
  frames++;
  if (currentTime >= lastTime + 1000) {
    document.getElementById('fps').textContent = Math.round((frames * 1000) / (currentTime - lastTime));
    frames = 0;
    lastTime = currentTime;
  }
}

/**
 * Resize Handler
 */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Animation Loop
 */
const clock = new THREE.Clock();
let oldElapsedTime = 0;

function animate() {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  // Update physics
  world.step(1 / 60, deltaTime, 3);

  // Update objects
  objectsToUpdate.forEach(({ mesh, body }) => {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  });

  // Update controls
  controls.update();

  // Update FPS
  updateFPS();

  // Render
  renderer.render(scene, camera);

  requestAnimationFrame(animate);
}

animate();

// Create initial boxes
createBox(1, 1, 1, { x: 0, y: 5, z: 0 });
createBox(1, 1, 1, { x: 1, y: 7, z: 0 });
createBox(1, 1, 1, { x: -1, y: 9, z: 0 });
