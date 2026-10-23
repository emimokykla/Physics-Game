
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
const basketballMaterial = new CANNON.Material("basketball");

world.defaultContactMaterial.friction = 0.5;
world.defaultContactMaterial.restitution = 0.3;

world.addContactMaterial(new CANNON.ContactMaterial(
  groundMaterial,
  objectMaterial,
  { friction: 0.35, restitution: 0.05 }
));

world.addContactMaterial(new CANNON.ContactMaterial(
  groundMaterial,
  basketballMaterial,
  { friction: 0.45, restitution: 0.585 }
));

world.addContactMaterial(new CANNON.ContactMaterial(
  objectMaterial,
  basketballMaterial,
  { friction: 0.45, restitution: 0.4875 }
));

const collisionMeshes = [];
const pushableObjects = [];
const playerMass = 80;

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

// A small table sits behind the player's starting position.
const tableMaterial = new THREE.MeshStandardMaterial({
  color: 0x8b5a2b,
  roughness: 0.75
});
const tableParts = [
  { size: [1.8, 0.12, 1.2], position: [0, 0.81, 7.5] },
  ...[-0.78, 0.78].flatMap(x =>
    [-0.48, 0.48].map(z => ({
      size: [0.12, 0.75, 0.12],
      position: [x, 0.375, 7.5 + z]
    }))
  )
];
const tableBody = new CANNON.Body({
  mass: 0,
  material: groundMaterial
});
tableBody.position.set(0, 0.75, 7.5);
const table = {
  type: "table",
  meshes: [],
  bodies: [tableBody],
  offsets: []
};

for (const part of tableParts) {
  const [width, height, depth] = part.size;
  const [x, y, z] = part.position;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    tableMaterial
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  collisionMeshes.push(mesh);

  const offset = new CANNON.Vec3(x, y - 0.75, z - 7.5);
  tableBody.addShape(
    new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)),
    offset
  );
  table.meshes.push(mesh);
  table.offsets.push(offset);
}
world.addBody(tableBody);

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
collisionMeshes.push(pole);

const backboard = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 1.05, 0.1),
  hoopMaterial
);
backboard.position.set(0, 3.55, hoopZ);
backboard.castShadow = true;
backboard.receiveShadow = true;
scene.add(backboard);
collisionMeshes.push(backboard);

const targetBox = new THREE.Mesh(
  new THREE.BoxGeometry(0.65, 0.42, 0.025),
  new THREE.MeshStandardMaterial({ color: 0x2563eb })
);
targetBox.position.set(0, 3.28, hoopZ + 0.065);
scene.add(targetBox);
collisionMeshes.push(targetBox);

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
collisionMeshes.push(rim);

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
const menu = document.querySelector("#menu");
const selectedMapText = document.querySelector("#selected-map");
const hud = document.querySelector("#hud");
const startButton = document.querySelector("#start");
const startMenuButton = document.querySelector("#start-menu");
const heldText = document.querySelector("#held");
const scoreText = document.querySelector("#score");
const scoreRow = document.querySelector("#score-row");
const buildStatus = document.querySelector("#build-status");
const interactionHint = document.querySelector("#interaction-hint");

let heldItem = null;
let score = 0;
let officeCase = null;
let assemblyMat = null;
let pcPlacedOnMat = false;
let monitorScreen = null;
let monitorOn = false;
const buildComponents = ["Motherboard", "CPU", "RAM", "GPU", "PSU", "SSD"];
const confettiPieces = [];

startButton.addEventListener("click", () => {
  controls.lock();
});

startMenuButton.addEventListener("click", () => {
  window.location.href = "../../index.html";
});

controls.addEventListener("lock", () => {
  menu.hidden = true;
  hud.hidden = false;
});

controls.addEventListener("unlock", () => {
  menu.hidden = false;
  hud.hidden = true;
  startButton.textContent = "Continue";
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
const reusableItemGeometries = new Set([
  boxGeometry,
  bottleGeometry,
  basketballGeometry
]);

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
    mass: isBasketball ? 0.62 : isBottle ? 0.6 : 1,
    material: isBasketball ? basketballMaterial : objectMaterial,
    shape,
    linearDamping: isBasketball ? 0.03 : 0.12,
    angularDamping: isBasketball ? 0.08 : isBottle ? 0.25 : 0.4,
    allowSleep: true
  });

  body.position.set(x, y, z);
  world.addBody(body);
  pushableObjects.push({
    type: "item",
    mass: body.mass,
    meshes: [mesh],
    bodies: [body],
    item: null
  });

  const item = {
    type,
    mesh,
    body,
    originalMass: body.mass,
    previousY: y,
    lastPosition: new THREE.Vector3(x, y, z)
  };

  pushableObjects[pushableObjects.length - 1].item = item;
  mesh.userData.item = item;
  items.push(item);
  return item;
}

function createHardwareItem(type, x, y, z, width, height, depth, mass, color, details = []) {
  const group = new THREE.Group();
  const baseMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.68,
    metalness: type === "PC Case" || type === "GPU" || type === "PSU" ? 0.35 : 0.05
  });
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    baseMaterial
  );
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  for (const detail of details) {
    const detailMesh = new THREE.Mesh(
      new THREE.BoxGeometry(...detail.size),
      new THREE.MeshStandardMaterial({
        color: detail.color,
        roughness: 0.55,
        metalness: detail.metalness || 0
      })
    );
    detailMesh.position.set(...detail.position);
    detailMesh.castShadow = true;
    detailMesh.receiveShadow = true;
    group.add(detailMesh);
  }

  group.position.set(x, y, z);
  scene.add(group);

  const body = new CANNON.Body({
    mass,
    material: objectMaterial,
    shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)),
    linearDamping: 0.16,
    angularDamping: 0.45,
    allowSleep: true
  });
  body.position.set(x, y, z);
  world.addBody(body);

  const item = {
    type,
    mesh: group,
    body,
    originalMass: mass,
    isHardware: true,
    previousY: y,
    lastPosition: new THREE.Vector3(x, y, z)
  };
  for (const child of group.children) {
    child.userData.item = item;
  }
  group.userData.item = item;
  items.push(item);
  pushableObjects.push({
    type: "hardware",
    mass,
    meshes: [group],
    bodies: [body],
    item
  });
  return item;
}

