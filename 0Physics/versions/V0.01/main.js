
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { PointerLockControls } from
  "three/addons/controls/PointerLockControls.js";

// ------------------------------------
// 1. SCENE AND CAMERA
// ------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bc8e8);
scene.fog = new THREE.Fog(0x9bc8e8, 35, 100);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

camera.position.set(0, 1.7, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ------------------------------------
// 2. LIGHTING
// ------------------------------------

scene.add(new THREE.HemisphereLight(0xffffff, 0x64745c, 2));

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(-10, 20, 10);
sun.castShadow = true;
scene.add(sun);

// ------------------------------------
// 3. PHYSICS
// ------------------------------------

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.allowSleep = true;

const groundMaterial = new CANNON.Material("ground");
const objectMaterial = new CANNON.Material("objects");

world.defaultContactMaterial.friction = 0.5;
world.defaultContactMaterial.restitution = 0.3;

world.addContactMaterial(new CANNON.ContactMaterial(
  groundMaterial,
  objectMaterial,
  { friction: 0.65, restitution: 0.3 }
));

// The ground is both visible and physically solid.
const ground = new THREE.Mesh(
  new THREE.BoxGeometry(200, 0.2, 200),
  new THREE.MeshStandardMaterial({ color: 0x71a85a })
);

ground.position.y = -0.1;
ground.receiveShadow = true;
scene.add(ground);

const groundBody = new CANNON.Body({
  mass: 0,
  material: groundMaterial,
  shape: new CANNON.Box(new CANNON.Vec3(100, 0.1, 100))
});

groundBody.position.set(0, -0.1, 0);
world.addBody(groundBody);

// The basketball hoop is behind the objects, along the z-axis.
const hoopZ = -10;
const hoopMaterial = new THREE.MeshStandardMaterial({
  color: 0xf4f4f0,
  roughness: 0.4
});
const pole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.11, 3.1, 12),
  new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.55 })
);
pole.position.set(0, 1.45, hoopZ - 0.65);
pole.castShadow = true;
scene.add(pole);

const backboard = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 1.05, 0.1),
  hoopMaterial
);
backboard.position.set(0, 3.55, hoopZ);
backboard.castShadow = true;
backboard.receiveShadow = true;
scene.add(backboard);

const targetBox = new THREE.Mesh(
  new THREE.BoxGeometry(0.65, 0.42, 0.025),
  new THREE.MeshStandardMaterial({ color: 0x2563eb })
);
targetBox.position.set(0, 3.28, hoopZ + 0.065);
scene.add(targetBox);

const rimZ = hoopZ + 0.48;
const rimY = 3.02;
const rim = new THREE.Mesh(
  new THREE.TorusGeometry(0.46, 0.045, 10, 32),
  new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.45,
    metalness: 0.15
  })
);
rim.rotation.x = Math.PI / 2;
rim.position.set(0, rimY, rimZ);
rim.castShadow = true;
scene.add(rim);

const backboardBody = new CANNON.Body({ mass: 0 });
backboardBody.addShape(new CANNON.Box(new CANNON.Vec3(0.9, 0.525, 0.05)));
backboardBody.position.set(0, 3.55, hoopZ);
world.addBody(backboardBody);

const poleBody = new CANNON.Body({ mass: 0 });
poleBody.addShape(new CANNON.Cylinder(0.08, 0.11, 3.1, 12));
poleBody.position.copy(pole.position);
world.addBody(poleBody);

// Small collision points give the rim a physical edge while letting the ball pass through.
for (let index = 0; index < 16; index += 1) {
  const angle = (index / 16) * Math.PI * 2;
  const rimCollider = new CANNON.Body({ mass: 0 });
  rimCollider.addShape(new CANNON.Sphere(0.045));
  rimCollider.position.set(
    Math.cos(angle) * 0.46,
    rimY,
    rimZ + Math.sin(angle) * 0.46
  );
  world.addBody(rimCollider);
}

// ------------------------------------
// 4. FIRST-PERSON CONTROLS
// ------------------------------------

const controls = new PointerLockControls(camera, renderer.domElement);
const startButton = document.querySelector("#start");
const startMenuButton = document.querySelector("#start-menu");
const statusText = document.querySelector("#status");
const heldText = document.querySelector("#held");
const scoreText = document.querySelector("#score");

let gameStarted = false;
let heldItem = null;
let score = 0;
const confettiPieces = [];

startButton.addEventListener("click", () => {
  gameStarted = true;
  controls.lock();
});

startMenuButton.addEventListener("click", () => {
  window.location.href = "../../index.html";
});

controls.addEventListener("lock", () => {
  startButton.hidden = true;
  startMenuButton.hidden = true;
  statusText.textContent = "Find something to pick up!";
});

controls.addEventListener("unlock", () => {
  startButton.hidden = false;
  startMenuButton.hidden = true;
  startButton.textContent = "Continue";
  if (gameStarted) startMenuButton.hidden = false;
});

// ------------------------------------
// 5. CREATE BOXES AND BOTTLES
// ------------------------------------

