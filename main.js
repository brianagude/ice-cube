/** biome-ignore-all lint/complexity/useLiteralKeys: i prefer the current way */
import * as CANNON from "cannon-es";
import * as dat from "lil-gui";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

/**
 	TO DO:
	(1) Add texture to floor
	(2) DONE Connect floor tilt to arrow / wasd keys
	(3) DONE Find new env map, preferably a bar scene
	(4) Add melting ice effect, like the water trail when the ice cube slides
	(5) Add game mechanics (Countdown, melting ice effect, levels, etc.)
	(6) Fix THREE.Clock -> THREE.Timer error
	(7) Add visual way to control the floor, like face/head or hands. 
 */

/**
 * Debug
 */

// const gui = new dat.GUI();

const cubeVariables = {
	size: 1.5,
};

const floorVariables = {
	sizeW: 10, 		// width
	sizeH: 0.25,  // height
	sizeD: 10, 		// depth / diameter
	sizeS: 10 		// segments
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
	sizes.width = window.innerWidth;
	sizes.height = window.innerHeight;
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();
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

camera.position.z = 17;
camera.position.y = 5;
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
	"./environmentMaps/pretville_street.hdr",
	(environmentMap) => {
		environmentMap.mapping = THREE.EquirectangularReflectionMapping;
		scene.background = environmentMap;
		scene.environment = environmentMap;
	},
);

/**
 * Lights
 */

const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(3, 5, 2);
light.castShadow = true;
scene.add(light);

/**
 * Objects
 */

// ICE CUBE
const geometry = new RoundedBoxGeometry(
	cubeVariables.size,
	cubeVariables.size,
	cubeVariables.size,
);
geometry.radius = 0;

const material = new THREE.MeshPhysicalMaterial();
material.roughness = 0.05;
material.ior = 1.3;
material.reflectivity = 1;
material.transmission = 1;
material.thickness = 0.3;
material.normalMap = normalTexture;
material.roughnessMap = specTexture;
material.displacementMap = dispTexture;
material.displacementScale = 0.05;
material.attenuationColor = new THREE.Color(0xe5e6e2);
material.attenuationDistance = 0.5;

const cube = new THREE.Mesh(geometry, material);
cube.castShadow = true;
cube.position.y = 3;
scene.add(cube);

// FLOOR
const floor = new THREE.Mesh(
	new THREE.CylinderGeometry(
		floorVariables.sizeW,
		floorVariables.sizeW,
		floorVariables.sizeH,
		floorVariables.sizeS,
		// floorVariables.sizeD,
	),
	new THREE.MeshStandardMaterial({
		color: "#777777",
		metalness: 0.3,
		roughness: 0.4,
	}),
);
floor.receiveShadow = true;
floor.rotation.x = 0;
floor.rotation.z = 0;
scene.add(floor);

/**
 * Physics
 */

// WORLD
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// MATERIALS
const defaultMaterial = new CANNON.Material("default");

const defaultContactMaterial = new CANNON.ContactMaterial(
	defaultMaterial,
	defaultMaterial,
	{
		friction: 0,
		restitution: 0,
		linearDamping: 0.1,
	},
);

world.addContactMaterial(defaultContactMaterial);
world.defaultContactMaterial = defaultContactMaterial;

// PHYSICS CUBE
const cubeSize = new CANNON.Vec3(
	cubeVariables.size / 2,
	cubeVariables.size / 2,
	cubeVariables.size / 2,
);
const cubeShape = new CANNON.Box(cubeSize);
const cubeBody = new CANNON.Body({
	mass: 1,
	shape: cubeShape,
	position: new CANNON.Vec3(0, 3, 0),
	material: defaultMaterial,
	allowSleep: false,
});
world.addBody(cubeBody);