function createOfficeCase(x, y, z) {
  const item = createHardwareItem(
    "Office PC Case", x, y, z, 0.62, 0.98, 0.6, 6.5, 0xd1c6a5
  );
  const shell = item.mesh;
  const originalBody = shell.children[0];
  shell.remove(originalBody);
  originalBody.geometry.dispose();
  originalBody.material.dispose();

  const beigeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1c6a5,
    roughness: 0.82
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: 0x313638,
    roughness: 0.72
  });
  const panels = [
    { size: [0.62, 0.035, 0.6], position: [0, 0.472, 0] },
    { size: [0.62, 0.035, 0.6], position: [0, -0.472, 0] },
    { size: [0.62, 0.91, 0.035], position: [0, 0, -0.282] },
    { size: [0.035, 0.91, 0.6], position: [-0.292, 0, 0] },
    { size: [0.62, 0.91, 0.035], position: [0, 0, 0.282] },
    { size: [0.035, 0.91, 0.08], position: [0.292, 0, -0.26] },
    { size: [0.035, 0.91, 0.08], position: [0.292, 0, 0.26] },
    { size: [0.035, 0.08, 0.44], position: [0.292, 0.415, 0] },
    { size: [0.035, 0.08, 0.44], position: [0.292, -0.415, 0] },
    { size: [0.012, 0.73, 0.48], position: [-0.271, 0, 0], material: darkMaterial }
  ];

  for (const panel of panels) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...panel.size),
      panel.material || beigeMaterial
    );
    mesh.position.set(...panel.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.item = item;
    shell.add(mesh);
  }

  const frontDetails = [
    { size: [0.43, 0.12, 0.018], position: [0, 0.31, 0.303], color: 0x8d876f },
    { size: [0.43, 0.025, 0.02], position: [0, 0.31, 0.316], color: 0x55574f },
    { size: [0.43, 0.12, 0.018], position: [0, 0.12, 0.303], color: 0x8d876f },
    { size: [0.43, 0.025, 0.02], position: [0, 0.12, 0.316], color: 0x55574f },
    { size: [0.43, 0.3, 0.018], position: [0, -0.18, 0.303], color: 0xa9a187 },
    { size: [0.035, 0.035, 0.025], position: [-0.22, 0.39, 0.31], color: 0x466d45 },
    { size: [0.045, 0.045, 0.025], position: [0.21, 0.39, 0.31], color: 0x7d7a70 }
  ];
  for (const detail of frontDetails) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...detail.size),
      new THREE.MeshStandardMaterial({ color: detail.color, roughness: 0.75 })
    );
    mesh.position.set(...detail.position);
    mesh.castShadow = true;
    mesh.userData.item = item;
    shell.add(mesh);
  }

  item.isOfficeCase = true;
  item.installedComponents = new Set();
  item.mesh.rotation.x = -Math.PI / 2;
  item.body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  item.placementQuaternion = item.body.quaternion.clone();
  return item;
}

function createCaseGlass(x, y, z) {
  const glass = createHardwareItem(
    "PC Case Glass", x, y, z, 0.012, 0.73, 0.48, 0.8, 0x75cce0,
    [
      { size: [0.025, 0.73, 0.025], position: [-0.008, 0, -0.228], color: 0x68757a, metalness: 0.3 },
      { size: [0.025, 0.73, 0.025], position: [-0.008, 0, 0.228], color: 0x68757a, metalness: 0.3 },
      { size: [0.025, 0.025, 0.48], position: [-0.008, 0.352, 0], color: 0x68757a, metalness: 0.3 },
      { size: [0.025, 0.025, 0.48], position: [-0.008, -0.352, 0], color: 0x68757a, metalness: 0.3 }
    ]
  );
  glass.mesh.children[0].material.transparent = true;
  glass.mesh.children[0].material.opacity = 0.38;
  glass.mesh.children[0].material.roughness = 0.12;
  glass.mesh.children[0].material.metalness = 0.12;
  glass.mesh.rotation.x = Math.PI / 2;
  glass.body.quaternion.setFromEuler(Math.PI / 2, 0, 0);
  glass.body.aabbNeedsUpdate = true;
  glass.body.updateAABB();
  glass.isCaseGlass = true;
  return glass;
}

