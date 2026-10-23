
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
  { friction: 0.35, restitution: 0.05 }
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
const hud = document.querySelector("#hud");
const startButton = document.querySelector("#start");
const startMenuButton = document.querySelector("#start-menu");
const heldText = document.querySelector("#held");
const scoreText = document.querySelector("#score");

let heldItem = null;
let score = 0;
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
    material: objectMaterial,
    shape,
    linearDamping: 0.12,
    angularDamping: isBasketball ? 0.12 : isBottle ? 0.25 : 0.4,
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
    releaseItem(false);
    return;
  }

  const target = findTarget();

  if (target) {
    setHeld(target);
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
    if (bottom >= playerBounds.max.y || top <= playerBounds.min.y) {
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
      if (bottom >= playerBounds.max.y || top <= playerBounds.min.y) {
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
          const contactTime = Math.max(
            0,
            closestTime - Math.sqrt(
              combinedRadius * combinedRadius - distance * distance
            ) / Math.sqrt(travelLengthSquared)
          );
          body.position.x = previous.x + travelX * contactTime;
          body.position.z = previous.z + travelZ * contactTime;
          body.position.y = previous.y +
            (body.position.y - previous.y) * contactTime;

          let normalX = body.position.x - camera.position.x;
          let normalZ = body.position.z - camera.position.z;
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

          pushable.meshes[0].position.copy(body.position);
          pushable.meshes[0].quaternion.copy(body.quaternion);
        }
      }
    }

    for (const mesh of pushable.meshes) {
      playerBounds.setFromObject(mesh);
      if (playerBottom >= playerBounds.max.y - 0.08 ||
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

      body.position.x += normalX * penetration;
      body.position.z += normalZ * penetration;
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
      if (Math.abs(up.y) < 0.9) continue;

      const offsetX = x - item.body.position.x;
      const offsetZ = z - item.body.position.z;
      const radius = 0.19 * Math.abs(up.y) +
        0.325 * Math.sqrt(1 - up.y * up.y);
      overlaps = offsetX * offsetX + offsetZ * offsetZ <
        radius * radius;
      top = item.body.position.y + 0.325 * Math.abs(up.y) +
        0.19 * Math.sqrt(1 - up.y * up.y);
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

  renderer.render(scene, camera);
}

animate();

// Resize the view when the window size changes.
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});