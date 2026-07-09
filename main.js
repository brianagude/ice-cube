import * as CANNON from 'cannon-es'
import * as dat from "lil-gui";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

/**
 * Debug
 */

const gui = new dat.GUI();

const cubeVariables = {
	size: 0.5,
};

const floorVariables = {
  position: 0,
	rotationX: 0.1,
	rotationZ: 0.1,
};

/**
 * Base
 */

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// Sizes
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
};

window.addEventListener("resize", () => {
	// Update sizes
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;

	// Update camera
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();

	// Update renderer
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Base camera
const camera = new THREE.PerspectiveCamera(
	75,
	sizes.width / sizes.height,
	0.1,
	100,
);

camera.position.z = 7;
camera.position.y = 3;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Renderer
const renderer = new THREE.WebGLRenderer({
	canvas: canvas,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Textures / Loaders
 */
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load("/textures/ice_color.jpg");
texture.colorSpace = THREE.SRGBColorSpace;

const dispTexture = textureLoader.load("/textures/ice_disp.png");
const normalTexture = textureLoader.load("/textures/ice_normal.jpg");
const occTexture = textureLoader.load("/textures/ice_occlusion.jpg");
const specTexture = textureLoader.load("/textures/ice_specularity.jpg");

const hdrLoader = new HDRLoader();
hdrLoader.load(
	"./environmentMaps/glasshouse_interior_4k.hdr",
	(environmentMap) => {
		environmentMap.mapping = THREE.EquirectangularReflectionMapping;
		scene.background = environmentMap;
		scene.environment = environmentMap;
	},
);

/**
 * Objects
 */

// ICE CUBE
const geometry = new RoundedBoxGeometry();
geometry.width = cubeVariables.size;
geometry.height = cubeVariables.size;
geometry.depth = cubeVariables.size;
geometry.segments = 1;
geometry.radius = 0;
// console.log(geometry);

const material = new THREE.MeshPhysicalMaterial();
material.roughness = 0.05;
material.ior = 1.3;
material.reflectivity = 1;
material.transmission = 1;
material.thickness = 0.3;
// material.map = texture                   // diffuse/color
material.normalMap = normalTexture; // fake surface bumps
// material.aoMap = occTexture              // ambient occlusion (contact shadows)
material.roughnessMap = specTexture; // often specularity ≈ inverse of roughness map
material.displacementMap = dispTexture;
material.displacementScale = 0.05;
material.attenuationColor = new THREE.Color(0xe5e6e2); // the tint light takes on as it travels through
material.attenuationDistance = 0.5; // how far light travels before fully absorbing that tint

// console.log(material);

const cube = new THREE.Mesh(geometry, material);
cube.position.y = 3
scene.add(cube);

// FLOOR
const floor = new THREE.Mesh(
	new THREE.BoxGeometry(10, 0.5, 10),
	new THREE.MeshStandardMaterial({
		color: "#777777",
		metalness: 0.3,
		roughness: 0.4,
	}),
);
floor.receiveShadow = true;
floor.position.y = floorVariables.position
floor.rotation.x = Math.PI * floorVariables.rotationX
floor.rotation.z = Math.PI * floorVariables.rotationZ
scene.add(floor);
console.log('floor', floor)

/**
 * Physics
 */

// WORLD
const world = new CANNON.World()
world.gravity.set(0, - 9.82, 0)

// MATERIALS
const defaultMaterial = new CANNON.Material('default')

const defaultContactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  {
    friction: 0.1,
  }
)

world.addContactMaterial(defaultContactMaterial)

// PHYSICS CUBE
const cubeSize = new CANNON.Vec3(cubeVariables.size, cubeVariables.size, cubeVariables.size)
const cubeShape = new CANNON.Box(cubeSize)
const cubeBody = new CANNON.Body({ mass: 1, shape: cubeShape, position: new CANNON.Vec3(0, 3, 0), material: defaultMaterial })
world.addBody(cubeBody)

// PHYSICS FLOOR
const floorSize = new CANNON.Vec3(10, 0.5, 10)
const floorShape = new CANNON.Box(floorSize)
const floorBody = new CANNON.Body({ 
  mass: 0, 
  shape: floorShape, 
  material: defaultMaterial, 
  position: new CANNON.Vec3(0, floorVariables.position, 0) 
})
floorBody.quaternion.setFromEuler(
  Math.PI * floorVariables.rotationX,
  0,
  Math.PI * floorVariables.rotationZ
)
world.addBody(floorBody)

/**
 * Animation
 */
const clock = new THREE.Clock();
let oldElapsedTime = 0

const tick = () => {
	const elapsedTime = clock.getElapsedTime()
  const deltaTime = elapsedTime - oldElapsedTime
  oldElapsedTime = elapsedTime

  // Update physics
  world.step(1 / 60, deltaTime, 3)
  cube.position.copy(cubeBody.position)
  cube.quaternion.copy(cubeBody.quaternion)

	// Update controls
	controls.update();

	// Render
	renderer.render(scene, camera);

	// Call tick again on the next frame
	window.requestAnimationFrame(tick);
};

tick();

/**
 * Debugger Settings
 */
const materialTweaks = gui.addFolder("Material");
const cubeTweaks = gui.addFolder("Ice Cube");
const floorTweaks = gui.addFolder("Floor");

cubeTweaks
	.add(cubeVariables, "size")
	.min(0)
	.max(3)
	.step(0.01)
	.name("size")
	.onChange((value) => {
		cubeVariables.size = value;
		cube.geometry = new RoundedBoxGeometry(value, value, value);
	});

cubeTweaks.add(cube.position, "y").min(-3).max(3).step(0.01).name("elevation");

materialTweaks.add(material, "transmission").min(0).max(1).step(0.01);

materialTweaks.add(material, "roughness").min(0).max(1).step(0.01);

materialTweaks.add(material, "reflectivity").min(0).max(1).step(0.01);

materialTweaks.add(material, "thickness").min(0).max(1).step(0.01);


floorTweaks
  .add(floor.rotation, "x")
  .min(-0.4)
  .max(0.4).step(0.01)
  .onChange((value) => {
    floorVariables.rotationX = value;
    floorBody.quaternion.setFromEuler(
      Math.PI * floorVariables.rotationX,
      0,
      Math.PI * floorVariables.rotationZ
    )
  });

floorTweaks
  .add(floor.rotation, "z")
  .min(-0.4)
  .max(0.4)
  .step(0.01)
  .onChange((value) => {
		floorVariables.rotationZ = value;
    floorBody.quaternion.setFromEuler(
      Math.PI * floorVariables.rotationX,
      0,
      Math.PI * floorVariables.rotationZ
    )
	});;