function buildRoomMap() {
  for (const body of [...world.bodies]) {
    world.removeBody(body);
  }

  for (const child of [...scene.children]) {
    if (child.isLight) continue;
    scene.remove(child);
    child.traverse(object => {
      if (!object.isMesh) return;
      if (!reusableItemGeometries.has(object.geometry)) {
        object.geometry.dispose();
      }
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        material.dispose();
      }
    });
  }

  collisionMeshes.length = 0;
  pushableObjects.length = 0;
  items.length = 0;
  scene.background = new THREE.Color(0xc5d0d8);
  scene.fog = new THREE.Fog(0xc5d0d8, 35, 100);
  camera.position.set(0, 1.7, 0);

  function addRoomPart(width, height, depth, x, y, z, color) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
    );
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    collisionMeshes.push(mesh);

    const body = new CANNON.Body({
      mass: 0,
      material: groundMaterial,
      shape: new CANNON.Box(
        new CANNON.Vec3(width / 2, height / 2, depth / 2)
      )
    });
    body.position.set(x, y, z);
    world.addBody(body);
    return mesh;
  }

  const roomWidth = 5;
  const roomLength = 10;
  const wallHeight = 3;
  const wallThickness = 0.2;
  const widthWallOffset = roomWidth / 2 + wallThickness / 2;
  const lengthWallOffset = roomLength / 2 + wallThickness / 2;

  addRoomPart(roomWidth, 0.2, roomLength, 0, -0.1, 0, 0x777f86);
  addRoomPart(roomWidth, 0.2, roomLength, 0, wallHeight + 0.1, 0, 0x87939b);
  addRoomPart(roomWidth, wallHeight, wallThickness, 0, wallHeight / 2, -lengthWallOffset, 0xd8d4c8);
  addRoomPart(roomWidth, wallHeight, wallThickness, 0, wallHeight / 2, lengthWallOffset, 0xd8d4c8);
  addRoomPart(wallThickness, wallHeight, roomLength, -widthWallOffset, wallHeight / 2, 0, 0xc7d0d4);
  addRoomPart(wallThickness, wallHeight, roomLength, widthWallOffset, wallHeight / 2, 0, 0xc7d0d4);

  const tableWidth = 2.1;
  const tableDepth = 1.6;
  const tableZ = -roomLength / 2 + tableDepth / 2;
  addRoomPart(tableWidth, 0.12, tableDepth, 0, 0.78, tableZ, 0x8b5a2b);

  addRoomPart(0.4, 0.025, 0.25, 0, 0.858, tableZ, 0x292d30);
  addRoomPart(0.07, 0.18, 0.06, 0, 0.96, tableZ, 0x494c4e);
  addRoomPart(0.82, 0.58, 0.06, 0, 1.34, tableZ, 0x393d40);
  monitorScreen = addRoomPart(
    0.72, 0.45, 0.008, 0, 1.34, tableZ + 0.035, 0x07090b
  );
  monitorScreen.material.dispose();
  monitorScreen.material = new THREE.MeshStandardMaterial({
    color: 0x07090b,
    emissive: 0x000000,
    roughness: 0.5
  });
  monitorOn = false;

  assemblyMat = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.008, 1.12),
    new THREE.MeshStandardMaterial({
      color: 0x45524f,
      roughness: 0.9
    })
  );
  assemblyMat.position.set(-0.4, 0.004, tableZ);
  assemblyMat.receiveShadow = true;
  scene.add(assemblyMat);

  for (const x of [-0.9, 0.9]) {
    for (const zOffset of [-0.7, 0.7]) {
      addRoomPart(0.12, 0.72, 0.12, x, 0.36, tableZ + zOffset, 0x71451f);
    }
  }
}

const selectedMap = new URLSearchParams(window.location.search).get("map");
if (selectedMap === "room") {
  buildRoomMap();
  selectedMapText.textContent = "The room";
  scoreRow.hidden = true;

  const deliveryBox = createHardwareItem(
    "PC Case Delivery Box", -1.25, 0.4, -1.9, 0.92, 0.8, 0.82, 1.4, 0xb9844b,
    [
      { size: [0.94, 0.045, 0.84], position: [0, 0.402, 0], color: 0xd1a36a },
      { size: [0.08, 0.012, 0.84], position: [0, 0.428, 0], color: 0xd9c092 },
      { size: [0.42, 0.16, 0.012], position: [0, 0.03, 0.417], color: 0xe3cfaa }
    ]
  );
  deliveryBox.isDeliveryBox = true;
  buildStatus.hidden = false;
  buildStatus.textContent = "Unbox the delivery box with F";

  const tabletopY = 0.875;
  createHardwareItem(
    "Motherboard", -0.53, tabletopY, -4.35, 0.56, 0.07, 0.46, 0.8, 0x236b4b,
    [
      { size: [0.16, 0.035, 0.16], position: [-0.06, 0.052, 0], color: 0x252a32, metalness: 0.15 },
      { size: [0.3, 0.018, 0.025], position: [0.08, 0.045, -0.12], color: 0xc8a94b, metalness: 0.3 },
      { size: [0.3, 0.018, 0.025], position: [0.08, 0.045, -0.07], color: 0xc8a94b, metalness: 0.3 }
    ]
  );
  createHardwareItem(
    "GPU", 0.46, 0.9, -4.35, 0.48, 0.12, 0.17, 1.35, 0x30343b,
    [
      { size: [0.14, 0.025, 0.14], position: [0, 0.073, 0], color: 0x6b7280, metalness: 0.35 },
      { size: [0.42, 0.025, 0.018], position: [0, -0.073, 0.08], color: 0xd4a72c, metalness: 0.3 }
    ]
  );
  createHardwareItem(
    "CPU", -0.7, tabletopY, -3.7, 0.17, 0.07, 0.17, 0.45, 0x9ba5ad,
    [{ size: [0.13, 0.012, 0.13], position: [0, 0.041, 0], color: 0x4d5560, metalness: 0.25 }]
  );
  createHardwareItem(
    "RAM", -0.36, tabletopY + 0.085, -3.7, 0.075, 0.24, 0.045, 0.12, 0x27313b,
    [{ size: [0.052, 0.018, 0.046], position: [0, 0.025, 0], color: 0x51e0b5 }]
  );
  createHardwareItem(
    "PSU", 0.03, tabletopY + 0.045, -3.76, 0.3, 0.16, 0.24, 1.8, 0x454b53,
    [{ size: [0.16, 0.012, 0.16], position: [0, 0.086, 0], color: 0x252a32 }]
  );
  createHardwareItem(
    "SSD", 0.54, tabletopY, -3.76, 0.19, 0.05, 0.13, 0.2, 0x515c6b,
    [{ size: [0.12, 0.008, 0.01], position: [0, 0.03, 0], color: 0x51e0b5 }]
  );
} else if (selectedMap === "classic" || selectedMap === null) {
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
} else {
  throw new Error(`Unknown map selection: ${selectedMap}`);
}

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

  for (const hit of hits) {
    let object = hit.object;
    let item = null;
    while (object && !object.userData.item) {
      object = object.parent;
    }
    if (object) item = object.userData.item;

    object = hit.object;
    while (object) {
      if (object.userData.installedGlass) {
        return {
          item: officeCase,
          glass: object.userData.installedGlass,
          component: null
        };
      }
      if (object === officeCase?.mesh && officeCase.glassPanel) {
        return {
          item: officeCase,
          glass: officeCase.glassPanel,
          component: null
        };
      }
      if (object.userData.installedComponent) {
        return {
          item: officeCase,
          glass: null,
          component: object.userData.installedComponent
        };
      }
      object = object.parent;
    }
    if (item) return { item, glass: null, component: null };
  }
  return null;
}

