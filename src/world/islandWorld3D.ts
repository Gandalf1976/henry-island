import confetti from 'canvas-confetti';
import * as THREE from 'three';
import { AVATAR_ROSTER } from '../data/avatars';
import { DAILY_SCAVENGER_ITEMS } from '../data/scavengerItems';
import { familyStore, LeaderboardEntry } from '../state/familyStore';
import { GameType } from '../types';
import { playSound, soundAudio } from '../utils/audio';

export interface World3DCallbacks {
  onTriggerGame: (gameType: GameType) => void;
  onOpenPodium: () => void;
  onOpenMessageBoard: () => void;
  onOpenAvatar: () => void;
}

export class IslandWorld3D {
  private container: HTMLElement;
  private callbacks: World3DCallbacks;

  // Three.js core
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock = new THREE.Clock();

  // Entities & Animation
  private playerGroup!: THREE.Group;
  private playerLegL!: THREE.Mesh;
  private playerLegR!: THREE.Mesh;
  private playerArmL!: THREE.Mesh;
  private playerArmR!: THREE.Mesh;
  private snowParticles!: THREE.Points;
  private animatedPenguins: { group: THREE.Group; basePos: THREE.Vector3; angle: number; speed: number; waddle: number }[] = [];
  private animatedElves: { group: THREE.Group; arm: THREE.Mesh; basePos: THREE.Vector3 }[] = [];
  private campfireLight?: THREE.PointLight;
  private podiumSnowmenGroups: THREE.Group[] = [];
  private podiumPlaquesGroups: THREE.Group[] = [];
  private candyCaneTexture: THREE.CanvasTexture | null = null;

  // Scavenger items
  private scavengerMeshes: {
    id: string;
    group: THREE.Group;
    basePos: THREE.Vector3;
    baseY: number;
    color: number;
  }[] = [];

  // Interactive targets
  private interactivePortals: {
    id: GameType | 'podium' | 'board' | 'elves' | 'hearth';
    pos: THREE.Vector3;
    radius: number;
    title: string;
    actionText: string;
  }[] = [];

  // Movement, Zoom & Camera
  private keysDown: { [key: string]: boolean } = {};
  private joystickVector = { x: 0, y: 0 };
  private playerPos = new THREE.Vector3(0, 1.8, 10);
  private playerTargetRotation = 0;
  private walkCycle = 0;
  private zoomLevel: number = 1.0;
  private baseCameraOffset = new THREE.Vector3(0, 28, 32);

  // Proximity prompt
  private promptEl: HTMLElement | null = null;
  private currentActiveTarget: (typeof this.interactivePortals)[0] | null = null;

  // Raycasting for click-to-interact
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private animationFrameId: number | null = null;
  private unsubscribeStore?: () => void;

  constructor(container: HTMLElement, callbacks: World3DCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.init();
  }

  private init(): void {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa5c9eb); // Crisp winter sky
    this.scene.fog = new THREE.FogExp2(0xa5c9eb, 0.0065);

