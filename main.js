import CANNON from "cannon";
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

camera.position.z = 5;
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
console.log(geometry);

const material = new THREE.MeshPhysicalMaterial();
material.roughness = 0.05;
material.ior = 1.3;
material.reflectivity = 1;
material.transmission = 1;
material.thickness = 0.3;
// material.map = texture                   // diffuse/color
material.normalMap = normalTexture;         // fake surface bumps
// material.aoMap = occTexture              // ambient occlusion (contact shadows)
material.roughnessMap = specTexture;        // often specularity ≈ inverse of roughness map
material.displacementMap = dispTexture;
material.displacementScale = 0.05;
material.attenuationColor = new THREE.Color(0xe5e6e2); // the tint light takes on as it travels through
material.attenuationDistance = 0.5;         // how far light travels before fully absorbing that tint

console.log(material);

const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

/**
 * Physics
 */
// const world = new CANNON.World();
// world.gravity.set(0, -9.82, 0);
// const cubeShape = new CANNON.Box(cubeVariables.size);

// const cubeBody = new CANNON.Body({
// 	mass: 1,
// 	position: new CANNON.Vec3(0, 3, 0),
// 	shape: cubeShape,
// });

// world.addBody(cubeBody);



/**
 * Animation
 */
const clock = new THREE.Clock();

const tick = () => {
	const elapsedTime = clock.getElapsedTime();

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