const items = [];

const boxGeometry = new THREE.BoxGeometry(0.65, 0.65, 0.65);
const bottleGeometry = new THREE.CylinderGeometry(
  0.16, 0.19, 0.65, 12
);
const basketballGeometry = new THREE.SphereGeometry(0.3, 24, 16);

function createItem(type, x, y, z, color) {
  const isBottle = type === "Bottle";
  const isBasketball = type === "Basketball";

  const mesh = new THREE.Mesh(
    isBottle ? bottleGeometry : isBasketball ? basketballGeometry : boxGeometry,
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.55,
      metalness: isBottle ? 0.1 : 0
    })
  );

  if (isBasketball) {
    const seamMaterial = new THREE.MeshStandardMaterial({ color: 0x29201a });
    const seamGeometry = new THREE.TorusGeometry(0.302, 0.012, 6, 32);

    for (const rotation of [
      [Math.PI / 2, 0, 0],
      [0, Math.PI / 2, 0],
      [Math.PI / 4, Math.PI / 4, 0]
    ]) {
      const seam = new THREE.Mesh(seamGeometry, seamMaterial);
      seam.rotation.set(...rotation);
      mesh.add(seam);
    }
  }

  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(x, y, z);
  scene.add(mesh);

  const shape = isBasketball
    ? new CANNON.Sphere(0.3)
    : isBottle
    ? new CANNON.Cylinder(0.16, 0.19, 0.65, 12)
    : new CANNON.Box(new CANNON.Vec3(0.325, 0.325, 0.325));

  const body = new CANNON.Body({
    mass: isBasketball ? 0.62 : isBottle ? 0.6 : 1.5,
    material: objectMaterial,
    shape,
    linearDamping: 0.12,
    angularDamping: 0.2,
    allowSleep: true
  });

  body.position.set(x, y, z);
  world.addBody(body);

  const item = {
    type,
    mesh,
    body,
    originalMass: body.mass,
    previousY: y
  };

  mesh.userData.item = item;
  items.push(item);
  return item;
}

// Bottles
createItem("Bottle", -2, 1, 0, 0x29c9e8);
createItem("Bottle", 2, 1, -3, 0x44d17b);
createItem("Bottle", 4, 1, 2, 0xf2cf59);

// Boxes
createItem("Box", 0, 0.33, -2, 0xc97d45);
createItem("Box", -3, 0.33, -4, 0xd7e0e9);
createItem("Box", 3, 0.33, 4, 0xe76b62);

// The basketball starts under the hoop and can be picked up and thrown.
createItem("Basketball", 0, 0.31, rimZ, 0xe87520);

// ------------------------------------
// 6. FIND THE ITEM YOU ARE LOOKING AT
// ------------------------------------

const raycaster = new THREE.Raycaster();
raycaster.far = 4;

function findTarget() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  const meshes = items
    .filter(item => item !== heldItem)
    .map(item => item.mesh);

  const hits = raycaster.intersectObjects(meshes);

  return hits.length > 0 ? hits[0].object.userData.item : null;
}

// ------------------------------------
// 7. PICK UP AND DROP
// ------------------------------------

function setHeld(item) {
  heldItem = item;

  if (item) {
    item.body.type = CANNON.Body.KINEMATIC;
    item.body.mass = 0;
    item.body.updateMassProperties();
    item.body.velocity.set(0, 0, 0);
    item.body.angularVelocity.set(0, 0, 0);
    item.body.collisionResponse = false;

    statusText.textContent = "Left-click to throw!";
    heldText.textContent = item.type;
  } else {
    heldText.textContent = "None";
    statusText.textContent = "Aim at an item and press E.";
  }
}

function releaseItem(throwItem = false) {
  if (!heldItem) return;

  const item = heldItem;
  heldItem = null;

  item.body.type = CANNON.Body.DYNAMIC;
  item.body.mass = item.originalMass;
  item.body.updateMassProperties();
  item.body.collisionResponse = true;
  item.body.wakeUp();

  if (throwItem) {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    const throwSpeed = 11;

    item.body.velocity.set(
      direction.x * throwSpeed,
      direction.y * throwSpeed + 1.5,
      direction.z * throwSpeed
    );

    // A little random rotation makes throws feel more dynamic.
    item.body.angularVelocity.set(
      Math.random() * 5,
      Math.random() * 5,
      Math.random() * 5
    );

    statusText.textContent = "Threw " + item.type.toLowerCase() + "!";
  } else {
    statusText.textContent = "The item was dropped.";
  }

  heldText.textContent = "None";
}

// E picks up or drops items.
document.addEventListener("keydown", event => {
  if (event.code !== "KeyE" || event.repeat) return;
  if (!controls.isLocked) return;

  if (heldItem) {
    releaseItem(false);
    return;
  }

  const target = findTarget();

  if (target) {
    setHeld(target);
  } else {
    statusText.textContent = "Aim closer to an item.";
  }
});