    // 2. Camera
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 32, 40);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lights
    this.setupLights();

    // 5. Environment & Organic Island
    this.buildTerrain();
    this.buildLandmarks();
    this.buildSantaAndSleigh();
    this.buildExplorationAreas();
    this.buildDecorations();
    this.buildScavengerItems();
    this.buildPenguins();
    this.buildSnowfall();

    // 6. Player
    this.buildPlayer();

    // 7. Interactive Portals Registration
    this.setupPortals();

    // 8. Event Listeners
    this.setupInputs();

    // 9. Subscribe to store for podium snowmen & scavenger updates
    this.unsubscribeStore = familyStore.subscribe(() => {
      this.updatePodiumSnowmen();
      this.syncScavengerItemVisibility();
    });

    // 10. Start Animation Loop
    this.animate();
  }

  private setupLights(): void {
    // Ambient Light
    const ambient = new THREE.AmbientLight(0xfff3e0, 0.8);
    this.scene.add(ambient);

    // Directional Sunlight (casting shadows)
    const sun = new THREE.DirectionalLight(0xfffaf0, 1.25);
    sun.position.set(45, 75, 35);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 180;
    const d = 75;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Hemisphere light for winter bounce
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x93c5fd, 0.45);
    this.scene.add(hemiLight);
  }

  /**
   * Builds an Animal Crossing organic multi-lobed island shape with coves,
   * beaches, peninsulas, rocky bluffs, and ocean water.
   */
  private buildTerrain(): void {
    // 1. Vast Ocean Plane
    const oceanGeo = new THREE.PlaneGeometry(600, 600);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -1.2;
    this.scene.add(ocean);

    // 2. Sculpt Multi-Lobed Island Coastline
    const islandShape = new THREE.Shape();
    const numPoints = 128;
    for (let i = 0; i < numPoints; i++) {
      const theta = (i / numPoints) * Math.PI * 2;

      // Base radius with harmonic sinusoidal lobes
      let r = 84;
      r += Math.cos(2 * theta) * 12;
      r -= Math.sin(3 * theta) * 8;
      r += Math.cos(5 * theta + 0.4) * 6;
      r += Math.sin(theta - 0.8) * 10;

      // Regional lobe extensions:
      // North ridge for Wordle (theta ~ 3PI/2 = 4.71)
      if (theta > 4.2 && theta < 5.2) r += 9;
      // North-East peninsula for Elves Workshop (theta ~ 5.5)
      if (theta > 5.1 && theta < 6.0) r += 11;
      // East cove for Henry Lake (theta ~ 0)
      if (theta > 6.0 || theta < 0.5) r += 7;
      // South-East mountain for Word Ladder Lodge (theta ~ PI/4 = 0.78)
      if (theta > 0.5 && theta < 1.3) r += 12;
      // South beach dock for Santa (theta ~ PI/2 = 1.57)
      if (theta > 1.3 && theta < 1.9) r += 7;
      // South-West meadow for Cozy Hearth (theta ~ 3PI/4 = 2.35)
      if (theta > 1.9 && theta < 2.8) r += 9;
      // West bluff for Quiz Lodge (theta ~ PI = 3.14)
      if (theta > 2.8 && theta < 3.8) r += 7;

      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;

      if (i === 0) {
        islandShape.moveTo(x, y);
      } else {
        islandShape.lineTo(x, y);
      }
    }
    islandShape.closePath();

    // 3. Snowy Island Plateau (Upper Level)
    const extrudeSettings = {
      depth: 3.2,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 2.2,
      bevelThickness: 1.4
    };
    const islandGeo = new THREE.ExtrudeGeometry(islandShape, extrudeSettings);
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.85,
      metalness: 0.05
    });
    const islandMesh = new THREE.Mesh(islandGeo, snowMat);
    islandMesh.rotation.x = Math.PI / 2;
    islandMesh.position.y = 1.8;
    islandMesh.receiveShadow = true;
    this.scene.add(islandMesh);

    // 4. Sandy Frozen Beach Shoreline Rim (Lower Skirt)
    const beachSettings = {
      depth: 2.0,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 4.8,
      bevelThickness: 1.2
    };
    const beachGeo = new THREE.ExtrudeGeometry(islandShape, beachSettings);
    const beachMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.95
    });
    const beachMesh = new THREE.Mesh(beachGeo, beachMat);
    beachMesh.rotation.x = Math.PI / 2;
    beachMesh.position.y = -0.3;
    beachMesh.receiveShadow = true;
    this.scene.add(beachMesh);

    // 5. Cobblestone Paths
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });

    // Grand Expanded Town Center Plaza (Radius 28)
    const plazaGeo = new THREE.CylinderGeometry(28, 28, 0.1, 40);
    const plaza = new THREE.Mesh(plazaGeo, pathMat);
    plaza.position.set(0, 1.8, 0);
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    // Path North to Wordle Lodge (0, 1.8, -48)
    const pathNorthGeo = new THREE.BoxGeometry(6, 0.1, 44);
    const pathNorth = new THREE.Mesh(pathNorthGeo, pathMat);
    pathNorth.position.set(0, 1.8, -26);
    pathNorth.receiveShadow = true;
    this.scene.add(pathNorth);

    // Path East to Henry Lake (48, 1.8, 4)
    const pathEastGeo = new THREE.BoxGeometry(42, 0.1, 6);
    const pathEast = new THREE.Mesh(pathEastGeo, pathMat);
    pathEast.position.set(26, 1.8, 4);
    pathEast.receiveShadow = true;
    this.scene.add(pathEast);

    // Path West to Quiz Lodge (-48, 1.8, 4)
    const pathWestGeo = new THREE.BoxGeometry(42, 0.1, 6);
    const pathWest = new THREE.Mesh(pathWestGeo, pathMat);
    pathWest.position.set(-26, 1.8, 4);
    pathWest.receiveShadow = true;
    this.scene.add(pathWest);

    // Path South to Santa & Sleigh (0, 1.8, 42)
    const pathSouthGeo = new THREE.BoxGeometry(6, 0.1, 36);
    const pathSouth = new THREE.Mesh(pathSouthGeo, pathMat);
    pathSouth.position.set(0, 1.8, 25);
    pathSouth.receiveShadow = true;
    this.scene.add(pathSouth);

    // Path South-East to Word Ladder Lodge (38, 1.8, 38)
    const pathLadderGeo = new THREE.BoxGeometry(5, 0.1, 42);
    const pathLadder = new THREE.Mesh(pathLadderGeo, pathMat);
    pathLadder.position.set(20, 1.8, 20);
    pathLadder.rotation.y = -Math.PI / 4;
    pathLadder.receiveShadow = true;
    this.scene.add(pathLadder);

    // Path North-East to Santa's Elves Workshop (45, 1.8, -35)
    const pathElvesGeo = new THREE.BoxGeometry(5, 0.1, 42);
    const pathElves = new THREE.Mesh(pathElvesGeo, pathMat);
    pathElves.position.set(24, 1.8, -18);
    pathElves.rotation.y = Math.PI / 4;
    pathElves.receiveShadow = true;
    this.scene.add(pathElves);

    // Path South-West to Cozy Hearth (-42, 1.8, -25)
    const pathHearthGeo = new THREE.BoxGeometry(5, 0.1, 40);
    const pathHearth = new THREE.Mesh(pathHearthGeo, pathMat);
    pathHearth.position.set(-22, 1.8, -14);
    pathHearth.rotation.y = -Math.PI / 4;
    pathHearth.receiveShadow = true;
    this.scene.add(pathHearth);

    // Floating Icebergs in outer ocean
    const icebergMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.3 });
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.15;
      const dist = 115 + Math.random() * 45;
      const ibGeo = new THREE.DodecahedronGeometry(5 + Math.random() * 7, 1);
      const ib = new THREE.Mesh(ibGeo, icebergMat);
      ib.position.set(Math.cos(angle) * dist, -0.4, Math.sin(angle) * dist);
      ib.scale.set(1.4, 0.7, 1.2);
      this.scene.add(ib);
    }
  }

  private buildLandmarks(): void {
    // -------------------------------------------------------------
    // 1. WORDLE LODGE (North: 0, 1.8, -48)
    // -------------------------------------------------------------
    const wordleGroup = new THREE.Group();
    wordleGroup.position.set(0, 1.8, -48);

    // Cabin Main Walls
    const cabinGeo = new THREE.BoxGeometry(16, 10, 14);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
    const cabinMesh = new THREE.Mesh(cabinGeo, woodMat);
    cabinMesh.position.y = 5;
    cabinMesh.castShadow = true;
    cabinMesh.receiveShadow = true;
    wordleGroup.add(cabinMesh);

    // Roof (Steep Snowy A-Frame)
    const roofGeo = new THREE.ConeGeometry(13, 7, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 13.5;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.1, 1, 1.2);
    roof.castShadow = true;
    wordleGroup.add(roof);

    // Chimney
    const chimneyGeo = new THREE.BoxGeometry(2, 6, 2);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const chimney = new THREE.Mesh(chimneyGeo, stoneMat);
    chimney.position.set(5, 13, -3);
    chimney.castShadow = true;
    wordleGroup.add(chimney);

    // Windows & Door
    const winGeo = new THREE.PlaneGeometry(2.5, 3.5);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const win1 = new THREE.Mesh(winGeo, winMat);
    win1.position.set(-4, 5, 7.05);
    wordleGroup.add(win1);
    const win2 = new THREE.Mesh(winGeo, winMat);
    win2.position.set(4, 5, 7.05);
    wordleGroup.add(win2);

    const doorGeo = new THREE.PlaneGeometry(3, 5);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 2.5, 7.05);
    wordleGroup.add(door);

    // ROOF SIGN - Mounted directly on front roof gable, facing SOUTH!
    const wordleRoofSign = this.createRoofSign('WORDLE LODGE', '5-Letter Daily Challenge 🟩');
    wordleRoofSign.position.set(0, 14.5, 6.6);
    wordleRoofSign.rotation.set(0, 0, 0); // Faces South!
    wordleGroup.add(wordleRoofSign);

    this.scene.add(wordleGroup);

    // -------------------------------------------------------------
    // 2. FROZEN LAKE (East: 48, 1.8, 4)
    // -------------------------------------------------------------
    const lakeGroup = new THREE.Group();
    lakeGroup.position.set(48, 1.8, 4);

    // Frozen Ice Surface
    const lakeIceGeo = new THREE.CylinderGeometry(20, 20, 0.4, 32);
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    const lakeIce = new THREE.Mesh(lakeIceGeo, iceMat);
    lakeIce.position.y = 0.2;
    lakeIce.receiveShadow = true;
    lakeGroup.add(lakeIce);

    // Snowbank rim around lake
    const snowbankGeo = new THREE.TorusGeometry(20.5, 1.8, 8, 32);
    const snowbank = new THREE.Mesh(snowbankGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    snowbank.rotation.x = Math.PI / 2;
    snowbank.position.y = 0.4;
    lakeGroup.add(snowbank);

    // 3D Lilypads
    const padMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const padGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.15, 16);
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(Math.cos(angle) * 14, 0.45, Math.sin(angle) * 14);
      lakeGroup.add(pad);
    }

    // Lakeside Wooden Viewing Pier (extending west toward Town Center)
    const pierDeckGeo = new THREE.BoxGeometry(10, 0.5, 14);
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const pierDeck = new THREE.Mesh(pierDeckGeo, pierMat);
    pierDeck.position.set(-22, 0.25, 0);
    pierDeck.receiveShadow = true;
    lakeGroup.add(pierDeck);

    // Railing along lake edge to prevent walking into water
    const railMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const railGeo = new THREE.BoxGeometry(0.3, 1.4, 14);
    const railing = new THREE.Mesh(railGeo, railMat);
    railing.position.set(-17.2, 0.9, 0);
    railing.castShadow = true;
    lakeGroup.add(railing);

    // Festive Wreath
    const wreathGeo = new THREE.TorusGeometry(0.9, 0.3, 8, 16);
    const wreathMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const wreath = new THREE.Mesh(wreathGeo, wreathMat);
    wreath.position.set(-17.4, 1.1, 0);
    wreath.rotation.y = Math.PI / 2;
    lakeGroup.add(wreath);

    // Lake Signpost (standing on the dry wooden dock, facing SOUTH!)
    const lakeSign = this.createSignpost('HENRY LAKE', '120s Word Scramble 🪷');
    lakeSign.position.set(-24, 0, -3.5);
    lakeSign.rotation.set(0, 0, 0); // Faces South!
    lakeGroup.add(lakeSign);

    this.scene.add(lakeGroup);

    // -------------------------------------------------------------
    // 3. QUIZ LODGE (West: -48, 1.8, 4)
    // -------------------------------------------------------------
    const quizGroup = new THREE.Group();
    quizGroup.position.set(-48, 1.8, 4);

    // Lodge Main Hall
    const quizHallGeo = new THREE.BoxGeometry(18, 12, 16);
    const hallMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 });
    const quizHall = new THREE.Mesh(quizHallGeo, hallMat);
    quizHall.position.y = 6;
    quizHall.castShadow = true;
    quizGroup.add(quizHall);

    // Gabled Roof
    const quizRoofGeo = new THREE.ConeGeometry(15, 8, 4);
    const quizRoof = new THREE.Mesh(quizRoofGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    quizRoof.position.y = 15;
    quizRoof.rotation.y = Math.PI / 4;
    quizRoof.scale.set(1.2, 1, 1.2);
    quizRoof.castShadow = true;
    quizGroup.add(quizRoof);

    // Bell Tower
    const towerGeo = new THREE.BoxGeometry(4, 9, 4);
    const tower = new THREE.Mesh(towerGeo, new THREE.MeshStandardMaterial({ color: 0x991b1b }));
    tower.position.set(0, 18, 0);
    quizGroup.add(tower);

    // Golden Bell
    const bellGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const bell = new THREE.Mesh(bellGeo, new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 }));
    bell.position.set(0, 21.5, 0);
    quizGroup.add(bell);

    // ROOF SIGN - Mounted on front roof gable, facing SOUTH!
    const quizRoofSign = this.createRoofSign('QUIZ LODGE', '60s Teen Trivia Challenge 🧠');
    quizRoofSign.position.set(0, 16.5, 7.8);
    quizRoofSign.rotation.set(0, 0, 0); // Faces South!
    quizGroup.add(quizRoofSign);

    this.scene.add(quizGroup);

    // -------------------------------------------------------------
    // 4. NEW: HENRY WORD LADDER LODGE (South-East: 38, 1.8, 38)
    // -------------------------------------------------------------
    const ladderGroup = new THREE.Group();
    ladderGroup.position.set(38, 1.8, 38);

    // Alpine Mountain Chalet
    const chaletGeo = new THREE.BoxGeometry(16, 10, 14);
    const chaletMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.8 }); // Rich evergreen timber
    const chalet = new THREE.Mesh(chaletGeo, chaletMat);
    chalet.position.y = 5;
    chalet.castShadow = true;
    ladderGroup.add(chalet);

    // Steep A-frame snowy roof
    const ladderRoofGeo = new THREE.ConeGeometry(13, 7, 4);
    const ladderRoof = new THREE.Mesh(ladderRoofGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    ladderRoof.position.y = 13.5;
    ladderRoof.rotation.y = Math.PI / 4;
    ladderRoof.scale.set(1.1, 1, 1.2);
    ladderRoof.castShadow = true;
    ladderGroup.add(ladderRoof);

    // Chimney
    const ladderChimney = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2), stoneMat);
    ladderChimney.position.set(-5, 13, -3);
    ladderGroup.add(ladderChimney);

    // Wooden ladder leaning against the exterior wall
    const propLadder = this.createWoodenLadderProp();
    propLadder.position.set(5.5, 0, 7.2);
    propLadder.rotation.x = -0.15;
    ladderGroup.add(propLadder);

    // Windows & Door
    const lWin1 = new THREE.Mesh(winGeo, winMat);
    lWin1.position.set(-4, 5, 7.05);
    ladderGroup.add(lWin1);

    const lDoor = new THREE.Mesh(doorGeo, doorMat);
    lDoor.position.set(0, 2.5, 7.05);
    ladderGroup.add(lDoor);

    // ROOF SIGN - Mounted on front roof gable, facing SOUTH!
    const ladderRoofSign = this.createRoofSign('WORD LADDER LODGE', '4-Letter Daily Challenge 🪜');
    ladderRoofSign.position.set(0, 14.5, 6.6);
    ladderRoofSign.rotation.set(0, 0, 0); // Faces South!
    ladderGroup.add(ladderRoofSign);

    this.scene.add(ladderGroup);

    // -------------------------------------------------------------
    // 5. TOWN CENTER PODIUM & MESSAGE BOARD
    // -------------------------------------------------------------
    this.buildPodiumAndBoard();
  }

  /**
   * Builds non-game exploration landmarks:
   * 1. Santa's Elves' Toy Workshop (North-East: 45, 1.8, -35)
   * 2. Cozy Hearth & Campfire Retreat (South-West: -42, 1.8, -25)
   */
  private buildExplorationAreas(): void {
    // -------------------------------------------------------------
    // Area A: SANTA'S ELVES' TOY WORKSHOP (45, 1.8, -35)
    // -------------------------------------------------------------
    const elvesGroup = new THREE.Group();
    elvesGroup.position.set(45, 1.8, -35);

    // Elf Chalet
    const elfChaletGeo = new THREE.BoxGeometry(14, 9, 12);
    const elfWoodMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 }); // Festive Elf Green
    const elfChalet = new THREE.Mesh(elfChaletGeo, elfWoodMat);
    elfChalet.position.y = 4.5;
    elfChalet.castShadow = true;
    elvesGroup.add(elfChalet);

    // Red Shingle Roof
    const elfRoofGeo = new THREE.ConeGeometry(11, 6, 4);
    const elfRoof = new THREE.Mesh(elfRoofGeo, new THREE.MeshStandardMaterial({ color: 0x991b1b }));
    elfRoof.position.y = 11.5;
    elfRoof.rotation.y = Math.PI / 4;
    elfRoof.scale.set(1.1, 1, 1.2);
    elvesGroup.add(elfRoof);

    // Roof Sign - Facing SOUTH!
    const elfSign = this.createRoofSign("SANTA'S ELVES WORKSHOP", 'Crafting Holiday Magic 🧝🎁');
    elfSign.position.set(0, 12.8, 5.8);
    elfSign.rotation.set(0, 0, 0); // Faces South!
    elvesGroup.add(elfSign);

    // Outdoor Toy Workbench
    const benchGeo = new THREE.BoxGeometry(8, 1.4, 3);
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.set(0, 0.7, 9);
    bench.castShadow = true;
    elvesGroup.add(bench);

    // Wooden Toy Train on Workbench
    const trainMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const trainEngine = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.2), trainMat);
    trainEngine.position.set(-1.8, 1.8, 9);
    elvesGroup.add(trainEngine);

    const trainFunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    trainFunnel.position.set(-2.4, 2.4, 9);
    elvesGroup.add(trainFunnel);

    const trainCar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.1), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
    trainCar.position.set(0.6, 1.7, 9);
    elvesGroup.add(trainCar);

    // Wrapped Presents beside workbench
    const giftMat1 = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const giftMat2 = new THREE.MeshStandardMaterial({ color: 0xec4899 });
    const g1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), giftMat1);
    g1.position.set(2.4, 1.8, 9);
    elvesGroup.add(g1);

    const g2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), giftMat2);
    g2.position.set(4.5, 0.7, 8);
    elvesGroup.add(g2);

    // Animated 3D Elves standing beside the workbench!
    const elf1 = this.create3DElf();
    elf1.group.position.set(-3.2, 0, 9);
    elvesGroup.add(elf1.group);
    this.animatedElves.push(elf1);

    const elf2 = this.create3DElf();
    elf2.group.position.set(3.2, 0, 9);
    elf2.group.rotation.y = -0.5;
    elvesGroup.add(elf2.group);
    this.animatedElves.push(elf2);

    this.scene.add(elvesGroup);

    // -------------------------------------------------------------
    // Area B: COZY HEARTH & CAMPFIRE RETREAT (-42, 1.8, -25)
    // -------------------------------------------------------------
    const hearthGroup = new THREE.Group();
    hearthGroup.position.set(-42, 1.8, -25);

    // Rustic Pine Log Cabin
    const logCabinGeo = new THREE.BoxGeometry(14, 8, 12);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x543310, roughness: 0.9 });
    const cabin = new THREE.Mesh(logCabinGeo, cabinMat);
    cabin.position.y = 4;
    cabin.castShadow = true;
    hearthGroup.add(cabin);

    // Snowy Chalet Roof
    const cabinRoofGeo = new THREE.ConeGeometry(11, 6, 4);
    const cabinRoof = new THREE.Mesh(cabinRoofGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    cabinRoof.position.y = 10.5;
    cabinRoof.rotation.y = Math.PI / 4;
    cabinRoof.scale.set(1.1, 1, 1.2);
    hearthGroup.add(cabinRoof);

    // Roof Sign - Facing SOUTH!
    const hearthSign = this.createRoofSign('COZY HEARTH RETREAT', 'Campfire & Marshmallows 🔥☕');
    hearthSign.position.set(0, 11.5, 5.8);
    hearthSign.rotation.set(0, 0, 0); // Faces South!
    hearthGroup.add(hearthSign);

    // Outdoor Stone Campfire Pit
    const campfireRing = new THREE.Group();
    campfireRing.position.set(0, 0, 10);

    // Ring of 8 stones
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0), stoneMat);
      s.position.set(Math.cos(a) * 2.2, 0.35, Math.sin(a) * 2.2);
      campfireRing.add(s);
    }

    // Crossed fire logs
    const fireLogMat = new THREE.MeshStandardMaterial({ color: 0x3f2510, roughness: 0.8 });
    const flog1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2.4, 8), fireLogMat);
    flog1.rotation.z = Math.PI / 3;
    flog1.position.y = 0.5;
    campfireRing.add(flog1);

    const flog2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2.4, 8), fireLogMat);
    flog2.rotation.x = Math.PI / 3;
    flog2.position.y = 0.5;
    campfireRing.add(flog2);

    // Glowing Flame Cones
    const flameMat1 = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const flameMat2 = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 6), flameMat1);
    flame1.position.y = 1.1;
    campfireRing.add(flame1);

    const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.4, 6), flameMat2);
    flame2.position.y = 1.3;
    campfireRing.add(flame2);

    // Warm Flickering Campfire Light
    this.campfireLight = new THREE.PointLight(0xff7700, 2.5, 22);
    this.campfireLight.position.set(0, 1.5, 0);
    campfireRing.add(this.campfireLight);

    // Split-Log Seating Benches around campfire
    const benchLogMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const benchAngles = [-Math.PI * 0.7, Math.PI * 0.7, 0];
    benchAngles.forEach(ang => {
      const bLog = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3.5, 8), benchLogMat);
      bLog.rotation.z = Math.PI / 2;
      bLog.rotation.y = ang;
      bLog.position.set(Math.sin(ang) * 4.2, 0.4, Math.cos(ang) * 4.2);
      bLog.castShadow = true;
      campfireRing.add(bLog);
    });

    hearthGroup.add(campfireRing);
    this.scene.add(hearthGroup);
  }

  private create3DElf(): { group: THREE.Group; arm: THREE.Mesh; basePos: THREE.Vector3 } {
    const group = new THREE.Group();

    // Body (Elf Green Coat)
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.55, 1.4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    group.add(body);

    // Golden Belt
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    belt.position.y = 0.9;
    group.add(belt);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.5 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), headMat);
    head.position.y = 2.0;
    group.add(head);

    // Pointy Elf Hat (Red with Golden Bell)
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 8), hatMat);
    hat.position.set(0.1, 2.7, 0);
    hat.rotation.z = -0.3;
    group.add(hat);

    const jingleBell = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8 }));
    jingleBell.position.set(0.3, 3.2, 0);
    group.add(jingleBell);

    // Blushing cheeks
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.8 });
    const bL = new THREE.Mesh(new THREE.CircleGeometry(0.08, 8), blushMat);
    bL.position.set(-0.2, 1.95, 0.38);
    group.add(bL);
    const bR = new THREE.Mesh(new THREE.CircleGeometry(0.08, 8), blushMat);
    bR.position.set(0.2, 1.95, 0.38);
    group.add(bR);

    // Arms
    const armMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6), armMat);
    armL.position.set(-0.6, 1.2, 0.2);
    armL.rotation.x = Math.PI / 4;
    group.add(armL);

    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6), armMat);
    armR.position.set(0.6, 1.2, 0.2);
    armR.rotation.x = Math.PI / 4;
    group.add(armR);

    // Boots
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), bootMat);
    bootL.position.set(-0.25, 0.15, 0.1);
    group.add(bootL);
    const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.5), bootMat);
    bootR.position.set(0.25, 0.15, 0.1);
    group.add(bootR);

    return { group, arm: armR, basePos: group.position.clone() };
  }

  private createWoodenLadderProp(): THREE.Group {
    const prop = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });

    // Side rails
    const railGeo = new THREE.BoxGeometry(0.18, 9, 0.18);
    const r1 = new THREE.Mesh(railGeo, woodMat);
    r1.position.set(-0.9, 4.5, 0);
    prop.add(r1);

    const r2 = new THREE.Mesh(railGeo, woodMat);
    r2.position.set(0.9, 4.5, 0);
    prop.add(r2);

    // Rungs
    const rungGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6);
    for (let y = 1.0; y <= 8.0; y += 1.0) {
      const rung = new THREE.Mesh(rungGeo, woodMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, y, 0);
      prop.add(rung);
    }

    return prop;
  }

  /**
   * Town Center: Podium moved back to z = -14; Bulletin Board moved to (22, 1.8, 2).
   * This completely avoids any obstruction of the Snowman Podium!
   */
  private buildPodiumAndBoard(): void {
    const centerGroup = new THREE.Group();
    centerGroup.position.set(0, 1.8, 0);

    // Grand Holiday Christmas Tree in Town Center Plaza (0, 1.8, 4)
    const grandTree = this.createChristmasTree(1.8);
    grandTree.position.set(0, 0, 4);
    centerGroup.add(grandTree);

    // Podium Pedestals placed center-north in plaza at z = -14
    const podiumPillars = [
      { rank: 2, x: -7, h: 2.2, color: 0x94a3b8 }, // 2nd Silver
      { rank: 1, x: 0, h: 3.4, color: 0xf59e0b },  // 1st Gold
      { rank: 3, x: 7, h: 1.6, color: 0xb45309 }   // 3rd Bronze
    ];

    podiumPillars.forEach(p => {
      const pGeo = new THREE.CylinderGeometry(3.2, 3.5, p.h, 24);
      const pMat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.5, metalness: 0.2 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(p.x, p.h / 2, -14);
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      centerGroup.add(pMesh);
    });

    // -------------------------------------------------------------
    // HOLIDAY BULLETIN BOARD - Moved to (22, 1.8, 2), facing SOUTH!
    // -------------------------------------------------------------
    const boardGroup = new THREE.Group();
    boardGroup.position.set(22, 0, 2);

    // Wooden Posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const postGeo = new THREE.CylinderGeometry(0.3, 0.3, 7, 12);
    const post1 = new THREE.Mesh(postGeo, postMat);
    post1.position.set(-3, 3.5, 0);
    boardGroup.add(post1);

    const post2 = new THREE.Mesh(postGeo, postMat);
    post2.position.set(3, 3.5, 0);
    boardGroup.add(post2);

    // Cork Board Panel
    const boardPanelGeo = new THREE.BoxGeometry(6.5, 4.5, 0.4);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    const boardPanel = new THREE.Mesh(boardPanelGeo, boardMat);
    boardPanel.position.set(0, 4.5, 0);
    boardGroup.add(boardPanel);

    // Pinned Notes
    const noteMat1 = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const noteMat2 = new THREE.MeshBasicMaterial({ color: 0xa7f3d0 });
    const noteGeo = new THREE.PlaneGeometry(1.4, 1.2);
    const note1 = new THREE.Mesh(noteGeo, noteMat1);
    note1.position.set(-1.6, 5, 0.22);
    boardGroup.add(note1);

    const note2 = new THREE.Mesh(noteGeo, noteMat2);
    note2.position.set(1.4, 4.2, 0.22);
    boardGroup.add(note2);

    // Cute bird on top
    const bird = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }));
    bird.position.set(0, 7.1, 0);
    boardGroup.add(bird);

    // Signpost mounted on top of the Bulletin Board facing SOUTH!
    const boardBanner = this.createSignpost('BULLETIN BOARD', 'Family Messages 💬');
    boardBanner.position.set(0, 6.8, 0);
    boardBanner.rotation.set(0, 0, 0); // Faces South!
    boardBanner.scale.set(0.9, 0.9, 0.9);
    boardGroup.add(boardBanner);

    centerGroup.add(boardGroup);
    this.scene.add(centerGroup);

    // Build the dynamic 3D snowmen and leader score plaques on the podium
    this.updatePodiumSnowmen();
  }

  private updatePodiumSnowmen(): void {
    // Remove existing snowmen and plaques
    this.podiumSnowmenGroups.forEach(g => this.scene.remove(g));
    this.podiumSnowmenGroups = [];
    this.podiumPlaquesGroups.forEach(g => this.scene.remove(g));
    this.podiumPlaquesGroups = [];

    const leaderboard = familyStore.getLeaderboard();
    const slots = [
      { rank: 2, x: -7, h: 2.2, color: '#94a3b8', medal: '🥈', title: '2ND PLACE' },
      { rank: 1, x: 0, h: 3.4, color: '#f59e0b', medal: '🥇', title: '1ST PLACE' },
      { rank: 3, x: 7, h: 1.6, color: '#b45309', medal: '🥉', title: '3RD PLACE' }
    ];

    slots.forEach(slot => {
      const entry = leaderboard.find(l => l.rank === slot.rank);

      // 1. Dynamic Snowman on top of the pedestal at z = -14
      if (entry) {
        const scoreScale = THREE.MathUtils.clamp(0.8 + (entry.stats.averageScore / 10) * 0.4, 0.7, 1.4);
        const smGroup = this.create3DSnowman(scoreScale, entry.rank === 1);
        smGroup.position.set(slot.x, 1.8 + slot.h, -14);
        this.scene.add(smGroup);
        this.podiumSnowmenGroups.push(smGroup);
      }

      // 2. High-res Plaque with Leader Name and Score written on base facing SOUTH!
      const plaque = this.createPodiumPlaque(slot, entry);
      plaque.position.set(slot.x, 1.8 + slot.h * 0.5, -14 + 3.45);
      plaque.rotation.set(0, 0, 0); // Faces South!
      this.scene.add(plaque);
      this.podiumPlaquesGroups.push(plaque);
    });
  }

  private createPodiumPlaque(
    slot: { rank: number; color: string; medal: string; title: string },
    entry?: LeaderboardEntry
  ): THREE.Group {
    const group = new THREE.Group();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Rounded slate background with metallic border
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(8, 8, 496, 240, 24);
      ctx.fill();

      // Border matching rank medal
      ctx.strokeStyle = slot.color;
      ctx.lineWidth = 10;
      ctx.stroke();

      // Inner accent outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(18, 18, 476, 220);

      // Rank Title Header with medal
      ctx.fillStyle = slot.color;
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${slot.medal} ${slot.title}`, 256, 54);

      if (entry) {
        const av = AVATAR_ROSTER.find(a => a.id === entry.player.avatarId) || AVATAR_ROSTER[0];
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 38px sans-serif';
        const displayName = `${av.emoji} ${entry.player.name}`;
        ctx.fillText(displayName, 256, 118);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(`Avg: ${entry.stats.averageScore.toFixed(1)} pts`, 256, 172);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px sans-serif';
        ctx.fillText(`Today: ${entry.stats.todayScore} pts • ${entry.stats.daysPlayed} days`, 256, 218);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('— Unclaimed —', 256, 130);

        ctx.fillStyle = '#64748b';
        ctx.font = '22px sans-serif';
        ctx.fillText('Play games to take podium!', 256, 185);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    const plaqueMat = new THREE.MeshBasicMaterial({ map: texture });

    // Metallic frame backing
    const frameGeo = new THREE.BoxGeometry(4.2, 1.7, 0.12);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    group.add(frame);

    // Front Plaque Face Plate
    const faceGeo = new THREE.PlaneGeometry(4.0, 1.55);
    const face = new THREE.Mesh(faceGeo, plaqueMat);
    face.position.set(0, 0, 0.07);
    group.add(face);

    return group;
  }

  private create3DSnowman(scale: number, isWinner: boolean): THREE.Group {
    const sm = new THREE.Group();
    sm.scale.set(scale, scale, scale);

    const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const coalMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
    const carrotMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });

    // 1. Bottom Snowball
    const bottomGeo = new THREE.SphereGeometry(1.8, 16, 16);
    const bottom = new THREE.Mesh(bottomGeo, snowMat);
    bottom.position.y = 1.8;
    bottom.castShadow = true;
    sm.add(bottom);

    // 2. Middle Snowball
    const midGeo = new THREE.SphereGeometry(1.3, 16, 16);
    const mid = new THREE.Mesh(midGeo, snowMat);
    mid.position.y = 4.1;
    mid.castShadow = true;
    sm.add(mid);

    // 3. Head Snowball
    const headGeo = new THREE.SphereGeometry(0.95, 16, 16);
    const head = new THREE.Mesh(headGeo, snowMat);
    head.position.y = 5.9;
    head.castShadow = true;
    sm.add(head);

    // Carrot Nose
    const carrotGeo = new THREE.ConeGeometry(0.2, 0.8, 8);
    const carrot = new THREE.Mesh(carrotGeo, carrotMat);
    carrot.position.set(0, 5.9, 0.95);
    carrot.rotation.x = Math.PI / 2;
    sm.add(carrot);

    // Coal Eyes
    const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, coalMat);
    eyeL.position.set(-0.3, 6.1, 0.85);
    sm.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, coalMat);
    eyeR.position.set(0.3, 6.1, 0.85);
    sm.add(eyeR);

    // Coal Buttons on chest
    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(eyeGeo, coalMat);
      btn.position.set(0, 4.6 - i * 0.5, 1.25);
      sm.add(btn);
    }

    // Cozy Scarf
    const scarfMat = new THREE.MeshStandardMaterial({ color: isWinner ? 0xf59e0b : 0xd97706 });
    const scarfRingGeo = new THREE.TorusGeometry(0.9, 0.22, 8, 20);
    const scarfRing = new THREE.Mesh(scarfRingGeo, scarfMat);
    scarfRing.position.set(0, 5.15, 0);
    scarfRing.rotation.x = Math.PI / 2;
    sm.add(scarfRing);

    // Top Hat or Golden Crown for winner
    if (isWinner) {
      const crownGeo = new THREE.CylinderGeometry(0.9, 0.7, 0.8, 8);
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(0, 6.9, 0);
      sm.add(crown);
    } else {
      const hatGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.9, 12);
      const hatBrimGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.1, 12);
      const hatMesh = new THREE.Mesh(hatGeo, coalMat);
      const hatBrim = new THREE.Mesh(hatBrimGeo, coalMat);
      hatMesh.position.set(0, 7.0, 0);
      hatBrim.position.set(0, 6.55, 0);
      sm.add(hatMesh);
      sm.add(hatBrim);
    }

    // Stick Arms
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const stickGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 6);

    const armL = new THREE.Mesh(stickGeo, stickMat);
    armL.position.set(-1.8, 4.3, 0);
    armL.rotation.z = Math.PI / 3;
    sm.add(armL);

    const armR = new THREE.Mesh(stickGeo, stickMat);
    armR.position.set(1.8, 4.3, 0);
    armR.rotation.z = -Math.PI / 3;
    sm.add(armR);

    return sm;
  }

  /**
   * Builds the 5 Daily Scavenger Hunt 3D Collectibles.
   */
  private buildScavengerItems(): void {
    DAILY_SCAVENGER_ITEMS.forEach(item => {
      const group = new THREE.Group();
      group.position.set(item.x, item.y, item.z);

      // Aura glow ring
      const ringGeo = new THREE.RingGeometry(0.6, 0.9, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: item.color, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.4;
      group.add(ring);

      // Custom 3D Shape per item
      if (item.id === 'item_bell') {
        // Golden Jingle Bell
        const bGeo = new THREE.SphereGeometry(0.55, 12, 12);
        const bMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
        const bell = new THREE.Mesh(bGeo, bMat);
        group.add(bell);
      } else if (item.id === 'item_cookie') {
        // Gingerbread Man biscuit
        const cGeo = new THREE.BoxGeometry(0.8, 1.1, 0.25);
        const cMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
        const cookie = new THREE.Mesh(cGeo, cMat);
        group.add(cookie);
      } else if (item.id === 'item_gift') {
        // Wrapped Holiday Gift Box
        const gGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
        const gMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
        const gift = new THREE.Mesh(gGeo, gMat);
        group.add(gift);
      } else if (item.id === 'item_scarf') {
        // Woolen Winter Scarf Torus
        const sGeo = new THREE.TorusGeometry(0.5, 0.2, 8, 16);
        const sMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.7 });
        const scarf = new THREE.Mesh(sGeo, sMat);
        scarf.rotation.x = Math.PI / 3;
        group.add(scarf);
      } else if (item.id === 'item_star') {
        // Glowing Star Fragment
        const starGeo = new THREE.OctahedronGeometry(0.6, 0);
        const starMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.5 });
        const star = new THREE.Mesh(starGeo, starMat);
        group.add(star);
      }

      this.scene.add(group);
      this.scavengerMeshes.push({
        id: item.id,
        group,
        basePos: new THREE.Vector3(item.x, item.y, item.z),
        baseY: item.y,
        color: item.color
      });
    });

    this.syncScavengerItemVisibility();
  }

  private syncScavengerItemVisibility(): void {
    const active = familyStore.getActivePlayer();
    const foundIds = familyStore.getScavengerFoundIds(active.id);

    this.scavengerMeshes.forEach(m => {
      m.group.visible = !foundIds.includes(m.id);
    });
  }

  private buildSantaAndSleigh(): void {
    const santaGroup = new THREE.Group();
    santaGroup.position.set(0, 1.8, 42);

    // Sleigh Body (Festive Crimson with Gold Trim)
    const sleighGeo = new THREE.BoxGeometry(7, 2.5, 4.5);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.6 });
    const sleighMesh = new THREE.Mesh(sleighGeo, redMat);
    sleighMesh.position.y = 1.8;
    sleighMesh.castShadow = true;
    santaGroup.add(sleighMesh);

    // Gold Trim Runners
    const runnerGeo = new THREE.CylinderGeometry(0.12, 0.12, 9, 8);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });

    const runnerL = new THREE.Mesh(runnerGeo, goldMat);
    runnerL.rotation.x = Math.PI / 2;
    runnerL.position.set(-2.0, 0.3, 0);
    santaGroup.add(runnerL);

    const runnerR = new THREE.Mesh(runnerGeo, goldMat);
    runnerR.rotation.x = Math.PI / 2;
    runnerR.position.set(2.0, 0.3, 0);
    santaGroup.add(runnerR);

    // 3D Santa Model seated in sleigh
    const santaModel = new THREE.Group();
    santaModel.position.set(0, 2.8, -0.6);

    // Body
    const sBody = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 1.8, 12), redMat);
    sBody.position.y = 0.9;
    santaModel.add(sBody);

    // White Beard
    const beardMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 8), beardMat);
    beard.position.set(0, 1.6, 0.7);
    beard.rotation.x = 0.2;
    santaModel.add(beard);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfecdd3, roughness: 0.6 });
    const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), headMat);
    sHead.position.set(0, 2.0, 0);
    santaModel.add(sHead);

    // Santa Hat
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.4, 12), redMat);
    hat.position.set(0.1, 2.8, -0.2);
    hat.rotation.x = -0.3;
    santaModel.add(hat);

    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), beardMat);
    pom.position.set(0.1, 3.5, -0.5);
    santaModel.add(pom);

    santaGroup.add(santaModel);

    // 2 Festive Reindeer ahead of the sleigh
    const deer1 = this.createReindeer();
    deer1.position.set(-2.5, 0, 7.5);
    santaGroup.add(deer1);

    const deer2 = this.createReindeer();
    deer2.position.set(2.5, 0, 7.5);
    santaGroup.add(deer2);

    this.scene.add(santaGroup);
  }

  private createReindeer(): THREE.Group {
    const deer = new THREE.Group();
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

    // Torso
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 2.8), coatMat);
    body.position.y = 2.0;
    deer.add(body);

    // Neck & Head
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.8), coatMat);
    neck.position.set(0, 2.9, 1.2);
    neck.rotation.x = 0.3;
    deer.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.4), coatMat);
    head.position.set(0, 3.8, 1.8);
    deer.add(head);

    // Rudolph's Red Nose
    const redNose = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redNose.position.set(0, 3.7, 2.5);
    deer.add(redNose);

    // Antlers
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const antL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 0.15), antlerMat);
    antL.position.set(-0.5, 4.6, 1.6);
    antL.rotation.z = -0.2;
    deer.add(antL);

    const antR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, 0.15), antlerMat);
    antR.position.set(0.5, 4.6, 1.6);
    antR.rotation.z = 0.2;
    deer.add(antR);

    // 4 Legs
    const legGeo = new THREE.BoxGeometry(0.35, 1.8, 0.35);
    const legPositions = [
      [-0.6, 0.9, 1.0], [0.6, 0.9, 1.0],
      [-0.6, 0.9, -1.0], [0.6, 0.9, -1.0]
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, coatMat);
      leg.position.set(x, y, z);
      deer.add(leg);
    });

    return deer;
  }

  private buildDecorations(): void {
    // 1. Lush Christmas Trees of varying sizes
    const treePositions = [
      [-20, -25], [-12, -38], [15, -35], [22, -22],
      [-32, -15], [-26, 18], [-35, 25], [-16, 32],
      [18, 28], [30, 22], [35, -15], [24, -42],
      [-55, -20], [-52, 22], [55, -18], [52, 24]
    ];

    treePositions.forEach(([x, z], idx) => {
      const tree = this.createChristmasTree(1.2 + (idx % 3) * 0.3);
      tree.position.set(x, 1.8, z);
      this.scene.add(tree);
    });

    // 2. Giant Candy Canes along paths
    const canePositions = [
      [-4, -14], [4, -14],
      [-14, 4], [14, 4],
      [-4, 18], [4, 18]
    ];

    canePositions.forEach(([x, z]) => {
      const cane = this.createCandyCane();
      cane.position.set(x, 1.8, z);
      this.scene.add(cane);
    });

    // 3. Holiday Street Lanterns
    const lanternPositions = [
      [-6, -6], [6, -6],
      [-6, 6], [6, 6]
    ];

    lanternPositions.forEach(([x, z]) => {
      const lantern = this.createStreetLantern();
      lantern.position.set(x, 1.8, z);
      this.scene.add(lantern);
    });
  }

  private createChristmasTree(scale = 1.0): THREE.Group {
    const tree = new THREE.Group();
    tree.scale.set(scale, scale, scale);

    const trunkGeo = new THREE.CylinderGeometry(0.8, 1.0, 3, 10);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x543310, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    tree.add(trunk);

    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7 });
    const snowTipMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });

    const tiers = [
      { r: 5.5, h: 4.5, y: 4.5 },
      { r: 4.2, h: 4.0, y: 7.2 },
      { r: 2.8, h: 3.5, y: 9.8 }
    ];

    tiers.forEach(t => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 12), foliageMat);
      cone.position.y = t.y;
      cone.castShadow = true;
      tree.add(cone);

      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(t.r * 0.45, t.h * 0.45, 12), snowTipMat);
      snowCap.position.y = t.y + t.h * 0.3;
      tree.add(snowCap);
    });

    // Golden Topper Star
    const starGeo = new THREE.OctahedronGeometry(0.9, 0);
    const starMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.y = 12.2;
    tree.add(star);

    // Colored Ornaments
    const colors = [0xef4444, 0x3b82f6, 0xfacc15, 0xec4899];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = 2.5 + Math.random() * 2.2;
      const y = 3.5 + Math.random() * 6.5;
      const orn = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], metalness: 0.5, roughness: 0.3 })
      );
      orn.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      tree.add(orn);
    }

    return tree;
  }

  private getCandyCaneTexture(): THREE.CanvasTexture {
    if (this.candyCaneTexture) return this.candyCaneTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 512);

      ctx.fillStyle = '#dc2626';
      const stripeWidth = 32;
      for (let y = -512; y < 1024; y += stripeWidth * 2) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(128, y + 128);
        ctx.lineTo(128, y + 128 + stripeWidth);
        ctx.lineTo(0, y + stripeWidth);
        ctx.closePath();
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    this.candyCaneTexture = texture;
    return texture;
  }

  private createCandyCane(): THREE.Group {
    const cane = new THREE.Group();
    const texture = this.getCandyCaneTexture();
    const caneMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.3,
      metalness: 0.1
    });

    const path = new THREE.CurvePath<THREE.Vector3>();
    const straight = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 5.0, 0));
    path.add(straight);

    const arc = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 5.0, 0),
      new THREE.Vector3(0, 7.2, 0),
      new THREE.Vector3(1.6, 6.2, 0)
    );
    path.add(arc);

    const tubeGeo = new THREE.TubeGeometry(path, 32, 0.42, 12, false);
    const tubeMesh = new THREE.Mesh(tubeGeo, caneMat);
    tubeMesh.castShadow = true;
    cane.add(tubeMesh);

    return cane;
  }

  private createStreetLantern(): THREE.Group {
    const lantern = new THREE.Group();

    const postGeo = new THREE.CylinderGeometry(0.2, 0.3, 7, 8);
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const post = new THREE.Mesh(postGeo, ironMat);
    post.position.y = 3.5;
    lantern.add(post);

    const glassGeo = new THREE.CylinderGeometry(0.6, 0.45, 1.2, 6);
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = 7.2;
    lantern.add(glass);

    const light = new THREE.PointLight(0xfef08a, 0.9, 14);
    light.position.y = 7.2;
    lantern.add(light);

    return lantern;
  }

  /**
   * High-mounted, high-visibility Roof Signboard.
   * All signs face SOUTH (+Z, rotation.y = 0) so they are 100% readable from the camera!
   */
  private createRoofSign(title: string, subtitle: string): THREE.Group {
    const sign = new THREE.Group();

    // Dual Roof Mounting Struts
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const strutGeo = new THREE.BoxGeometry(0.3, 2.0, 0.3);
    const sL = new THREE.Mesh(strutGeo, strutMat);
    sL.position.set(-2.5, -0.6, 0);
    sign.add(sL);
    const sR = new THREE.Mesh(strutGeo, strutMat);
    sR.position.set(2.5, -0.6, 0);
    sign.add(sR);

    // Main Wooden Backing
    const boardGeo = new THREE.BoxGeometry(6.6, 2.8, 0.3);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x543310, roughness: 0.8 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.castShadow = true;
    sign.add(board);

    // Snowy Gabled Roof Ridge Trim
    const snowCapGeo = new THREE.BoxGeometry(7.0, 0.45, 0.6);
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
    const snowCap = new THREE.Mesh(snowCapGeo, snowMat);
    snowCap.position.y = 1.45;
    sign.add(snowCap);

    // Crisp Canvas Texture for High-Resolution Text (512x256)
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#14532d');
      grad.addColorStop(1, '#052e16');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(8, 8, 496, 240, 20);
      ctx.fill();

      // Gold Borders
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.roundRect(12, 12, 488, 232, 16);
      ctx.stroke();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(22, 22, 468, 212, 12);
      ctx.stroke();

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 38px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 8;
      ctx.fillText(title, 256, 96);

      // Subtitle
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 25px sans-serif';
      ctx.shadowBlur = 6;
      ctx.fillText(subtitle, 256, 172);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.MeshBasicMaterial({ map: texture });
    const textPlate = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.65), textMat);
    textPlate.position.set(0, 0, 0.17);
    sign.add(textPlate);

    return sign;
  }

  /**
   * Ground Signpost, dual-sided, facing SOUTH (+Z).
   */
  private createSignpost(title: string, subtitle: string): THREE.Group {
    const sign = new THREE.Group();

    // Dual Side Posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0x543310, roughness: 0.85 });
    const postGeo = new THREE.CylinderGeometry(0.24, 0.28, 4.8, 12);

    const postL = new THREE.Mesh(postGeo, postMat);
    postL.position.set(-2.6, 2.4, -0.12);
    sign.add(postL);

    const postR = new THREE.Mesh(postGeo, postMat);
    postR.position.set(2.6, 2.4, -0.12);
    sign.add(postR);

    // Main Wooden Signboard Backing
    const boardGeo = new THREE.BoxGeometry(5.0, 2.2, 0.24);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 3.4, 0);
    sign.add(board);

    // Snowy Gabled Roof Trim on top
    const roofGeo = new THREE.BoxGeometry(5.4, 0.35, 0.55);
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
    const roof = new THREE.Mesh(roofGeo, snowMat);
    roof.position.set(0, 4.55, 0);
    sign.add(roof);

    // Canvas Texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#14532d');
      grad.addColorStop(1, '#052e16');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(8, 8, 496, 240, 20);
      ctx.fill();

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.roundRect(12, 12, 488, 232, 16);
      ctx.stroke();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(22, 22, 468, 212, 12);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.fillText(title, 256, 92);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 24px sans-serif';
      ctx.shadowBlur = 4;
      ctx.fillText(subtitle, 256, 165);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.MeshBasicMaterial({ map: texture });

    // Front text plate
    const textPlateFront = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 2.05), textMat);
    textPlateFront.position.set(0, 3.4, 0.13);
    sign.add(textPlateFront);

    return sign;
  }

  private buildPenguins(): void {
    const penguinPositions = [
      new THREE.Vector3(-15, 1.8, -12),
      new THREE.Vector3(22, 1.8, -8),
      new THREE.Vector3(14, 1.8, 18),
      new THREE.Vector3(-20, 1.8, 12)
    ];

    penguinPositions.forEach((pos, idx) => {
      const pGroup = new THREE.Group();
      pGroup.position.copy(pos);

      // Body (Black Egg)
      const bodyGeo = new THREE.SphereGeometry(0.8, 12, 12);
      const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
      const body = new THREE.Mesh(bodyGeo, blackMat);
      body.scale.set(0.9, 1.3, 0.85);
      body.position.y = 1.0;
      pGroup.add(body);

      // White Belly
      const bellyGeo = new THREE.SphereGeometry(0.65, 12, 12);
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
      const belly = new THREE.Mesh(bellyGeo, whiteMat);
      belly.scale.set(0.75, 1.1, 0.75);
      belly.position.set(0, 0.9, 0.35);
      pGroup.add(belly);

      // Beak
      const beakGeo = new THREE.ConeGeometry(0.18, 0.4, 8);
      const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316 });
      const beak = new THREE.Mesh(beakGeo, orangeMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 1.45, 0.8);
      pGroup.add(beak);

      this.scene.add(pGroup);
      this.animatedPenguins.push({
        group: pGroup,
        basePos: pos.clone(),
        angle: (idx / 4) * Math.PI * 2,
        speed: 0.6 + idx * 0.15,
        waddle: 0
      });
    });
  }

  private buildSnowfall(): void {
    const snowCount = 1800;
    const snowGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(snowCount * 3);

    for (let i = 0; i < snowCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 220;
      positions[i * 3 + 1] = Math.random() * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 220;
    }

    snowGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.45,
      transparent: true,
      opacity: 0.85
    });

    this.snowParticles = new THREE.Points(snowGeo, snowMat);
    this.scene.add(this.snowParticles);
  }

  /**
   * Builds player avatar with an unmistakable, cheerful, happy Animal Crossing smiling face!
   */
  private buildPlayer(): void {
    this.playerGroup = new THREE.Group();
    this.playerGroup.position.copy(this.playerPos);

    const activePlayer = familyStore.getActivePlayer();
    const avatarDef = AVATAR_ROSTER.find(a => a.id === activePlayer.avatarId) || AVATAR_ROSTER[0];
    const coatColor = avatarDef.color ? parseInt(avatarDef.color.replace('#', '0x')) : 0x0284c7;
    const hatColor = avatarDef.hatColor ? parseInt(avatarDef.hatColor.replace('#', '0x')) : 0xdc2626;

    // Torso (Winter Coat)
    const coatGeo = new THREE.CylinderGeometry(0.7, 0.95, 1.8, 12);
    const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.7 });
    const coat = new THREE.Mesh(coatGeo, coatMat);
    coat.position.y = 1.6;
    coat.castShadow = true;
    this.playerGroup.add(coat);

    // Warm Fur Collar
    const collarGeo = new THREE.TorusGeometry(0.75, 0.2, 8, 16);
    const furMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const collar = new THREE.Mesh(collarGeo, furMat);
    collar.position.y = 2.45;
    collar.rotation.x = Math.PI / 2;
    this.playerGroup.add(collar);

    // Head
    const headGeo = new THREE.SphereGeometry(0.85, 16, 16);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 3.0;
    head.castShadow = true;
    this.playerGroup.add(head);

    // Large Villager Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2 });
    const eyeGeo = new THREE.SphereGeometry(0.12, 12, 12);

    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.28, 2.95, 0.78);
    eyeL.scale.set(1.0, 1.35, 0.35);
    this.playerGroup.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.28, 2.95, 0.78);
    eyeR.scale.set(1.0, 1.35, 0.35);
    this.playerGroup.add(eyeR);

    // Sparkle Highlights in Eyes
    const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sparkleGeo = new THREE.SphereGeometry(0.045, 8, 8);

    const spL = new THREE.Mesh(sparkleGeo, sparkleMat);
    spL.position.set(-0.24, 3.02, 0.83);
    this.playerGroup.add(spL);

    const spR = new THREE.Mesh(sparkleGeo, sparkleMat);
    spR.position.set(0.32, 3.02, 0.83);
    this.playerGroup.add(spR);

    // Cute Button Nose
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), noseMat);
    nose.position.set(0, 2.82, 0.84);
    this.playerGroup.add(nose);

    // Rosy Pink Cheeks
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.75 });
    const blushGeo = new THREE.CircleGeometry(0.14, 16);

    const blushL = new THREE.Mesh(blushGeo, blushMat);
    blushL.position.set(-0.48, 2.75, 0.72);
    blushL.rotation.y = -0.35;
    this.playerGroup.add(blushL);

    const blushR = new THREE.Mesh(blushGeo, blushMat);
    blushR.position.set(0.48, 2.75, 0.72);
    blushR.rotation.y = 0.35;
    this.playerGroup.add(blushR);

    // BIG HAPPY SMILING MOUTH (Curves UPWARDS via rotation.z = Math.PI)
    const smileGeo = new THREE.TorusGeometry(0.15, 0.03, 8, 16, Math.PI);
    const smileMat = new THREE.MeshBasicMaterial({ color: 0x831843 });
    const smile = new THREE.Mesh(smileGeo, smileMat);
    smile.position.set(0, 2.62, 0.84);
    smile.rotation.z = Math.PI; // Rotates arc so it curves UPWARDS!
    smile.rotation.x = -Math.PI * 0.1;
    this.playerGroup.add(smile);

    // Happy open mouth rosy interior
    const mouthFillGeo = new THREE.CircleGeometry(0.13, 16, 0, Math.PI);
    const mouthFillMat = new THREE.MeshBasicMaterial({ color: 0xbe123c });
    const mouthFill = new THREE.Mesh(mouthFillGeo, mouthFillMat);
    mouthFill.position.set(0, 2.62, 0.835);
    mouthFill.rotation.z = Math.PI;
    mouthFill.rotation.x = -Math.PI * 0.1;
    this.playerGroup.add(mouthFill);

    // Bobble Hat
    const hatGeo = new THREE.ConeGeometry(0.9, 1.2, 16);
    const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.7 });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 3.8;
    this.playerGroup.add(hat);

    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), furMat);
    pom.position.y = 4.5;
    this.playerGroup.add(pom);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 8);
    this.playerArmL = new THREE.Mesh(armGeo, coatMat);
    this.playerArmL.position.set(-1.1, 1.8, 0);
    this.playerGroup.add(this.playerArmL);

    this.playerArmR = new THREE.Mesh(armGeo, coatMat);
    this.playerArmR.position.set(1.1, 1.8, 0);
    this.playerGroup.add(this.playerArmR);

    // Legs / Boots
    const legGeo = new THREE.CylinderGeometry(0.28, 0.35, 1.1, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    this.playerLegL = new THREE.Mesh(legGeo, legMat);
    this.playerLegL.position.set(-0.45, 0.55, 0);
    this.playerGroup.add(this.playerLegL);

    this.playerLegR = new THREE.Mesh(legGeo, legMat);
    this.playerLegR.position.set(0.45, 0.55, 0);
    this.playerGroup.add(this.playerLegR);

    this.scene.add(this.playerGroup);
  }

  private setupPortals(): void {
    this.interactivePortals = [
      {
        id: 'wordle',
        pos: new THREE.Vector3(0, 1.8, -40),
        radius: 8,
        title: '🟩 Henry-Wordle',
        actionText: 'Tap or Press Space to Play Wordle'
      },
      {
        id: 'lake',
        pos: new THREE.Vector3(24, 1.8, 4),
        radius: 8,
        title: '🪷 Henry-Lake',
        actionText: 'Tap or Press Space to Play Lake'
      },
      {
        id: 'quiz',
        pos: new THREE.Vector3(-40, 1.8, 4),
        radius: 8,
        title: '🧠 Henry-Quiz',
        actionText: 'Tap or Press Space to Play Quiz'
      },
      {
        id: 'wordLadder',
        pos: new THREE.Vector3(38, 1.8, 38),
        radius: 8,
        title: '🪜 Henry Word Ladder',
        actionText: 'Tap or Press Space to Play Word Ladder'
      },
      {
        id: 'podium',
        pos: new THREE.Vector3(0, 1.8, -10),
        radius: 9,
        title: '🏆 Snowman Podium',
        actionText: 'Tap or Press Space for Leaderboard'
      },
      {
        id: 'board',
        pos: new THREE.Vector3(22, 1.8, 2),
        radius: 7,
        title: '📌 Bulletin Board',
        actionText: 'Tap or Press Space for Messages'
      },
      {
        id: 'elves',
        pos: new THREE.Vector3(45, 1.8, -35),
        radius: 7,
        title: "🧝 Santa's Elves Workshop",
        actionText: 'Inspect the Toy Workshop'
      },
      {
        id: 'hearth',
        pos: new THREE.Vector3(-42, 1.8, -25),
        radius: 7,
        title: '🔥 Cozy Hearth Campfire',
        actionText: 'Warm up by the Campfire'
      }
    ];

    // Action Prompt Overlay
    this.promptEl = document.createElement('div');
    this.promptEl.id = 'portal-action-prompt';
    this.promptEl.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 border-2 border-amber-400 text-white px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center space-x-3 pointer-events-auto cursor-pointer transition-all transform scale-95 opacity-0 hidden';
    document.body.appendChild(this.promptEl);

    this.promptEl.addEventListener('click', () => {
      if (this.currentActiveTarget) {
        this.triggerInteraction(this.currentActiveTarget.id);
      }
    });
  }

  private isModalOpen(): boolean {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      return true;
    }
    const modalHost = document.getElementById('modal-host');
    if (modalHost && modalHost.children.length > 0) {
      return true;
    }
    const msgModal = document.getElementById('message-board-modal');
    if (msgModal && !msgModal.classList.contains('hidden')) {
      return true;
    }
    return false;
  }

  private setupInputs(): void {
    // Keyboard Walk & Action
    window.addEventListener('keydown', (e) => {
      if (this.isModalOpen()) return;
      this.keysDown[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.key === 'Enter') {
        if (this.currentActiveTarget) {
          e.preventDefault();
          this.triggerInteraction(this.currentActiveTarget.id);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.isModalOpen()) return;
      this.keysDown[e.key.toLowerCase()] = false;
    });

    // Mouse Wheel Zoom
    window.addEventListener('wheel', (e: WheelEvent) => {
      if (this.isModalOpen()) return;
      this.zoomLevel = THREE.MathUtils.clamp(this.zoomLevel + e.deltaY * 0.0012, 0.45, 2.0);
    }, { passive: true });

    // Touch Pinch-to-zoom
    let initialTouchDist: number | null = null;
    let initialZoom: number = 1.0;

    window.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        initialTouchDist = Math.hypot(dx, dy);
        initialZoom = this.zoomLevel;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length === 2 && initialTouchDist !== null) {
        const dx = e.touches[0].pageX - e.touches[1].pageX;
        const dy = e.touches[0].pageY - e.touches[1].pageY;
        const dist = Math.hypot(dx, dy);
        const factor = initialTouchDist / Math.max(1, dist);
        this.zoomLevel = THREE.MathUtils.clamp(initialZoom * factor, 0.45, 2.0);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      initialTouchDist = null;
    }, { passive: true });

    // Window Resize
    window.addEventListener('resize', () => {
      if (!this.camera || !this.renderer) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Click / Tap on 3D landmarks
    this.container.addEventListener('pointerdown', (e) => {
      if (this.isModalOpen()) return;
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      for (const portal of this.interactivePortals) {
        const dist = this.playerPos.distanceTo(portal.pos);
        if (dist <= portal.radius * 1.5) {
          this.triggerInteraction(portal.id);
          break;
        }
      }
    });
  }

  // --- Zoom Controls ---

  public zoomIn(): void {
    this.setZoom(this.zoomLevel - 0.2);
  }

  public zoomOut(): void {
    this.setZoom(this.zoomLevel + 0.2);
  }

  public setZoom(level: number): void {
    this.zoomLevel = THREE.MathUtils.clamp(level, 0.45, 2.0);
  }

  public getZoom(): number {
    return this.zoomLevel;
  }

  public setJoystickInput(x: number, y: number): void {
    this.joystickVector.x = x;
    this.joystickVector.y = y;
  }

  public teleportTo(id: GameType | 'podium' | 'board' | 'elves' | 'hearth'): void {
    const portal = this.interactivePortals.find(p => p.id === id);
    if (portal) {
      this.playerPos.copy(portal.pos);
      this.playerPos.y = 1.8;
      this.playerGroup.position.copy(this.playerPos);
      playSound('snowStep');
      this.checkProximity();
    }
  }

  private triggerInteraction(id: string): void {
    if (this.isModalOpen()) return;
    playSound('buttonClick');
    if (id === 'wordle' || id === 'lake' || id === 'quiz' || id === 'wordLadder') {
      this.callbacks.onTriggerGame(id as GameType);
    } else if (id === 'podium') {
      this.callbacks.onOpenPodium();
    } else if (id === 'board') {
      this.callbacks.onOpenMessageBoard();
    } else if (id === 'elves') {
      this.showCollectToast("🧝 Santa's Elves: 'We are wrapping toys for the Henry family!'");
      soundAudio.playJingle();
    } else if (id === 'hearth') {
      this.showCollectToast("🔥 Cozy Hearth: 'The campfire crackles warmly as snow falls...'");
      soundAudio.playJingle();
    }
  }

  private showCollectToast(text: string): void {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-2xl border-2 border-white/80 animate-bounce pointer-events-none flex items-center gap-2';
    toast.innerHTML = text;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.5s ease';
      setTimeout(() => toast.remove(), 500);
    }, 2800);
  }

  private updateMovement(delta: number): void {
    let dx = 0;
    let dz = 0;

    if (this.keysDown['w'] || this.keysDown['arrowup']) dz -= 1;
    if (this.keysDown['s'] || this.keysDown['arrowdown']) dz += 1;
    if (this.keysDown['a'] || this.keysDown['arrowleft']) dx -= 1;
    if (this.keysDown['d'] || this.keysDown['arrowright']) dx += 1;

    if (Math.abs(this.joystickVector.x) > 0.1 || Math.abs(this.joystickVector.y) > 0.1) {
      dx += this.joystickVector.x;
      dz += this.joystickVector.y;
    }

    const len = Math.hypot(dx, dz);
    if (len > 0.05) {
      const moveSpeed = 16.0;
      const normX = dx / Math.max(1, len);
      const normZ = dz / Math.max(1, len);

      this.playerPos.x += normX * moveSpeed * delta;
      this.playerPos.z += normZ * moveSpeed * delta;

      // Island border boundary clamp (keep player on land)
      const currentDist = Math.hypot(this.playerPos.x, this.playerPos.z);
      if (currentDist > 80) {
        this.playerPos.x = (this.playerPos.x / currentDist) * 80;
        this.playerPos.z = (this.playerPos.z / currentDist) * 80;
      }

      // Lake boundary collision (prevent walking into the frozen lake)
      const distToLakeCenter = Math.hypot(this.playerPos.x - 48, this.playerPos.z - 4);
      if (distToLakeCenter < 19.5) {
        const angle = Math.atan2(this.playerPos.z - 4, this.playerPos.x - 48);
        this.playerPos.x = 48 + Math.cos(angle) * 19.5;
        this.playerPos.z = 4 + Math.sin(angle) * 19.5;
      }

      this.playerGroup.position.x = this.playerPos.x;
      this.playerGroup.position.z = this.playerPos.z;

      this.playerTargetRotation = Math.atan2(normX, normZ);
      this.playerGroup.rotation.y = THREE.MathUtils.lerp(
        this.playerGroup.rotation.y,
        this.playerTargetRotation,
        0.18
      );

      // Walk limb cycle
      this.walkCycle += delta * 14;
      const legAngle = Math.sin(this.walkCycle) * 0.65;
      this.playerLegL.rotation.x = legAngle;
      this.playerLegR.rotation.x = -legAngle;
      this.playerArmL.rotation.x = -legAngle * 0.8;
      this.playerArmR.rotation.x = legAngle * 0.8;

      if (Math.sin(this.walkCycle) > 0.95 && Math.random() < 0.25) {
        playSound('snowStep');
      }
    } else {
      this.playerLegL.rotation.x = THREE.MathUtils.lerp(this.playerLegL.rotation.x, 0, 0.2);
      this.playerLegR.rotation.x = THREE.MathUtils.lerp(this.playerLegR.rotation.x, 0, 0.2);
      this.playerArmL.rotation.x = THREE.MathUtils.lerp(this.playerArmL.rotation.x, 0, 0.2);
      this.playerArmR.rotation.x = THREE.MathUtils.lerp(this.playerArmR.rotation.x, 0, 0.2);
    }

    // Camera following player with smooth zoom interpolation
    const targetCamX = this.playerPos.x + this.baseCameraOffset.x;
    const targetCamY = this.playerPos.y + this.baseCameraOffset.y * this.zoomLevel;
    const targetCamZ = this.playerPos.z + this.baseCameraOffset.z * this.zoomLevel;

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, 0.08);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, 0.08);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, 0.08);
    this.camera.lookAt(this.playerPos.x, this.playerPos.y + 2, this.playerPos.z);
  }

  private checkProximity(): void {
    let nearestPortal: (typeof this.interactivePortals)[0] | null = null;
    let minDist = Infinity;

    for (const portal of this.interactivePortals) {
      const dist = this.playerPos.distanceTo(portal.pos);
      if (dist < portal.radius && dist < minDist) {
        minDist = dist;
        nearestPortal = portal;
      }
    }

    if (nearestPortal) {
      if (this.currentActiveTarget !== nearestPortal) {
        this.currentActiveTarget = nearestPortal;
        if (this.promptEl) {
          this.promptEl.innerHTML = `
            <span class="text-xl">✨</span>
            <div class="text-left">
              <span class="font-black text-amber-300 block text-xs tracking-wider uppercase">${nearestPortal.title}</span>
              <span class="font-bold text-white text-sm">${nearestPortal.actionText}</span>
            </div>
            <span class="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-900 font-extrabold text-[11px] shadow">Space</span>
          `;
          this.promptEl.classList.remove('hidden');
          requestAnimationFrame(() => {
            this.promptEl?.classList.remove('opacity-0', 'scale-95');
          });
        }
      }
    } else {
      if (this.currentActiveTarget) {
        this.currentActiveTarget = null;
        if (this.promptEl) {
          this.promptEl.classList.add('opacity-0', 'scale-95');
          setTimeout(() => {
            if (!this.currentActiveTarget) {
              this.promptEl?.classList.add('hidden');
            }
          }, 180);
        }
      }
    }
  }

  private updateScavengerProximity(delta: number, time: number): void {
    const active = familyStore.getActivePlayer();
    const foundIds = familyStore.getScavengerFoundIds(active.id);

    this.scavengerMeshes.forEach((item, idx) => {
      // Bobbing & Gentle Rotation
      item.group.position.y = item.baseY + Math.sin(time * 3 + idx) * 0.25;
      item.group.rotation.y += delta * 1.6;

      if (!foundIds.includes(item.id)) {
        item.group.visible = true;
        const dist = this.playerPos.distanceTo(item.basePos);
        if (dist <= 3.5) {
          // Player collected item!
          const result = familyStore.recordScavengerItemFound(item.id, active.id);
          if (result.newlyFound) {
            soundAudio.playJingle();
            const def = DAILY_SCAVENGER_ITEMS.find(d => d.id === item.id);
            const itemName = def ? `${def.emoji} ${def.name}` : 'Holiday Item';
            this.showCollectToast(`✨ Discovered: <strong>${itemName}</strong>!`);

            if (result.completedAll) {
              soundAudio.playVictory();
              this.showCollectToast(`🎉 All 5 Items Discovered! <strong>+2 Points Awarded!</strong>`);
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            }
            item.group.visible = false;
          }
        }
      } else {
        item.group.visible = false;
      }
    });
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.getElapsedTime();

    // 1. Player Movement & Camera
    this.updateMovement(delta);

    // 2. Proximity checks
    this.checkProximity();
    this.updateScavengerProximity(delta, time);

    // 3. Campfire Light Warm Flicker
    if (this.campfireLight) {
      this.campfireLight.intensity = 2.2 + Math.sin(time * 10) * 0.4 + Math.random() * 0.25;
    }

    // 4. Animated Elves (tapping hammer & bobbing)
    this.animatedElves.forEach((elf, idx) => {
      elf.group.position.y = 1.8 + Math.abs(Math.sin(time * 3 + idx)) * 0.15;
      elf.arm.rotation.x = Math.PI / 4 + Math.sin(time * 8 + idx) * 0.4;
    });

    // 5. Snowfall Falling Animation
    if (this.snowParticles) {
      const posAttr = this.snowParticles.geometry.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= delta * 12;
        positions[i] += Math.sin(time + i) * 0.04;
        if (positions[i + 1] < 0) {
          positions[i + 1] = 75;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 6. Penguins Waddling Animation
    this.animatedPenguins.forEach(p => {
      p.angle += delta * p.speed * 0.3;
      p.group.position.x = p.basePos.x + Math.cos(p.angle) * 3.5;
      p.group.position.z = p.basePos.z + Math.sin(p.angle) * 3.5;
      p.group.rotation.y = -p.angle + Math.PI / 2;

      p.waddle += delta * 8;
      p.group.rotation.z = Math.sin(p.waddle) * 0.12;
    });

    // 7. Render
    this.renderer.render(this.scene, this.camera);
  };

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.unsubscribeStore) {
      this.unsubscribeStore();
    }
    if (this.promptEl && this.promptEl.parentNode) {
      this.promptEl.parentNode.removeChild(this.promptEl);
    }
    this.renderer.dispose();
  }
}