function toggleMonitor() {
  if (!monitorScreen) return;
  monitorOn = !monitorOn;
  monitorScreen.material.color.setHex(monitorOn ? 0xffffff : 0x07090b);
  monitorScreen.material.emissive.setHex(monitorOn ? 0xffffff : 0x000000);
  monitorScreen.material.emissiveIntensity = monitorOn ? 0.8 : 0;
}

function updateMonitorPower() {
  if (!monitorOn || !officeCase || !monitorScreen) return;

  const distance = Math.hypot(
    officeCase.body.position.x - monitorScreen.position.x,
    officeCase.body.position.z - monitorScreen.position.z
  );
  if (distance > 2) toggleMonitor();
}

function updateBuildStatus() {
  if (!officeCase) {
    buildStatus.textContent = "Unbox the delivery box with F";
    return;
  }
  buildStatus.textContent =
    `PC build: ${officeCase.installedComponents.size}/${buildComponents.length} parts installed. ` +
    (officeCase.glassPanel
      ? "Glass cover is on; remove it before working on components."
      : "Glass cover is off; F installs or removes parts.");
}

function unboxDeliveryBox(box) {
  const position = box.body.position.clone();
  const boxIndex = items.indexOf(box);
  if (boxIndex !== -1) items.splice(boxIndex, 1);
  const pushableIndex = pushableObjects.findIndex(object => object.item === box);
  if (pushableIndex !== -1) pushableObjects.splice(pushableIndex, 1);
  world.removeBody(box.body);
  scene.remove(box.mesh);
  box.mesh.traverse(object => {
    if (!object.isMesh) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) material.dispose();
  });
  officeCase = createOfficeCase(position.x, 0.31, position.z);
  createCaseGlass(position.x + 0.7, 0.25, position.z);
  buildStatus.textContent =
    "Carry the case to the mat. The glass panel is beside the box; fit it with F.";
}

function installHeldGlass() {
  if (!officeCase || officeCase.glassPanel || !heldItem?.isCaseGlass) return;

  const glass = heldItem;
  world.removeBody(glass.body);
  const itemIndex = items.indexOf(glass);
  if (itemIndex !== -1) items.splice(itemIndex, 1);
  const pushableIndex = pushableObjects.findIndex(object => object.item === glass);
  if (pushableIndex !== -1) pushableObjects.splice(pushableIndex, 1);

  officeCase.mesh.add(glass.mesh);
  glass.mesh.position.set(0.305, 0, 0);
  glass.mesh.rotation.set(0, 0, 0);
  glass.mesh.userData.installedGlass = glass;
  officeCase.glassPanel = glass;
  heldItem = null;
  heldText.textContent = "None";
  updateBuildStatus();
}

function removeCaseGlass(glass) {
  if (!officeCase || officeCase.glassPanel !== glass) return;

  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  glass.mesh.getWorldPosition(position);
  glass.mesh.getWorldQuaternion(rotation);
  delete glass.mesh.userData.installedGlass;
  scene.attach(glass.mesh);
  glass.mesh.position.copy(position);
  glass.mesh.quaternion.copy(rotation);

  glass.body.position.copy(position);
  glass.body.quaternion.copy(rotation);
  glass.body.previousPosition.copy(position);
  glass.body.interpolatedPosition.copy(position);
  glass.body.type = CANNON.Body.DYNAMIC;
  glass.body.mass = glass.originalMass;
  glass.body.updateMassProperties();
  glass.body.collisionResponse = true;
  glass.body.velocity.set(0, 0, 0);
  glass.body.angularVelocity.set(0, 0, 0);
  glass.body.aabbNeedsUpdate = true;
  glass.body.updateAABB();
  glass.body.wakeUp();
  world.addBody(glass.body);
  world.broadphase.dirty = true;
  items.push(glass);
  pushableObjects.push({
    type: "hardware",
    mass: glass.originalMass,
    meshes: [glass.mesh],
    bodies: [glass.body],
    item: glass
  });
  glass.lastPosition.copy(position);
  officeCase.glassPanel = null;
  updateBuildStatus();
}

function installHeldComponent() {
  if (!officeCase || officeCase.glassPanel || !heldItem ||
      !buildComponents.includes(heldItem.type)) return;
  if (officeCase.installedComponents.has(heldItem.type)) return;

  const slots = {
    Motherboard: { position: [0.2, 0, 0], rotation: [0, 0, Math.PI / 2] },
    CPU: { position: [0.205, 0.12, 0.02], rotation: [0, 0, Math.PI / 2] },
    RAM: { position: [0.19, -0.11, 0.06], rotation: [0, 0, 0] },
    GPU: { position: [0.1, -0.25, 0], rotation: [0, Math.PI / 2, 0] },
    PSU: { position: [0.02, -0.32, -0.12], rotation: [0, 0, 0] },
    SSD: { position: [0.19, -0.23, -0.15], rotation: [0, 0, Math.PI / 2] }
  };
  const component = heldItem;
  const slot = slots[component.type];

  world.removeBody(component.body);
  const itemIndex = items.indexOf(component);
  if (itemIndex !== -1) items.splice(itemIndex, 1);
  const pushableIndex = pushableObjects.findIndex(object => object.item === component);
  if (pushableIndex !== -1) pushableObjects.splice(pushableIndex, 1);

  officeCase.mesh.add(component.mesh);
  component.mesh.position.set(...slot.position);
  component.mesh.rotation.set(...slot.rotation);
  component.mesh.userData.installedComponent = component;
  officeCase.installedComponents.add(component.type);
  heldItem = null;
  heldText.textContent = "None";
  updateBuildStatus();
}