// The left mouse button throws the item.
document.addEventListener("mousedown", event => {
  if (event.button === 0 && controls.isLocked && heldItem) {
    releaseItem(true);
  }
});

// ------------------------------------
// 8. MOVEMENT
// ------------------------------------

const keys = {};
const playerHeight = 1.7;
const jumpSpeed = 5.5;
const gravity = 18;
let verticalOffset = 0;
let verticalVelocity = 0;

document.addEventListener("keydown", event => {
  keys[event.code] = true;

  if (event.code === "Space" && controls.isLocked) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", event => {
  keys[event.code] = false;
});

function movePlayer(delta) {
  if (!controls.isLocked) return;

  const sprintMultiplier = keys["ShiftLeft"] || keys["ShiftRight"] ? 1.8 : 1;
  const speed = 5 * sprintMultiplier * delta;

  if (keys["KeyW"]) controls.moveForward(speed);
  if (keys["KeyS"]) controls.moveForward(-speed);
  if (keys["KeyA"]) controls.moveRight(-speed);
  if (keys["KeyD"]) controls.moveRight(speed);

  if (keys["Space"] && verticalOffset === 0) {
    verticalVelocity = jumpSpeed;
  }

  verticalVelocity -= gravity * delta;
  verticalOffset = Math.max(0, verticalOffset + verticalVelocity * delta);

  if (verticalOffset === 0) {
    verticalVelocity = 0;
  }

  camera.position.y = playerHeight + verticalOffset;
}

// ------------------------------------
// 9. GAME UPDATE
// ------------------------------------

const clock = new THREE.Clock();
const heldOffset = new THREE.Vector3();
const heldDirection = new THREE.Vector3();
const confettiGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.025);
const confettiMaterials = [
  0xff3b30, 0xffcc00, 0x34c759, 0x007aff, 0xaf52de
].map(color => new THREE.MeshStandardMaterial({ color }));

function launchConfetti() {
  for (let index = 0; index < 70; index += 1) {
    const piece = new THREE.Mesh(
      confettiGeometry,
      confettiMaterials[index % confettiMaterials.length]
    );
    piece.position.set(
      (Math.random() - 0.5) * 0.8,
      rimY - 0.25,
      rimZ + (Math.random() - 0.5) * 0.8
    );
    piece.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    scene.add(piece);

    confettiPieces.push({
      mesh: piece,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        4 + Math.random() * 5,
        (Math.random() - 0.5) * 5
      ),
      rotationSpeed: new THREE.Vector3(
        Math.random() * 10,
        Math.random() * 10,
        Math.random() * 10
      ),
      age: 0,
      lifetime: 2 + Math.random() * 1.5
    });
  }
}

function checkHoopScores() {
  for (const item of items) {
    const currentY = item.body.position.y;
    const passedDownThroughRim =
      item.previousY > rimY &&
      currentY <= rimY &&
      item.body.velocity.y < 0;
    const distanceFromCenter = Math.hypot(
      item.body.position.x,
      item.body.position.z - rimZ
    );

    if (passedDownThroughRim && distanceFromCenter < 0.4) {
      score += 1;
      scoreText.textContent = String(score);
      statusText.textContent = `Score! The ${item.type.toLowerCase()} went through the hoop!`;
      launchConfetti();
    }

    item.previousY = currentY;
  }
}

function updateConfetti(delta) {
  for (let index = confettiPieces.length - 1; index >= 0; index -= 1) {
    const piece = confettiPieces[index];
    piece.age += delta;
    piece.velocity.y -= 9.82 * delta;
    piece.mesh.position.addScaledVector(piece.velocity, delta);
    piece.mesh.rotation.x += piece.rotationSpeed.x * delta;
    piece.mesh.rotation.y += piece.rotationSpeed.y * delta;
    piece.mesh.rotation.z += piece.rotationSpeed.z * delta;

    if (piece.age >= piece.lifetime) {
      scene.remove(piece.mesh);
      confettiPieces.splice(index, 1);
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  movePlayer(delta);

  // Position the held item in front of the camera.
  if (heldItem) {
    camera.getWorldDirection(heldDirection);

    heldOffset.copy(camera.position)
      .addScaledVector(heldDirection, 1.5);

    heldItem.body.position.set(
      heldOffset.x,
      heldOffset.y,
      heldOffset.z
    );

    heldItem.body.quaternion.set(
      camera.quaternion.x,
      camera.quaternion.y,
      camera.quaternion.z,
      camera.quaternion.w
    );

    heldItem.body.velocity.set(0, 0, 0);
    heldItem.body.angularVelocity.set(0, 0, 0);
  }

  // Update the physics.
  world.step(1 / 60, delta, 3);
  checkHoopScores();
  updateConfetti(delta);

  // Synchronize the 3D models with the physics.
  for (const item of items) {
    item.mesh.position.copy(item.body.position);
    item.mesh.quaternion.copy(item.body.quaternion);
  }

  renderer.render(scene, camera);
}

animate();

// Resize the view when the window size changes.
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});