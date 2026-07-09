import CANNON from "cannon";
import * as dat from "lil-gui";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000,
);

camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

/**
 * Loaders
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
 * Debug
 */

const gui = new dat.GUI();
const materialTweaks = gui.addFolder("Material");
const cubeTweaks = gui.addFolder("Ice Cube");

const cubeVariables = {
	size: 0.5,
};

/**
 * Objects
 */

// ICE CUBE
const geometry = new RoundedBoxGeometry();
geometry.width = cubeVariables.size
geometry.height = cubeVariables.size
geometry.depth = cubeVariables.size
geometry.segments = 1;
geometry.radius = 0;
console.log(geometry);

const material = new THREE.MeshPhysicalMaterial();
material.roughness = 0.05;
material.ior = 1.3;
material.reflectivity = 1;
material.transmission = 1;
material.thickness = 0.3;
// material.map = texture              // diffuse/color
material.normalMap = normalTexture; // fake surface bumps
// material.aoMap = occTexture         // ambient occlusion (contact shadows)
material.roughnessMap = specTexture; // often specularity ≈ inverse of roughness map
material.displacementMap = dispTexture;
material.displacementScale = 0.05;
material.attenuationColor = new THREE.Color(0xe5e6e2); // the tint light takes on as it travels through
material.attenuationDistance = 0.5; // how far light travels before fully absorbing that tint

console.log(material);

const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

/**
 * Physics
 */
const world = new CANNON.World()
world.gravity.set(0, - 9.82, 0)
const cubeShape = new CANNON.Cube(cubeVariables.size)

const cubeBody = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 3, 0),
    shape: cubeShape
})

world.addBody(cubeBody)


/**
 * Animation
*/

const clock = new THREE.Clock()
let oldElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    world.step(1 / 60, deltaTime, 3)
}

function animate(time) {
	// cube.rotation.x = time / 2000;
	// cube.rotation.y = time / 1000;

	renderer.render(scene, camera);
}

/**
 * Debug
 */

cubeTweaks
	.add(cubeVariables, "size")
	.min(0)
	.max(3)
	.step(0.01)
	.name("size")
	.onChange((value) => {
		// console.log('value', value)
		cubeVariables.size = value;
		// console.log('size', cubeVariables.size)
		// console.log('geometry width', geometry.width)
		cube.geometry = new RoundedBoxGeometry(value, value, value);
	});

cubeTweaks.add(cube.position, "y").min(-3).max(3).step(0.01).name("elevation");

materialTweaks.add(material, "transmission").min(0).max(1).step(0.01);

materialTweaks.add(material, "roughness").min(0).max(1).step(0.01);

materialTweaks.add(material, "reflectivity").min(0).max(1).step(0.01);

materialTweaks.add(material, "thickness").min(0).max(1).step(0.01);