function removeInstalledComponent(component) {
  if (!officeCase || !officeCase.installedComponents.has(component.type)) return;

  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  component.mesh.getWorldPosition(position);
  component.mesh.getWorldQuaternion(rotation);
  delete component.mesh.userData.installedComponent;
  scene.attach(component.mesh);
  component.mesh.position.copy(position);
  component.mesh.quaternion.copy(rotation);

  component.body.position.copy(position);
  component.body.quaternion.copy(rotation);
  component.body.previousPosition.copy(position);
  component.body.interpolatedPosition.copy(position);
  component.body.type = CANNON.Body.DYNAMIC;
  component.body.mass = component.originalMass;
  component.body.updateMassProperties();
  component.body.collisionResponse = true;
  component.body.velocity.set(0, 0, 0);
  component.body.angularVelocity.set(0, 0, 0);
  component.body.aabbNeedsUpdate = true;
  component.body.updateAABB();
  component.body.wakeUp();
  world.addBody(component.body);
  items.push(component);
  pushableObjects.push({
    type: "hardware",
    mass: component.originalMass,
    meshes: [component.mesh],
    bodies: [component.body],
    item: component
  });
  component.lastPosition.copy(position);
  officeCase.installedComponents.delete(component.type);
  updateBuildStatus();
}

function isFullyAssembled(item) {
  return Boolean(item && item === officeCase &&
    item.installedComponents.size === buildComponents.length);
}

function canPlaceCompletedPc() {
  if (!heldItem || !isFullyAssembled(heldItem) || !assemblyMat) return false;
  const nearestX = THREE.MathUtils.clamp(
    camera.position.x,
    assemblyMat.position.x - 0.38,
    assemblyMat.position.x + 0.38
  );
  const nearestZ = THREE.MathUtils.clamp(
    camera.position.z,
    assemblyMat.position.z - 0.56,
    assemblyMat.position.z + 0.56
  );
  const distance = Math.hypot(
    camera.position.x - nearestX,
    camera.position.z - nearestZ
  );
  return distance <= 0.7;
}

function placeCompletedPcOnMat() {
  if (!canPlaceCompletedPc()) return false;

  const item = heldItem;
  heldItem = null;
  item.body.type = CANNON.Body.DYNAMIC;
  item.body.mass = item.originalMass;
  item.body.updateMassProperties();
  item.body.position.set(assemblyMat.position.x, 0.31, assemblyMat.position.z);
  item.body.quaternion.copy(item.placementQuaternion);
  item.body.previousPosition.copy(item.body.position);
  item.body.interpolatedPosition.copy(item.body.position);
  item.body.velocity.set(0, 0, 0);
  item.body.angularVelocity.set(0, 0, 0);
  item.body.collisionResponse = true;
  item.body.aabbNeedsUpdate = true;
  item.body.updateAABB();
  item.body.wakeUp();
  world.broadphase.dirty = true;
  pcPlacedOnMat = true;
  heldText.textContent = "None";
  buildStatus.textContent = "Completed PC placed on the mat. Press E to pick it up.";
  return true;
}

// ------------------------------------
// 7. PICK UP AND DROP
// ------------------------------------

function setHeld(item) {
  heldItem = item;

  if (item) {
    if (item === officeCase) pcPlacedOnMat = false;
    item.body.type = CANNON.Body.KINEMATIC;
    item.body.mass = 0;
    item.body.updateMassProperties();
    item.body.velocity.set(0, 0, 0);
    item.body.angularVelocity.set(0, 0, 0);
    item.body.collisionResponse = false;

    heldText.textContent = item.type;
  } else {
    heldText.textContent = "None";
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

  }

  heldText.textContent = "None";
}

// E picks up or drops items.
document.addEventListener("keydown", event => {
  if (event.code !== "KeyE" || event.repeat) return;
  if (!controls.isLocked) return;

  if (heldItem) {
    if (placeCompletedPcOnMat()) return;
    releaseItem(false);
    return;
  }

  const target = findTarget();

  if (target && target.glass) {
    if (officeCase?.glassPanel === target.glass) {
      setHeld(officeCase);
    } else {
      setHeld(target.glass);
    }
  } else if (target && !target.component) {
    setHeld(target.item);
  }
});