// PHYSICS FLOOR
// const floorSize = new CANNON.Vec3(
// 	floorVariables.sizeW / 2,
// 	floorVariables.sizeH / 2,
// 	floorVariables.sizeD / 2,
// );
// const floorShape = new CANNON.Box(floorSize);
const floorShape = new CANNON.Cylinder(floorVariables.sizeW, floorVariables.sizeW, floorVariables.sizeH, floorVariables.sizeS);
const floorBody = new CANNON.Body({
	mass: 0,
	shape: floorShape,
	material: defaultMaterial,
});
floorBody.quaternion.setFromEuler(floor.rotation.x, 0, floor.rotation.z);
world.addBody(floorBody);

/**
 * Animation
 */
const clock = new THREE.Clock();
let oldElapsedTime = 0;

let keysPressed = {}

const gameBtns = document.querySelectorAll('.game-controls button')
const upBtn = document.getElementById('btn-up')
const downBtn = document.getElementById('btn-down')
const leftBtn = document.getElementById('btn-left')
const rightBtn = document.getElementById('btn-right')

gameBtns.forEach(btn => {
	btn.addEventListener('mousedown', e => {
		keysPressed[e.target.id] = true
		e.target.classList.add('selected')
	})
	btn.addEventListener('mouseup', e => {
		keysPressed[e.target.id] = false
		e.target.classList.remove('selected')
	})
})

document.addEventListener('keydown', (event) => {
  keysPressed[event.key] = true
})
document.addEventListener('keyup', (event) => {
  keysPressed[event.key] = false
})

function reset() {
	keysPressed = {}
  cube.position.y = 3
	floor.rotation.x = 0
	floor.rotation.z = 0
}


const tick = () => {
	const elapsedTime = clock.getElapsedTime();
	const deltaTime = elapsedTime - oldElapsedTime;
	oldElapsedTime = elapsedTime;

	// Update physics
	world.step(1 / 60, deltaTime, 3);
	cube.position.copy(cubeBody.position);
	cube.quaternion.copy(cubeBody.quaternion);

	// Key events
	if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['btn-right']) {
		floor.rotation.z = Math.max(floor.rotation.z - 0.01, -0.3)
		floorBody.quaternion.setFromEuler(floor.rotation.x, 0, floor.rotation.z)
		rightBtn.classList.add('selected')
	} else {
		rightBtn.classList.remove('selected')
	}

	if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['btn-left']) {
		floor.rotation.z = Math.min(floor.rotation.z + 0.01, 0.3)
		floorBody.quaternion.setFromEuler(floor.rotation.x, 0, floor.rotation.z)
		leftBtn.classList.add('selected')
	} else {
		leftBtn.classList.remove('selected')
	}

	if (keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['btn-up']) {
		floor.rotation.x = Math.max(floor.rotation.x - 0.01, -0.3)
		floorBody.quaternion.setFromEuler(floor.rotation.x, 0, floor.rotation.z)
		upBtn.classList.add('selected')
	} else {
		upBtn.classList.remove('selected')
	}

	if (keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['btn-down']) {
		floor.rotation.x = Math.min(floor.rotation.x + 0.01, 0.3)
		floorBody.quaternion.setFromEuler(floor.rotation.x, 0, floor.rotation.z)
		downBtn.classList.add('selected')
	} else {
		downBtn.classList.remove('selected')
	}

	// console.log(cube.position.y)
	if (cube.position.y <= -10) reset()

	// Update controls
	controls.update();

	// Render
	renderer.render(scene, camera);

	window.requestAnimationFrame(tick);
};

tick();

/**
 * Debugger Settings
 */

// const floorTweaks = gui.addFolder("Floor");

// floorTweaks
// 	.add(floor.rotation, "x")
// 	.min(-0.3)
// 	.max(0.3)
// 	.step(0.01)
// 	.name("rotation x")
// 	.onChange(() => {
// 		floorBody.quaternion.setFromEuler(floor.rotation.x, 0, floor.rotation.z);
// 	});

// floorTweaks
// 	.add(floor.rotation, "z")
// 	.min(-0.3)
// 	.max(0.3)
// 	.step(0.01)
// 	.name("rotation z")
// 	.onChange(() => {
// 		floorBody.quaternion.setFromEuler(floor.rotation.x, 0, floor.rotation.z);
// 	});