document.addEventListener("keydown", event => {
  if (event.code !== "KeyF" || event.repeat || !controls.isLocked) return;

  const target = findTarget();
  if (!target) return;
  const finishedPlacedPc = target.item === officeCase &&
    pcPlacedOnMat && isFullyAssembled(officeCase);
  if (target.component) {
    if (!heldItem) removeInstalledComponent(target.component);
  } else if (target.glass) {
    if (finishedPlacedPc && !heldItem) toggleMonitor();
    else if (heldItem?.isCaseGlass) installHeldGlass();
    else if (!heldItem) removeCaseGlass(target.glass);
  } else if (target.item.isDeliveryBox) {
    if (!heldItem) unboxDeliveryBox(target.item);
  } else if (target.item.isCaseGlass) {
    return;
  } else if (target.item.isOfficeCase) {
    if (finishedPlacedPc && !heldItem) toggleMonitor();
    else if (heldItem?.isCaseGlass) installHeldGlass();
    else installHeldComponent();
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
const crouchHeight = 1.0;
const jumpSpeed = 5.5;
const gravity = 18;
let verticalOffset = 0;
let verticalVelocity = 0;
const playerRadius = 0.3;
const verticalCollisionTolerance = 0.01;
const playerBounds = new THREE.Box3();
const playerForward = new THREE.Vector3();
const playerRight = new THREE.Vector3();

document.addEventListener("keydown", event => {
  keys[event.code] = true;

  if (event.code === "Space" && controls.isLocked) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", event => {
  keys[event.code] = false;
});

function playerCollidesAt(x, z, height) {
  const bottom = verticalOffset;
  const top = bottom + height;

  for (const mesh of collisionMeshes) {
    playerBounds.setFromObject(mesh);
    if (bottom >= playerBounds.max.y - verticalCollisionTolerance ||
        top <= playerBounds.min.y + verticalCollisionTolerance) {
      continue;
    }

    const nearestX = THREE.MathUtils.clamp(x, playerBounds.min.x, playerBounds.max.x);
    const nearestZ = THREE.MathUtils.clamp(z, playerBounds.min.z, playerBounds.max.z);
    const offsetX = x - nearestX;
    const offsetZ = z - nearestZ;
    if (offsetX * offsetX + offsetZ * offsetZ < playerRadius * playerRadius) {
      return { pushable: null, bounds: playerBounds.clone() };
    }
  }

  for (const pushable of pushableObjects) {
    if (pushable.item === heldItem) continue;

    for (const mesh of pushable.meshes) {
      playerBounds.setFromObject(mesh);
      if (bottom >= playerBounds.max.y - verticalCollisionTolerance ||
          top <= playerBounds.min.y + verticalCollisionTolerance) {
        continue;
      }

      const nearestX = THREE.MathUtils.clamp(x, playerBounds.min.x, playerBounds.max.x);
      const nearestZ = THREE.MathUtils.clamp(z, playerBounds.min.z, playerBounds.max.z);
      const offsetX = x - nearestX;
      const offsetZ = z - nearestZ;
      if (offsetX * offsetX + offsetZ * offsetZ < playerRadius * playerRadius) {
        return { pushable, bounds: playerBounds.clone() };
      }
    }
  }

  return null;
}

function pushItem(pushable, moveX, moveZ, height, delta) {
  const body = pushable.bodies[0];
  const direction = new CANNON.Vec3(moveX, 0, moveZ);
  direction.normalize();

  const isBox = pushable.item && pushable.item.type === "Box";
  if (isBox) {
    const impulse = direction.scale(body.mass * 24 * delta);
    body.wakeUp();
    body.applyImpulse(impulse, new CANNON.Vec3(0, 0, 0));
    return;
  }

  const forceMagnitude = pushable.type === "table"
    ? playerMass * 9.82 * 0.65
    : pushable.type === "hardware"
    ? Math.min(playerMass * 0.4, body.mass * 6 + 2)
    : Math.min(playerMass * 0.4, body.mass * 10 + 5);
  const force = direction.scale(forceMagnitude);
  const contactHeight = verticalOffset + height * 0.45;
  const contactOffsetY = pushable.type === "table"
    ? 0
    : THREE.MathUtils.clamp(
        contactHeight - body.position.y,
        -0.06,
        0.06
      );
  const contactPoint = new CANNON.Vec3(
    -direction.x * body.boundingRadius * 0.8,
    contactOffsetY,
    -direction.z * body.boundingRadius * 0.8
  );

  body.wakeUp();
  body.applyForce(force, contactPoint);
}

function resolvePlayerContacts() {
  const height = keys["ControlLeft"] || keys["ControlRight"]
    ? crouchHeight
    : playerHeight;
  const playerBottom = verticalOffset;
  const playerTop = playerBottom + height;

  for (const pushable of pushableObjects) {
    if (pushable.item === heldItem) continue;

    const body = pushable.bodies[0];
    if (pushable.item) {
      playerBounds.setFromObject(pushable.meshes[0]);
      const previous = pushable.item.lastPosition;
      const travelX = body.position.x - previous.x;
      const travelZ = body.position.z - previous.z;
      const travelLengthSquared = travelX * travelX + travelZ * travelZ;
      const verticallyOverlaps =
        playerBottom < playerBounds.max.y - 0.08 &&
        playerTop > playerBounds.min.y;
      if (verticallyOverlaps && travelLengthSquared > 1e-8) {
        const closestTime = THREE.MathUtils.clamp(
          ((camera.position.x - previous.x) * travelX +
            (camera.position.z - previous.z) * travelZ) / travelLengthSquared,
          0,
          1
        );
        const closestX = previous.x + travelX * closestTime;
        const closestY = previous.y +
          (body.position.y - previous.y) * closestTime;
        const closestZ = previous.z + travelZ * closestTime;
        const offsetX = closestX - camera.position.x;
        const offsetZ = closestZ - camera.position.z;
        const distance = Math.hypot(offsetX, offsetZ);
        const combinedRadius = playerRadius + body.boundingRadius;

        if (distance < combinedRadius &&
            closestY + body.boundingRadius > playerBottom &&
            closestY - body.boundingRadius < playerTop) {
          let normalX = closestX - camera.position.x;
          let normalZ = closestZ - camera.position.z;
          const normalLength = Math.hypot(normalX, normalZ);
          if (normalLength > 1e-6) {
            normalX /= normalLength;
            normalZ /= normalLength;
          } else {
            normalX = -travelX / Math.sqrt(travelLengthSquared);
            normalZ = -travelZ / Math.sqrt(travelLengthSquared);
          }
          const inwardVelocity = body.velocity.x * normalX +
            body.velocity.z * normalZ;
          if (inwardVelocity < 0) {
            body.velocity.x -= normalX * inwardVelocity;
            body.velocity.z -= normalZ * inwardVelocity;
          }
        }
      }
    }

    for (const mesh of pushable.meshes) {
      playerBounds.setFromObject(mesh);
      let contactTop = playerBounds.max.y;
      if (pushable.item && pushable.item.type === "Basketball") {
        const offsetX = camera.position.x - body.position.x;
        const offsetZ = camera.position.z - body.position.z;
        const distanceSquared = offsetX * offsetX + offsetZ * offsetZ;
        const contactDistance = Math.max(
          0,
          Math.sqrt(distanceSquared) - playerRadius
        );
        if (contactDistance < 0.3) {
          contactTop = body.position.y +
            Math.sqrt(0.3 * 0.3 - contactDistance * contactDistance);
        }
      }

      if (playerBottom >= contactTop - 0.08 ||
          playerTop <= playerBounds.min.y) {
        continue;
      }

      const nearestX = THREE.MathUtils.clamp(
        camera.position.x, playerBounds.min.x, playerBounds.max.x
      );
      const nearestZ = THREE.MathUtils.clamp(
        camera.position.z, playerBounds.min.z, playerBounds.max.z
      );
      let normalX = nearestX - camera.position.x;
      let normalZ = nearestZ - camera.position.z;
      let distance = Math.hypot(normalX, normalZ);
      if (distance >= playerRadius) continue;

      let penetration;
      if (distance < 1e-6) {
        const centerX = (playerBounds.min.x + playerBounds.max.x) / 2;
        const centerZ = (playerBounds.min.z + playerBounds.max.z) / 2;
        const overlapX = playerRadius +
          (playerBounds.max.x - playerBounds.min.x) / 2 -
          Math.abs(camera.position.x - centerX);
        const overlapZ = playerRadius +
          (playerBounds.max.z - playerBounds.min.z) / 2 -
          Math.abs(camera.position.z - centerZ);

        if (overlapX <= overlapZ) {
          normalX = Math.sign(centerX - camera.position.x) || -Math.sign(body.velocity.x) || 1;
          normalZ = 0;
          penetration = overlapX;
        } else {
          normalX = 0;
          normalZ = Math.sign(centerZ - camera.position.z) || -Math.sign(body.velocity.z) || 1;
          penetration = overlapZ;
        }
      } else {
        normalX /= distance;
        normalZ /= distance;
        penetration = playerRadius - distance;
      }

      const correction = Math.min(penetration, 0.08);
      body.position.x += normalX * correction;
      body.position.z += normalZ * correction;
      body.previousPosition.copy(body.position);
      body.interpolatedPosition.copy(body.position);
      body.aabbNeedsUpdate = true;

      const velocityTowardPlayer = body.velocity.x * normalX +
        body.velocity.z * normalZ;
      if (velocityTowardPlayer < 0) {
        body.velocity.x -= normalX * velocityTowardPlayer;
        body.velocity.z -= normalZ * velocityTowardPlayer;
      }

      body.updateAABB();
      world.broadphase.dirty = true;
      break;
    }
  }

  for (const item of items) {
    item.lastPosition.copy(item.body.position);
  }
}

function syncTableMeshes() {
  for (let index = 0; index < table.meshes.length; index += 1) {
    table.meshes[index].position.set(
      tableBody.position.x + table.offsets[index].x,
      tableBody.position.y + table.offsets[index].y,
      tableBody.position.z + table.offsets[index].z
    );
  }
}

function tryPlayerMove(moveX, moveZ, delta) {
  const previousX = camera.position.x;
  const previousZ = camera.position.z;
  camera.position.x += moveX;
  camera.position.z += moveZ;

  const height = keys["ControlLeft"] || keys["ControlRight"]
    ? crouchHeight
    : playerHeight;
  const collision = playerCollidesAt(camera.position.x, camera.position.z, height);
  if (!collision) return;

  camera.position.x = previousX;
  camera.position.z = previousZ;
  if (collision.pushable) {
    pushItem(collision.pushable, moveX, moveZ, height, delta);
  }
}

function getBoxSupportHeight(x, z, feetHeight) {
  let supportHeight = 0;

  const tabletop = table.meshes[0];
  playerBounds.setFromObject(tabletop);
  const tableX = THREE.MathUtils.clamp(x, playerBounds.min.x, playerBounds.max.x);
  const tableZ = THREE.MathUtils.clamp(z, playerBounds.min.z, playerBounds.max.z);
  const tableOffsetX = x - tableX;
  const tableOffsetZ = z - tableZ;
  if (tableOffsetX * tableOffsetX + tableOffsetZ * tableOffsetZ <
        playerRadius * playerRadius &&
      playerBounds.max.y <= feetHeight + 0.05) {
    supportHeight = playerBounds.max.y;
  }

  for (const item of items) {
    let overlaps = false;
    let top = 0;

    if (item.type === "Box") {
      playerBounds.setFromObject(item.mesh);
      const nearestX = THREE.MathUtils.clamp(
        x, playerBounds.min.x, playerBounds.max.x
      );
      const nearestZ = THREE.MathUtils.clamp(
        z, playerBounds.min.z, playerBounds.max.z
      );
      const offsetX = x - nearestX;
      const offsetZ = z - nearestZ;
      overlaps = offsetX * offsetX + offsetZ * offsetZ <
        playerRadius * playerRadius;
      top = playerBounds.max.y;
    } else if (item.type === "Bottle") {
      const up = item.body.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
      if (Math.abs(up.y) >= 0.9) {
        const offsetX = x - item.body.position.x;
        const offsetZ = z - item.body.position.z;
        const radius = 0.19 * Math.abs(up.y) +
          0.325 * Math.sqrt(1 - up.y * up.y);
        overlaps = offsetX * offsetX + offsetZ * offsetZ <
          radius * radius;
        top = item.body.position.y + 0.325 * Math.abs(up.y) +
          0.19 * Math.sqrt(1 - up.y * up.y);
      } else {
        playerBounds.setFromObject(item.mesh);
        const nearestX = THREE.MathUtils.clamp(
          x, playerBounds.min.x, playerBounds.max.x
        );
        const nearestZ = THREE.MathUtils.clamp(
          z, playerBounds.min.z, playerBounds.max.z
        );
        const offsetX = x - nearestX;
        const offsetZ = z - nearestZ;
        overlaps = offsetX * offsetX + offsetZ * offsetZ <
          playerRadius * playerRadius;
        top = playerBounds.max.y;
      }
    } else if (item.type === "Basketball") {
      const offsetX = x - item.body.position.x;
      const offsetZ = z - item.body.position.z;
      const distanceSquared = offsetX * offsetX + offsetZ * offsetZ;
      const contactDistance = Math.max(0, Math.sqrt(distanceSquared) - playerRadius);
      overlaps = contactDistance < 0.3;
      top = item.body.position.y +
        Math.sqrt(0.3 * 0.3 - contactDistance * contactDistance);
    } else if (item.isHardware) {
      playerBounds.setFromObject(item.mesh);
      const nearestX = THREE.MathUtils.clamp(
        x, playerBounds.min.x, playerBounds.max.x
      );
      const nearestZ = THREE.MathUtils.clamp(
        z, playerBounds.min.z, playerBounds.max.z
      );
      const offsetX = x - nearestX;
      const offsetZ = z - nearestZ;
      overlaps = offsetX * offsetX + offsetZ * offsetZ <
        playerRadius * playerRadius;
      top = playerBounds.max.y;
    } else {
      continue;
    }

    if (overlaps && top <= feetHeight + 0.05 && top > supportHeight) {
      supportHeight = top;
    }
  }

  return supportHeight;
}

function movePlayer(delta) {
  if (!controls.isLocked) return;

  const isCrouching = keys["ControlLeft"] || keys["ControlRight"];
  const isSprinting = keys["ShiftLeft"] || keys["ShiftRight"];
  const speedMultiplier = isCrouching ? 0.6 : isSprinting ? 1.8 : 1;
  const speed = 5 * speedMultiplier * delta;
  camera.getWorldDirection(playerForward);
  playerForward.y = 0;
  playerForward.normalize();
  playerRight.set(-playerForward.z, 0, playerForward.x);
  let moveX = 0;
  let moveZ = 0;

  if (keys["KeyW"]) {
    moveX += playerForward.x;
    moveZ += playerForward.z;
  }
  if (keys["KeyS"]) {
    moveX -= playerForward.x;
    moveZ -= playerForward.z;
  }
  if (keys["KeyA"]) {
    moveX -= playerRight.x;
    moveZ -= playerRight.z;
  }
  if (keys["KeyD"]) {
    moveX += playerRight.x;
    moveZ += playerRight.z;
  }
  const moveLength = Math.hypot(moveX, moveZ);
  if (moveLength > 0) {
    tryPlayerMove(
      moveX / moveLength * speed,
      moveZ / moveLength * speed,
      delta
    );
  }

  const currentSupport = getBoxSupportHeight(
    camera.position.x,
    camera.position.z,
    verticalOffset
  );
  if (keys["Space"] && verticalOffset <= currentSupport + 0.05 &&
      verticalVelocity <= 0) {
    verticalVelocity = jumpSpeed;
  }

  const previousFeetHeight = verticalOffset;
  verticalVelocity -= gravity * delta;
  verticalOffset = Math.max(0, verticalOffset + verticalVelocity * delta);

  const nextSupport = getBoxSupportHeight(
    camera.position.x,
    camera.position.z,
    previousFeetHeight
  );
  if (verticalVelocity <= 0 && previousFeetHeight >= nextSupport &&
      verticalOffset <= nextSupport) {
    verticalOffset = nextSupport;
    verticalVelocity = 0;
  } else if (verticalOffset === 0) {
    verticalVelocity = 0;
  }

  camera.position.y = (isCrouching ? crouchHeight : playerHeight) + verticalOffset;
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

  if (controls.isLocked && selectedMap === "room") {
    const target = findTarget();
    if (canPlaceCompletedPc()) {
      interactionHint.textContent = "E - Place completed PC on the mat";
      interactionHint.hidden = false;
    } else if (heldItem === officeCase && isFullyAssembled(officeCase)) {
      interactionHint.textContent = "Carry completed PC to the mat to place it";
      interactionHint.hidden = false;
    } else if (!heldItem && target && target.item.isDeliveryBox) {
      interactionHint.textContent = "F - Unbox delivery box";
      interactionHint.hidden = false;
    } else if (!heldItem && target && target.glass) {
      interactionHint.textContent =
        pcPlacedOnMat && isFullyAssembled(officeCase)
          ? `F - Turn monitor ${monitorOn ? "off" : "on"}`
          : officeCase?.glassPanel === target.glass
          ? "E - Pick up PC case  |  F - Remove glass"
          : "E - Pick up glass";
      interactionHint.hidden = false;
    } else if (!heldItem && target && target.item.isOfficeCase &&
        pcPlacedOnMat && isFullyAssembled(officeCase)) {
      interactionHint.textContent = `F - Turn monitor ${monitorOn ? "off" : "on"}`;
      interactionHint.hidden = false;
    } else if (!heldItem && target && target.component) {
      interactionHint.textContent = `F - Remove ${target.component.type}`;
      interactionHint.hidden = false;
    } else if (target && target.item.isOfficeCase && heldItem?.isCaseGlass &&
        !officeCase.glassPanel) {
      interactionHint.textContent = "F - Fit glass cover";
      interactionHint.hidden = false;
    } else if (target && target.item.isOfficeCase && heldItem &&
        !officeCase.glassPanel &&
        buildComponents.includes(heldItem.type) &&
        !officeCase.installedComponents.has(heldItem.type)) {
      interactionHint.textContent = `F - Install ${heldItem.type}`;
      interactionHint.hidden = false;
    } else if (target && target.item.isOfficeCase && officeCase.glassPanel) {
      interactionHint.textContent = heldItem
        ? "Place what you're holding before removing the glass cover"
        : "F - Remove PC case glass";
      interactionHint.hidden = false;
    } else {
      interactionHint.hidden = true;
    }
  } else {
    interactionHint.hidden = true;
  }

  // Update the physics.
  world.step(1 / 60, delta, 3);
  for (const item of items) {
    item.mesh.position.copy(item.body.position);
    item.mesh.quaternion.copy(item.body.quaternion);
  }
  syncTableMeshes();
  resolvePlayerContacts();
  syncTableMeshes();
  checkHoopScores();
  updateConfetti(delta);

  // Synchronize the 3D models with the physics.
  for (const item of items) {
    item.mesh.position.copy(item.body.position);
    item.mesh.quaternion.copy(item.body.quaternion);
  }
  updateMonitorPower();
  renderer.render(scene, camera);
}

animate();

// Resize the view when the window size changes.
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});