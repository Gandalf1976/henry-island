import confetti from 'canvas-confetti';
import * as THREE from 'three';
import { AVATAR_ROSTER } from '../data/avatars';
import { getDailyScavengerItems } from '../data/scavengerItems';
import { familyStore, LeaderboardEntry } from '../state/familyStore';
import { GameType } from '../types';
import { playSound, soundAudio } from '../utils/audio';
import { getTodayDateKey } from '../utils/dailyClock';

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
  private animatedPenguins: {
    group: THREE.Group;
    currentPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    speed: number;
    waddlePhase: number;
    pauseTimer: number;
    isPausing: boolean;
    footL: THREE.Mesh;
    footR: THREE.Mesh;
    flipperL: THREE.Mesh;
    flipperR: THREE.Mesh;
  }[] = [];
  private animatedLilyPads: {
    mesh: THREE.Group;
    baseY: number;
    phase: number;
    rotSpeed: number;
  }[] = [];
  private lakeWaterMesh?: THREE.Mesh;
  private animatedElves: { group: THREE.Group; arm: THREE.Mesh; basePos: THREE.Vector3 }[] = [];
  private campfireLight?: THREE.PointLight;
  private podiumSnowmenGroups: THREE.Group[] = [];
  private podiumPlaquesGroups: THREE.Group[] = [];
  private candyCaneTexture: THREE.CanvasTexture | null = null;
  private santaArm?: THREE.Mesh;
  private santaTorso?: THREE.Group;
  private santaSpeechBubble?: THREE.Group;
  private santaSpeechTimer: number = 0;
  private santaSpeechVisible: boolean = false;
  private animatedChildren: { group: THREE.Group; baseY: number; armL?: THREE.Mesh; armR?: THREE.Mesh; phase: number }[] = [];

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
    id: GameType | 'podium' | 'board' | 'elves' | 'hearth' | 'santa';
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
  private baseCameraOffset = new THREE.Vector3(0, 25, 29);

  // Sailboat & Water Navigation
  private playerMode: 'avatar' | 'sailboat_lake' | 'sailboat_ocean' = 'avatar';
  private sailboatGroup!: THREE.Group;
  private boatPennant?: THREE.Mesh;
  private boatWakeTimer: number = 0;

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

    // 2. Camera - Clear isometric Animal Crossing perspective
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 1000);
    this.camera.position.set(0, 27, 31);

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

    // 6. Player & Sailboat
    this.buildPlayer();
    this.buildSailboat();

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

    // 3. Snowy Island Plateau (Upper Level - Surface sits at Y = 1.70 so all paths and props are unburied!)
    const extrudeSettings = {
      depth: 3.2,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 2.0,
      bevelThickness: 0.5
    };
    const islandGeo = new THREE.ExtrudeGeometry(islandShape, extrudeSettings);
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.85,
      metalness: 0.05
    });
    const islandMesh = new THREE.Mesh(islandGeo, snowMat);
    islandMesh.rotation.x = Math.PI / 2;
    islandMesh.position.y = 1.20;
    islandMesh.receiveShadow = true;
    this.scene.add(islandMesh);

    // 4. Sandy Frozen Beach Shoreline Rim (Lower Skirt at Y = 0.80)
    const beachSettings = {
      depth: 2.0,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 4.5,
      bevelThickness: 0.6
    };
    const beachGeo = new THREE.ExtrudeGeometry(islandShape, beachSettings);
    const beachMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.95
    });
    const beachMesh = new THREE.Mesh(beachGeo, beachMat);
    beachMesh.rotation.x = Math.PI / 2;
    beachMesh.position.y = 0.20;
    beachMesh.receiveShadow = true;
    this.scene.add(beachMesh);

    // 5. Cobblestone Paths (Elevated at Y = 1.80, sitting crisply on top of the snow)
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });

    // Grand Expanded Town Center Plaza (Radius 28)
    const plazaGeo = new THREE.CylinderGeometry(28, 28, 0.15, 40);
    const plaza = new THREE.Mesh(plazaGeo, pathMat);
    plaza.position.set(0, 1.8, 0);
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    // Path North to Wordle Lodge (0, 1.8, -48)
    const pathNorthGeo = new THREE.BoxGeometry(6, 0.15, 44);
    const pathNorth = new THREE.Mesh(pathNorthGeo, pathMat);
    pathNorth.position.set(0, 1.8, -26);
    pathNorth.receiveShadow = true;
    this.scene.add(pathNorth);

    // Path East to Henry Lake (48, 1.8, 4)
    const pathEastGeo = new THREE.BoxGeometry(42, 0.15, 6);
    const pathEast = new THREE.Mesh(pathEastGeo, pathMat);
    pathEast.position.set(26, 1.8, 4);
    pathEast.receiveShadow = true;
    this.scene.add(pathEast);

    // Path West to Quiz Lodge (-48, 1.8, 4)
    const pathWestGeo = new THREE.BoxGeometry(42, 0.15, 6);
    const pathWest = new THREE.Mesh(pathWestGeo, pathMat);
    pathWest.position.set(-26, 1.8, 4);
    pathWest.receiveShadow = true;
    this.scene.add(pathWest);

    // Path South to Santa & Sleigh (0, 1.8, 42)
    const pathSouthGeo = new THREE.BoxGeometry(6, 0.15, 36);
    const pathSouth = new THREE.Mesh(pathSouthGeo, pathMat);
    pathSouth.position.set(0, 1.8, 25);
    pathSouth.receiveShadow = true;
    this.scene.add(pathSouth);

    // Path South-East to Word Ladder Lodge (38, 1.8, 38)
    const pathLadderGeo = new THREE.BoxGeometry(5, 0.15, 50);
    const pathLadder = new THREE.Mesh(pathLadderGeo, pathMat);
    pathLadder.position.set(19, 1.8, 19);
    pathLadder.rotation.y = Math.PI / 4;
    pathLadder.receiveShadow = true;
    this.scene.add(pathLadder);

    // Path South-West to Henry Target 24 Math Chalet (-36, 1.8, 32)
    const pathTarget24Geo = new THREE.BoxGeometry(5, 0.15, 48);
    const pathTarget24 = new THREE.Mesh(pathTarget24Geo, pathMat);
    pathTarget24.position.set(-18, 1.8, 16);
    pathTarget24.rotation.y = Math.atan2(-36, 32);
    pathTarget24.receiveShadow = true;
    this.scene.add(pathTarget24);

    // Path North-East to Santa's Elves Workshop (45, 1.8, -35)
    const pathElvesGeo = new THREE.BoxGeometry(5, 0.15, 42);
    const pathElves = new THREE.Mesh(pathElvesGeo, pathMat);
    pathElves.position.set(24, 1.8, -18);
    pathElves.rotation.y = Math.PI / 4;
    pathElves.receiveShadow = true;
    this.scene.add(pathElves);

    // Path South-West to Cozy Hearth (-42, 1.8, -25)
    const pathHearthGeo = new THREE.BoxGeometry(5, 0.15, 40);
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
    // Scaled to compact charming proportion (~20% smaller)
    // -------------------------------------------------------------
    const wordleGroup = new THREE.Group();
    wordleGroup.position.set(0, 1.8, -48);

    // Cabin Main Walls
    const cabinGeo = new THREE.BoxGeometry(13, 8.2, 11);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
    const cabinMesh = new THREE.Mesh(cabinGeo, woodMat);
    cabinMesh.position.y = 4.1;
    cabinMesh.castShadow = true;
    cabinMesh.receiveShadow = true;
    wordleGroup.add(cabinMesh);

    // Roof (Steep Snowy A-Frame)
    const roofGeo = new THREE.ConeGeometry(10.5, 5.8, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 11.0;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.1, 1, 1.2);
    roof.castShadow = true;
    wordleGroup.add(roof);

    // Chimney
    const chimneyGeo = new THREE.BoxGeometry(1.6, 5, 1.6);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const chimney = new THREE.Mesh(chimneyGeo, stoneMat);
    chimney.position.set(3.8, 10.5, -2.5);
    chimney.castShadow = true;
    wordleGroup.add(chimney);

    // Windows & Door
    const winGeo = new THREE.PlaneGeometry(2.0, 2.8);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const win1 = new THREE.Mesh(winGeo, winMat);
    win1.position.set(-3.2, 4.1, 5.55);
    wordleGroup.add(win1);
    const win2 = new THREE.Mesh(winGeo, winMat);
    win2.position.set(3.2, 4.1, 5.55);
    wordleGroup.add(win2);

    const doorGeo = new THREE.PlaneGeometry(2.4, 4.0);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 2.0, 5.55);
    wordleGroup.add(door);

    // ROOF SIGN - Mounted prominently on front roof gable, facing SOUTH!
    const wordleRoofSign = this.createRoofSign('WORDLE LODGE', '5-Letter Daily Challenge 🟩');
    wordleRoofSign.position.set(0, 11.8, 5.2);
    wordleRoofSign.rotation.set(0, 0, 0); // Faces South!
    wordleGroup.add(wordleRoofSign);

    this.scene.add(wordleGroup);

    // -------------------------------------------------------------
    // 2. SPARKLING WATER LAKE (East: 48, 1.8, 4)
    // Real crystal-clear deep water, dark pebble bed, animated lily pads with lotus blossoms!
    // -------------------------------------------------------------
    const lakeGroup = new THREE.Group();
    lakeGroup.position.set(48, 1.8, 4);

    // Lake Bed (Deep Stone & Pebble Basin)
    const lakeBedGeo = new THREE.CylinderGeometry(21, 20, 0.6, 32);
    const lakeBedMat = new THREE.MeshStandardMaterial({ color: 0x0f2937, roughness: 0.95 });
    const lakeBed = new THREE.Mesh(lakeBedGeo, lakeBedMat);
    lakeBed.position.y = -0.5;
    lakeBed.receiveShadow = true;
    lakeGroup.add(lakeBed);

    // Real Translucent Sparkling Azure Water Surface (sits at Y = 1.70, just below snow rim)
    const lakeWaterGeo = new THREE.CylinderGeometry(20.5, 20.5, 0.2, 32);
    const lakeWaterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // vibrant sky/azure water
      emissive: 0x0369a1,
      emissiveIntensity: 0.15,
      roughness: 0.08,
      metalness: 0.15,
      transparent: true,
      opacity: 0.85
    });
    const lakeWater = new THREE.Mesh(lakeWaterGeo, lakeWaterMat);
    lakeWater.position.y = -0.1;
    lakeWater.receiveShadow = true;
    lakeGroup.add(lakeWater);
    this.lakeWaterMesh = lakeWater;

    // Natural Snowbank Rim around lake
    const snowbankGeo = new THREE.TorusGeometry(20.5, 1.4, 8, 36);
    const snowbank = new THREE.Mesh(snowbankGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 }));
    snowbank.rotation.x = Math.PI / 2;
    snowbank.position.y = 0.15;
    lakeGroup.add(snowbank);

    // Decorative Snowy Boulders along shoreline
    const boulderMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    for (let r = 0; r < 8; r++) {
      const bAngle = (r / 8) * Math.PI * 2 + 0.25;
      const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(1.0 + (r % 3) * 0.3, 0), boulderMat);
      boulder.position.set(Math.cos(bAngle) * 20.5, 0.2, Math.sin(bAngle) * 20.5);
      boulder.scale.set(1.2, 0.7, 1.0);
      lakeGroup.add(boulder);
    }

    // 3D Realistic Lilypads with Notch & Lotus Waterlily Blossoms!
    const lilyPadOffsets = [
      { x: -8, z: -6, withFlower: true, scale: 1.1 },
      { x: -5, z: 7, withFlower: false, scale: 0.9 },
      { x: 3, z: -10, withFlower: false, scale: 1.0 },
      { x: 8, z: -3, withFlower: true, scale: 1.2 },
      { x: 6, z: 9, withFlower: false, scale: 0.95 },
      { x: -11, z: 4, withFlower: false, scale: 1.0 },
      { x: 12, z: 3, withFlower: true, scale: 1.15 },
      { x: -2, z: -12, withFlower: false, scale: 0.85 }
    ];

    lilyPadOffsets.forEach((padData, idx) => {
      const padGroup = this.create3DLilyPad(padData.withFlower, padData.scale);
      padGroup.position.set(padData.x, 0.02, padData.z);
      lakeGroup.add(padGroup);
      this.animatedLilyPads.push({
        mesh: padGroup,
        baseY: 0.02,
        phase: idx * 0.9,
        rotSpeed: 0.04 * (idx % 2 === 0 ? 1 : -1)
      });
    });

    // Lakeside Wooden Viewing Pier (extending west toward Town Center)
    const pierDeckGeo = new THREE.BoxGeometry(10, 0.4, 14);
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const pierDeck = new THREE.Mesh(pierDeckGeo, pierMat);
    pierDeck.position.set(-22, 0.15, 0);
    pierDeck.receiveShadow = true;
    lakeGroup.add(pierDeck);

    // Dock Pilings
    const pileMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    [[-25, -5], [-25, 5], [-19, -5], [-19, 5]].forEach(([px, pz]) => {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8), pileMat);
      piling.position.set(px, -0.4, pz);
      lakeGroup.add(piling);
    });

    // Railings flanking the dock with an open central boat slipway leading directly into the water
    const railMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });

    // North railing section (Z from +2.8 to +7)
    const railNorthGeo = new THREE.BoxGeometry(0.3, 1.4, 4.2);
    const railNorth = new THREE.Mesh(railNorthGeo, railMat);
    railNorth.position.set(-17.2, 0.8, 4.9);
    railNorth.castShadow = true;
    lakeGroup.add(railNorth);

    // South railing section (Z from -7 to -2.8)
    const railSouthGeo = new THREE.BoxGeometry(0.3, 1.4, 4.2);
    const railSouth = new THREE.Mesh(railSouthGeo, railMat);
    railSouth.position.set(-17.2, 0.8, -4.9);
    railSouth.castShadow = true;
    lakeGroup.add(railSouth);

    // Rail posts at outer corners and flanking the boat slipway
    [-6.5, -2.8, 2.8, 6.5].forEach(rz => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), railMat);
      post.position.set(-17.2, 0.8, rz);
      lakeGroup.add(post);
    });

    // Nautical Mooring Lanterns flanking the boat slipway
    [-2.8, 2.8].forEach(lz => {
      const lanternGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.45, 8);
      const lanternMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.65 });
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(-17.2, 1.8, lz);
      lakeGroup.add(lantern);
    });

    // Wooden Boat Slipway / Ramp leading gently into the lake water in the center opening
    const slipwayGeo = new THREE.BoxGeometry(4.2, 0.28, 5.2);
    const slipway = new THREE.Mesh(slipwayGeo, pierMat);
    slipway.position.set(-15.1, -0.06, 0);
    slipway.rotation.z = -0.10; // gently sloping down towards lake water
    slipway.receiveShadow = true;
    lakeGroup.add(slipway);

    // Festive Wreaths
    const wreathGeo = new THREE.TorusGeometry(0.7, 0.22, 8, 16);
    const wreathMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const wreath1 = new THREE.Mesh(wreathGeo, wreathMat);
    wreath1.position.set(-17.4, 0.9, -4.9);
    wreath1.rotation.y = Math.PI / 2;
    lakeGroup.add(wreath1);

    const wreath2 = new THREE.Mesh(wreathGeo, wreathMat);
    wreath2.position.set(-17.4, 0.9, 4.9);
    wreath2.rotation.y = Math.PI / 2;
    lakeGroup.add(wreath2);

    // Lake Signpost (standing prominently on the dry wooden dock entrance, facing SOUTH!)
    // Absolutely NO obstruction from the bulletin board (which is over at the West plaza)!
    const lakeSign = this.createSignpost('HENRY LAKE', '120s Word Scramble 🪷');
    lakeSign.position.set(-24, 0, -3.5);
    lakeSign.rotation.set(0, 0, 0); // Faces South!
    lakeGroup.add(lakeSign);

    // Dock Signpost: Sailboat Launch
    const boatSign = this.createSignpost('BOAT DOCK', 'Walk In to Sail ⛵');
    boatSign.position.set(-21, 0, 4.2);
    boatSign.rotation.set(0, 0, 0); // Faces South!
    lakeGroup.add(boatSign);

    this.scene.add(lakeGroup);

    // -------------------------------------------------------------
    // 3. QUIZ LODGE (West: -48, 1.8, 4)
    // Scaled to compact charming proportion (~20% smaller)
    // -------------------------------------------------------------
    const quizGroup = new THREE.Group();
    quizGroup.position.set(-48, 1.8, 4);

    // Lodge Main Hall
    const quizHallGeo = new THREE.BoxGeometry(14.4, 9.6, 12.8);
    const hallMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 });
    const quizHall = new THREE.Mesh(quizHallGeo, hallMat);
    quizHall.position.y = 4.8;
    quizHall.castShadow = true;
    quizGroup.add(quizHall);

    // Gabled Roof
    const quizRoofGeo = new THREE.ConeGeometry(11.8, 6.4, 4);
    const quizRoof = new THREE.Mesh(quizRoofGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    quizRoof.position.y = 12.5;
    quizRoof.rotation.y = Math.PI / 4;
    quizRoof.scale.set(1.2, 1, 1.2);
    quizRoof.castShadow = true;
    quizGroup.add(quizRoof);

    // Bell Tower
    const towerGeo = new THREE.BoxGeometry(3.2, 7.2, 3.2);
    const tower = new THREE.Mesh(towerGeo, new THREE.MeshStandardMaterial({ color: 0x991b1b }));
    tower.position.set(0, 15.0, 0);
    quizGroup.add(tower);

    // Golden Bell
    const bellGeo = new THREE.SphereGeometry(1.0, 16, 16);
    const bell = new THREE.Mesh(bellGeo, new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 }));
    bell.position.set(0, 18.0, 0);
    quizGroup.add(bell);

    // ROOF SIGN - Mounted on front roof gable, facing SOUTH!
    const quizRoofSign = this.createRoofSign('QUIZ LODGE', '60s Teen Trivia Challenge 🧠');
    quizRoofSign.position.set(0, 13.5, 6.0);
    quizRoofSign.rotation.set(0, 0, 0); // Faces South!
    quizGroup.add(quizRoofSign);

    this.scene.add(quizGroup);

    // -------------------------------------------------------------
    // 4. HENRY WORD LADDER LODGE (South-East: 38, 1.8, 38)
    // Scaled to compact charming proportion (~20% smaller)
    // -------------------------------------------------------------
    const ladderGroup = new THREE.Group();
    ladderGroup.position.set(38, 1.8, 38);

    // Alpine Mountain Chalet
    const chaletGeo = new THREE.BoxGeometry(13, 8.2, 11);
    const chaletMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.8 }); // Rich evergreen timber
    const chalet = new THREE.Mesh(chaletGeo, chaletMat);
    chalet.position.y = 4.1;
    chalet.castShadow = true;
    ladderGroup.add(chalet);

    // Steep A-frame snowy roof
    const ladderRoofGeo = new THREE.ConeGeometry(10.5, 5.8, 4);
    const ladderRoof = new THREE.Mesh(ladderRoofGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    ladderRoof.position.y = 11.0;
    ladderRoof.rotation.y = Math.PI / 4;
    ladderRoof.scale.set(1.1, 1, 1.2);
    ladderRoof.castShadow = true;
    ladderGroup.add(ladderRoof);

    // Chimney
    const ladderChimney = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5, 1.6), stoneMat);
    ladderChimney.position.set(-3.8, 10.5, -2.5);
    ladderGroup.add(ladderChimney);

    // Wooden ladder leaning against exterior wall
    const propLadder = this.createWoodenLadderProp();
    propLadder.position.set(4.5, 0, 5.8);
    propLadder.rotation.x = -0.15;
    ladderGroup.add(propLadder);

    // Windows & Door
    const lWin1 = new THREE.Mesh(winGeo, winMat);
    lWin1.position.set(-3.2, 4.1, 5.55);
    ladderGroup.add(lWin1);

    const lDoor = new THREE.Mesh(doorGeo, doorMat);
    lDoor.position.set(0, 2.0, 5.55);
    ladderGroup.add(lDoor);

    // ROOF SIGN - Mounted on front roof gable, facing SOUTH!
    const ladderRoofSign = this.createRoofSign('WORD LADDER LODGE', '4-Letter Daily Challenge 🪜');
    ladderRoofSign.position.set(0, 11.8, 5.2);
    ladderRoofSign.rotation.set(0, 0, 0); // Faces South!
    ladderGroup.add(ladderRoofSign);

    this.scene.add(ladderGroup);

    // -------------------------------------------------------------
    // 5. HENRY TARGET 24 MATH CHALET (South-West: -36, 1.8, 32)
    // -------------------------------------------------------------
    const target24Group = new THREE.Group();
    target24Group.position.set(-36, 1.8, 32);

    // Warm Alpine Math Chalet (Royal Indigo Timber)
    const t24ChaletGeo = new THREE.BoxGeometry(13, 8.2, 11);
    const t24ChaletMat = new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.8 }); // Deep Royal Indigo timber
    const t24Chalet = new THREE.Mesh(t24ChaletGeo, t24ChaletMat);
    t24Chalet.position.y = 4.1;
    t24Chalet.castShadow = true;
    target24Group.add(t24Chalet);

    // Steep A-frame snowy roof
    const t24RoofGeo = new THREE.ConeGeometry(10.5, 5.8, 4);
    const t24Roof = new THREE.Mesh(t24RoofGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    t24Roof.position.y = 11.0;
    t24Roof.rotation.y = Math.PI / 4;
    t24Roof.scale.set(1.1, 1, 1.2);
    t24Roof.castShadow = true;
    target24Group.add(t24Roof);

    // Stone Chimney
    const t24Chimney = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5, 1.6), stoneMat);
    t24Chimney.position.set(3.8, 10.5, -2.5);
    target24Group.add(t24Chimney);

    // Giant Target 24 Math Decor beside entrance (Large golden targets & dice)
    const targetSignGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.25, 24);
    const targetRingMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const targetSignMesh = new THREE.Mesh(targetSignGeo, targetRingMat);
    targetSignMesh.rotation.x = Math.PI / 2;
    targetSignMesh.position.set(-4.5, 3.5, 5.8);
    target24Group.add(targetSignMesh);

    const innerTargetMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.28, 24), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    innerTargetMesh.rotation.x = Math.PI / 2;
    innerTargetMesh.position.set(-4.5, 3.5, 5.8);
    target24Group.add(innerTargetMesh);

    // Windows with warm light
    const t24Win1 = new THREE.Mesh(winGeo, winMat);
    t24Win1.position.set(-3.2, 4.1, 5.55);
    target24Group.add(t24Win1);

    const t24Win2 = new THREE.Mesh(winGeo, winMat);
    t24Win2.position.set(3.2, 4.1, 5.55);
    target24Group.add(t24Win2);

    // Front Wooden Door
    const t24Door = new THREE.Mesh(doorGeo, doorMat);
    t24Door.position.set(0, 2.0, 5.55);
    target24Group.add(t24Door);

    // ROOF SIGN - Mounted on front roof gable, facing SOUTH!
    const target24RoofSign = this.createRoofSign('HENRY TARGET 24', 'Make 24 with 4 Numbers 🎯');
    target24RoofSign.position.set(0, 11.8, 5.2);
    target24RoofSign.rotation.set(0, 0, 0); // Faces South!
    target24Group.add(target24RoofSign);

    this.scene.add(target24Group);

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
    // Scaled to compact charming proportion (~20% smaller)
    // -------------------------------------------------------------
    const elvesGroup = new THREE.Group();
    elvesGroup.position.set(45, 1.8, -35);

    // Elf Chalet
    const elfChaletGeo = new THREE.BoxGeometry(11.2, 7.2, 9.6);
    const elfWoodMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 }); // Festive Elf Green
    const elfChalet = new THREE.Mesh(elfChaletGeo, elfWoodMat);
    elfChalet.position.y = 3.6;
    elfChalet.castShadow = true;
    elvesGroup.add(elfChalet);

    // Red Shingle Roof
    const elfRoofGeo = new THREE.ConeGeometry(8.8, 4.8, 4);
    const elfRoof = new THREE.Mesh(elfRoofGeo, new THREE.MeshStandardMaterial({ color: 0x991b1b }));
    elfRoof.position.y = 9.6;
    elfRoof.rotation.y = Math.PI / 4;
    elfRoof.scale.set(1.1, 1, 1.2);
    elvesGroup.add(elfRoof);

    // Roof Sign - Facing SOUTH!
    const elfSign = this.createRoofSign("SANTA'S ELVES WORKSHOP", 'Crafting Holiday Magic 🧝🎁');
    elfSign.position.set(0, 10.6, 4.6);
    elfSign.rotation.set(0, 0, 0); // Faces South!
    elvesGroup.add(elfSign);

    // Outdoor Toy Workbench
    const benchGeo = new THREE.BoxGeometry(6.5, 1.2, 2.6);
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.set(0, 0.6, 7.5);
    bench.castShadow = true;
    elvesGroup.add(bench);

    // Wooden Toy Train on Workbench
    const trainMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const trainEngine = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.0), trainMat);
    trainEngine.position.set(-1.4, 1.5, 7.5);
    elvesGroup.add(trainEngine);

    const trainFunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    trainFunnel.position.set(-1.9, 2.0, 7.5);
    elvesGroup.add(trainFunnel);

    const trainCar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.9), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
    trainCar.position.set(0.5, 1.45, 7.5);
    elvesGroup.add(trainCar);

    // Wrapped Presents beside workbench
    const giftMat1 = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const giftMat2 = new THREE.MeshStandardMaterial({ color: 0xec4899 });
    const g1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), giftMat1);
    g1.position.set(2.0, 1.5, 7.5);
    elvesGroup.add(g1);

    const g2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), giftMat2);
    g2.position.set(3.8, 0.6, 6.8);
    elvesGroup.add(g2);

    // Animated 3D Elves standing beside the workbench!
    const elf1 = this.create3DElf();
    elf1.group.position.set(-2.6, 0, 7.5);
    elvesGroup.add(elf1.group);
    this.animatedElves.push(elf1);

    const elf2 = this.create3DElf();
    elf2.group.position.set(2.6, 0, 7.5);
    elf2.group.rotation.y = -0.5;
    elvesGroup.add(elf2.group);
    this.animatedElves.push(elf2);

    this.scene.add(elvesGroup);

    // -------------------------------------------------------------
    // Area B: COZY HEARTH & CAMPFIRE RETREAT (-42, 1.8, -25)
    // Scaled to compact charming proportion (~20% smaller)
    // -------------------------------------------------------------
    const hearthGroup = new THREE.Group();
    hearthGroup.position.set(-42, 1.8, -25);

    // Rustic Pine Log Cabin
    const logCabinGeo = new THREE.BoxGeometry(11.2, 6.5, 9.6);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x543310, roughness: 0.9 });
    const cabin = new THREE.Mesh(logCabinGeo, cabinMat);
    cabin.position.y = 3.25;
    cabin.castShadow = true;
    hearthGroup.add(cabin);

    // Snowy Chalet Roof
    const cabinRoofGeo = new THREE.ConeGeometry(8.8, 4.8, 4);
    const cabinRoof = new THREE.Mesh(cabinRoofGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    cabinRoof.position.y = 8.9;
    cabinRoof.rotation.y = Math.PI / 4;
    cabinRoof.scale.set(1.1, 1, 1.2);
    hearthGroup.add(cabinRoof);

    // Roof Sign - Facing SOUTH!
    const hearthSign = this.createRoofSign('COZY HEARTH RETREAT', 'Campfire & Marshmallows 🔥☕');
    hearthSign.position.set(0, 9.8, 4.6);
    hearthSign.rotation.set(0, 0, 0); // Faces South!
    hearthGroup.add(hearthSign);

    // Outdoor Stone Campfire Pit
    const campfireRing = new THREE.Group();
    campfireRing.position.set(0, 0, 8.5);

    // Ring of 8 stones
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), stoneMat);
      s.position.set(Math.cos(a) * 2.0, 0.3, Math.sin(a) * 2.0);
      campfireRing.add(s);
    }

    // Crossed fire logs
    const fireLogMat = new THREE.MeshStandardMaterial({ color: 0x3f2510, roughness: 0.8 });
    const flog1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.2, 8), fireLogMat);
    flog1.rotation.z = Math.PI / 3;
    flog1.position.y = 0.45;
    campfireRing.add(flog1);

    const flog2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.2, 8), fireLogMat);
    flog2.rotation.x = Math.PI / 3;
    flog2.position.y = 0.45;
    campfireRing.add(flog2);

    // Glowing Flame Cones
    const flameMat1 = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const flameMat2 = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const flame1 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 6), flameMat1);
    flame1.position.y = 1.0;
    campfireRing.add(flame1);

    const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 6), flameMat2);
    flame2.position.y = 1.2;
    campfireRing.add(flame2);

    // Warm Flickering Campfire Light
    this.campfireLight = new THREE.PointLight(0xff7700, 2.5, 22);
    this.campfireLight.position.set(0, 1.5, 0);
    campfireRing.add(this.campfireLight);

    // Split-Log Seating Benches around campfire
    const benchLogMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const benchAngles = [-Math.PI * 0.7, Math.PI * 0.7, 0];
    benchAngles.forEach(ang => {
      const bLog = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.2, 8), benchLogMat);
      bLog.rotation.z = Math.PI / 2;
      bLog.rotation.y = ang;
      bLog.position.set(Math.sin(ang) * 3.8, 0.35, Math.cos(ang) * 3.8);
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

  private create3DLilyPad(withFlower: boolean, scale = 1.0): THREE.Group {
    const padGroup = new THREE.Group();
    padGroup.scale.set(scale, scale, scale);

    // Green lilypad disc with characteristic V-notch
    const shape = new THREE.Shape();
    const radius = 2.2;
    const notchAngle = 0.35; // radians cut-out
    shape.absarc(0, 0, radius, notchAngle, Math.PI * 2 - notchAngle, false);
    shape.lineTo(0, 0);
    shape.closePath();

    const padGeo = new THREE.ShapeGeometry(shape, 24);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // lush water lily green
      roughness: 0.6,
      side: THREE.DoubleSide
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.rotation.x = -Math.PI / 2;
    padMesh.receiveShadow = true;
    padGroup.add(padMesh);

    // Subtle edge rim
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7 });
    const rimGeo = new THREE.RingGeometry(radius * 0.88, radius, 24);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = -Math.PI / 2;
    rimMesh.position.y = 0.005;
    padGroup.add(rimMesh);

    // Optional Lotus / Waterlily Flower
    if (withFlower) {
      const flowerGroup = new THREE.Group();
      flowerGroup.position.set(0.6, 0.08, 0.5);

      // Flower petals (soft pink & white)
      const petalMat = new THREE.MeshStandardMaterial({
        color: 0xfbcfe8, // soft pink
        emissive: 0xf472b6,
        emissiveIntensity: 0.15,
        roughness: 0.4
      });
      const petalGeo = new THREE.ConeGeometry(0.35, 0.8, 5);

      for (let p = 0; p < 8; p++) {
        const pAng = (p / 8) * Math.PI * 2;
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.position.set(Math.cos(pAng) * 0.35, 0.25, Math.sin(pAng) * 0.35);
        petal.rotation.x = Math.sin(pAng) * 0.45;
        petal.rotation.z = -Math.cos(pAng) * 0.45;
        flowerGroup.add(petal);
      }

      // Golden center stamen
      const centerMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), centerMat);
      center.position.y = 0.3;
      flowerGroup.add(center);

      padGroup.add(flowerGroup);
    }

    return padGroup;
  }

  /**
   * Town Center: Elevated stone dais and Podium placed at z = -14.
   * Bulletin Board moved to (-14, 0, 10), completely clear of both the podium and Henry Lake!
   */
  private buildPodiumAndBoard(): void {
    const centerGroup = new THREE.Group();
    centerGroup.position.set(0, 1.8, 0);

    // Elevated 2-tier circular stone dais so pedestals and signs are completely above snow
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const daisTier1 = new THREE.Mesh(new THREE.CylinderGeometry(13, 13.5, 0.45, 32), stoneMat);
    daisTier1.position.set(0, 0.225, -14);
    daisTier1.receiveShadow = true;
    centerGroup.add(daisTier1);

    const daisTier2 = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 12, 0.40, 32), stoneMat);
    daisTier2.position.set(0, 0.65, -14);
    daisTier2.receiveShadow = true;
    centerGroup.add(daisTier2);

    const daisTopY = 0.85;

    // Podium Pedestals placed on dais at z = -14
    const podiumPillars = [
      { rank: 2, x: -7, h: 2.4, color: 0x94a3b8 }, // 2nd Silver
      { rank: 1, x: 0, h: 3.6, color: 0xf59e0b },  // 1st Gold
      { rank: 3, x: 7, h: 1.8, color: 0xb45309 }   // 3rd Bronze
    ];

    podiumPillars.forEach(p => {
      const pGeo = new THREE.CylinderGeometry(3.2, 3.5, p.h, 24);
      const pMat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.5, metalness: 0.2 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(p.x, daisTopY + p.h / 2, -14);
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      centerGroup.add(pMesh);
    });

    // -------------------------------------------------------------
    // HOLIDAY BULLETIN BOARD - Moved to South-West (-14, 0, 10), facing SOUTH!
    // Leaves all sightlines to Henry Lake (East) and the Podium (North) completely open.
    // -------------------------------------------------------------
    const boardGroup = new THREE.Group();
    boardGroup.position.set(-14, 0, 10);

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
    const daisTopY = 0.85;
    const slots = [
      { rank: 2, x: -7, h: 2.4, color: '#94a3b8', medal: '🥈', title: '2ND PLACE' },
      { rank: 1, x: 0, h: 3.6, color: '#f59e0b', medal: '🥇', title: '1ST PLACE' },
      { rank: 3, x: 7, h: 1.8, color: '#b45309', medal: '🥉', title: '3RD PLACE' }
    ];

    slots.forEach(slot => {
      const entry = leaderboard.find(l => l.rank === slot.rank);

      // 1. Dynamic Snowman on top of the pedestal at z = -14
      if (entry) {
        const scoreScale = THREE.MathUtils.clamp(0.8 + (entry.stats.averageScore / 10) * 0.4, 0.7, 1.4);
        const smGroup = this.create3DSnowman(scoreScale, entry.rank === 1);
        smGroup.position.set(slot.x, 1.8 + daisTopY + slot.h, -14);
        this.scene.add(smGroup);
        this.podiumSnowmenGroups.push(smGroup);
      }

      // 2. High-res Plaque with Leader Name and Score written on base facing SOUTH!
      const plaque = this.createPodiumPlaque(slot, entry);
      plaque.position.set(slot.x, 1.8 + daisTopY + slot.h * 0.45, -14 + 3.65);
      plaque.rotation.set(-0.08, 0, 0); // Faces South & tilted slightly upward towards the camera!
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
      ctx.fillText(`${slot.medal} ${slot.title}`, 256, 52);

      if (entry) {
        const av = AVATAR_ROSTER.find(a => a.id === entry.player.avatarId) || AVATAR_ROSTER[0];
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 40px sans-serif';
        const displayName = `${av.emoji} ${entry.player.name}`;
        ctx.fillText(displayName, 256, 116);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(`Avg: ${entry.stats.averageScore.toFixed(1)} pts`, 256, 170);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '22px sans-serif';
        ctx.fillText(`Today: ${entry.stats.todayScore} pts • ${entry.stats.daysPlayed} days`, 256, 216);
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
    const frameGeo = new THREE.BoxGeometry(4.8, 2.3, 0.14);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    group.add(frame);

    // Front Plaque Face Plate
    const faceGeo = new THREE.PlaneGeometry(4.6, 2.1);
    const face = new THREE.Mesh(faceGeo, plaqueMat);
    face.position.set(0, 0, 0.08);
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
    const today = getTodayDateKey();
    const items = getDailyScavengerItems(today);
    items.forEach(item => {
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

  private createChild(coatColor: number, hatColor: number, scarfColor: number): {
    group: THREE.Group;
    baseY: number;
    armL?: THREE.Mesh;
    armR?: THREE.Mesh;
    phase: number;
  } {
    const group = new THREE.Group();
    const phase = Math.random() * Math.PI * 2;

    // Body (Warm Winter Coat)
    const coatMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 1.2, 10), coatMat);
    body.position.y = 0.95;
    body.castShadow = true;
    group.add(body);

    // Warm Winter Boots & Legs
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.3), bootMat);
    legL.position.set(-0.2, 0.25, 0);
    group.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.3), bootMat);
    legR.position.set(0.2, 0.25, 0);
    group.add(legR);

    // Cozy Scarf around neck
    const scarfMat = new THREE.MeshStandardMaterial({ color: scarfColor, roughness: 0.7 });
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.12, 8, 16), scarfMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.55;
    group.add(scarf);

    // Child Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.5 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), headMat);
    head.position.y = 1.85;
    group.add(head);

    // Rosy smiling cheeks
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
    const bL = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), blushMat);
    bL.position.set(-0.16, 1.82, 0.37);
    group.add(bL);
    const bR = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), blushMat);
    bR.position.set(0.16, 1.82, 0.37);
    group.add(bR);

    // Winter Bobble Hat
    const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.6 });
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 10), hatMat);
    hat.position.set(0, 2.35, 0);
    group.add(hat);

    // Fluffy Pompom on hat
    const pomMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const pom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), pomMat);
    pom.position.set(0, 2.85, 0);
    group.add(pom);

    // Arms with mittens
    const armGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.7, 8);
    const armL = new THREE.Mesh(armGeo, coatMat);
    armL.position.set(-0.5, 1.25, 0.1);
    armL.rotation.z = 0.3;
    group.add(armL);

    const armR = new THREE.Mesh(armGeo, coatMat);
    armR.position.set(0.5, 1.25, 0.1);
    armR.rotation.z = -0.3;
    group.add(armR);

    return { group, baseY: 0, armL, armR, phase };
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

    // Belt & Gold Buckle
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const sBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 1.02, 0.3, 12), beltMat);
    sBelt.position.y = 0.85;
    santaModel.add(sBelt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.1), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8 }));
    buckle.position.set(0, 0.85, 1.0);
    santaModel.add(buckle);

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

    // Left Arm resting on sleigh side
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.1, 8), redMat);
    armL.position.set(-1.1, 1.3, 0.2);
    armL.rotation.z = Math.PI / 4;
    santaModel.add(armL);

    // Waving Right Arm (Animated!)
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.1, 8), redMat);
    armR.position.set(1.1, 1.5, 0.2);
    armR.rotation.z = -Math.PI / 3;
    santaModel.add(armR);
    this.santaArm = armR;
    this.santaTorso = santaModel;

    // Golden Jingle bell in Santa's waving hand
    const bellMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9 }));
    bellMesh.position.set(0, 0.6, 0);
    armR.add(bellMesh);

    santaGroup.add(santaModel);

    // Pile of Wrapped Holiday Presents in the Sleigh
    const presentConfigs = [
      { x: -1.4, y: 2.2, z: -1.0, sx: 1.3, sy: 1.1, sz: 1.2, color: 0xf59e0b, ribColor: 0xef4444 },
      { x: 1.3, y: 2.3, z: -1.1, sx: 1.4, sy: 1.3, sz: 1.3, color: 0x10b981, ribColor: 0xfacc15 },
      { x: -0.1, y: 2.8, z: -1.4, sx: 1.2, sy: 1.0, sz: 1.1, color: 0x3b82f6, ribColor: 0xf1f5f9 },
      { x: -1.2, y: 3.2, z: -1.0, sx: 0.9, sy: 0.9, sz: 0.9, color: 0x8b5cf6, ribColor: 0xfacc15 },
      { x: 1.1, y: 3.3, z: -1.1, sx: 0.85, sy: 0.85, sz: 0.85, color: 0xec4899, ribColor: 0xffffff },
      { x: 0.0, y: 2.2, z: 0.5, sx: 1.1, sy: 0.8, sz: 0.9, color: 0x06b6d4, ribColor: 0xf59e0b },
      { x: -2.0, y: 2.1, z: 0.2, sx: 0.8, sy: 0.8, sz: 0.8, color: 0xd97706, ribColor: 0x15803d }
    ];

    presentConfigs.forEach(p => {
      const pBox = new THREE.Mesh(
        new THREE.BoxGeometry(p.sx, p.sy, p.sz),
        new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.5 })
      );
      pBox.position.set(p.x, p.y, p.z);
      pBox.castShadow = true;
      santaGroup.add(pBox);

      // Cross Ribbons
      const ribH = new THREE.Mesh(
        new THREE.BoxGeometry(p.sx + 0.04, p.sy * 0.15, p.sz + 0.04),
        new THREE.MeshStandardMaterial({ color: p.ribColor, metalness: 0.4 })
      );
      ribH.position.set(p.x, p.y, p.z);
      santaGroup.add(ribH);

      const ribV = new THREE.Mesh(
        new THREE.BoxGeometry(p.sx * 0.15, p.sy + 0.04, p.sz + 0.04),
        new THREE.MeshStandardMaterial({ color: p.ribColor, metalness: 0.4 })
      );
      ribV.position.set(p.x, p.y, p.z);
      santaGroup.add(ribV);
    });

    // 2 Festive Reindeer ahead of the sleigh (Rudolph and Donner)
    const deer1 = this.createReindeer();
    deer1.position.set(-2.5, 0, 7.5);
    santaGroup.add(deer1);

    const deer2 = this.createReindeer();
    deer2.position.set(2.5, 0, 7.5);
    santaGroup.add(deer2);

    // 3 Children Gathered Around Santa & Rudolph
    // Child 1 (Emma): Yellow coat, blue hat, petting Rudolph's nose
    const child1 = this.createChild(0xfacc15, 0x0284c7, 0xef4444);
    child1.group.position.set(-3.8, 0, 7.8);
    child1.group.rotation.y = 0.5;
    if (child1.armR) {
      child1.armR.rotation.x = -Math.PI / 3;
      child1.armR.rotation.z = -0.4;
    }
    santaGroup.add(child1.group);
    this.animatedChildren.push(child1);

    // Child 2 (Leo): Teal coat, cherry red hat, waving up at Santa
    const child2 = this.createChild(0x0d9488, 0xe11d48, 0xfacc15);
    child2.group.position.set(3.4, 0, 0.6);
    child2.group.rotation.y = -Math.PI / 2.5;
    if (child2.armL && child2.armR) {
      child2.armL.rotation.x = -Math.PI / 2.5;
      child2.armR.rotation.x = -Math.PI / 2.2;
    }
    santaGroup.add(child2.group);
    this.animatedChildren.push(child2);

    // Child 3 (Mia): Warm orange coat, violet hat, jumping by the presents
    const child3 = this.createChild(0xf97316, 0x7c3aed, 0x3b82f6);
    child3.group.position.set(-3.2, 0, -0.6);
    child3.group.rotation.y = Math.PI / 3;
    santaGroup.add(child3.group);
    this.animatedChildren.push(child3);

    // Floating 3D Speech Bubble above Santa
    const bubbleGroup = new THREE.Group();
    bubbleGroup.position.set(0, 7.6, -0.6);

    const bubbleCanvas = document.createElement('canvas');
    bubbleCanvas.width = 512;
    bubbleCanvas.height = 256;
    const bctx = bubbleCanvas.getContext('2d');
    if (bctx) {
      // Rounded bubble background
      bctx.fillStyle = '#ffffff';
      bctx.beginPath();
      bctx.roundRect(16, 16, 480, 180, 28);
      bctx.fill();

      // Border
      bctx.lineWidth = 10;
      bctx.strokeStyle = '#dc2626';
      bctx.stroke();

      // Pointer tail
      bctx.fillStyle = '#ffffff';
      bctx.beginPath();
      bctx.moveTo(230, 196);
      bctx.lineTo(256, 246);
      bctx.lineTo(282, 196);
      bctx.closePath();
      bctx.fill();

      bctx.strokeStyle = '#dc2626';
      bctx.lineWidth = 8;
      bctx.beginPath();
      bctx.moveTo(230, 196);
      bctx.lineTo(256, 246);
      bctx.lineTo(282, 196);
      bctx.stroke();

      // Text
      bctx.textAlign = 'center';
      bctx.textBaseline = 'middle';
      bctx.font = '900 46px system-ui, -apple-system, sans-serif';
      bctx.fillStyle = '#b91c1c';
      bctx.fillText('🎅 "HO, HO, HO!"', 256, 78);

      bctx.font = '700 28px system-ui, -apple-system, sans-serif';
      bctx.fillStyle = '#0f172a';
      bctx.fillText('Merry Christmas, Henry Family! 🎄', 256, 136);
    }

    const bubbleTex = new THREE.CanvasTexture(bubbleCanvas);
    const bubbleMat = new THREE.MeshBasicMaterial({ map: bubbleTex, transparent: true, side: THREE.DoubleSide });
    const bubbleMesh = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), bubbleMat);
    bubbleGroup.add(bubbleMesh);
    bubbleGroup.scale.set(0, 0, 0); // initially hidden

    santaGroup.add(bubbleGroup);
    this.santaSpeechBubble = bubbleGroup;

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
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Crisp snow-white base
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 512);

      // Bold, thick holiday crimson stripes spaced further apart
      ctx.fillStyle = '#dc2626';
      const stripeWidth = 68;
      const stripeStep = 170;
      for (let y = -512; y < 1024; y += stripeStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y + 256);
        ctx.lineTo(256, y + 256 + stripeWidth);
        ctx.lineTo(0, y + stripeWidth);
        ctx.closePath();
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1.8);
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

    const tubeGeo = new THREE.TubeGeometry(path, 32, 0.48, 12, false);
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
   * Scaled up to be extra prominent, crisp, and 100% visible from camera facing SOUTH!
   */
  private createRoofSign(title: string, subtitle: string): THREE.Group {
    const sign = new THREE.Group();

    // Dual Roof Mounting Struts
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const strutGeo = new THREE.BoxGeometry(0.35, 2.2, 0.35);
    const sL = new THREE.Mesh(strutGeo, strutMat);
    sL.position.set(-3.2, -0.7, 0);
    sign.add(sL);
    const sR = new THREE.Mesh(strutGeo, strutMat);
    sR.position.set(3.2, -0.7, 0);
    sign.add(sR);

    // Main Wooden Backing (Enlarged)
    const boardGeo = new THREE.BoxGeometry(8.4, 3.4, 0.35);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x543310, roughness: 0.8 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.castShadow = true;
    sign.add(board);

    // Snowy Gabled Roof Ridge Trim
    const snowCapGeo = new THREE.BoxGeometry(8.8, 0.5, 0.65);
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
    const snowCap = new THREE.Mesh(snowCapGeo, snowMat);
    snowCap.position.y = 1.75;
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

      // Title - Large bold high-contrast font
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 8;
      ctx.fillText(title, 256, 94);

      // Subtitle
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 28px sans-serif';
      ctx.shadowBlur = 6;
      ctx.fillText(subtitle, 256, 172);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.MeshBasicMaterial({ map: texture });
    const textPlate = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 3.2), textMat);
    textPlate.position.set(0, 0, 0.2);
    sign.add(textPlate);

    return sign;
  }

  /**
   * Ground Signpost, dual-sided, facing SOUTH (+Z), enlarged and prominent.
   */
  private createSignpost(title: string, subtitle: string): THREE.Group {
    const sign = new THREE.Group();

    // Dual Side Posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0x543310, roughness: 0.85 });
    const postGeo = new THREE.CylinderGeometry(0.28, 0.32, 5.2, 12);

    const postL = new THREE.Mesh(postGeo, postMat);
    postL.position.set(-3.2, 2.6, -0.14);
    sign.add(postL);

    const postR = new THREE.Mesh(postGeo, postMat);
    postR.position.set(3.2, 2.6, -0.14);
    sign.add(postR);

    // Main Wooden Signboard Backing (Enlarged)
    const boardGeo = new THREE.BoxGeometry(6.6, 2.8, 0.28);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.set(0, 3.8, 0);
    sign.add(board);

    // Snowy Gabled Roof Trim on top
    const roofGeo = new THREE.BoxGeometry(7.0, 0.42, 0.6);
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
    const roof = new THREE.Mesh(roofGeo, snowMat);
    roof.position.set(0, 5.25, 0);
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
      ctx.font = '900 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.fillText(title, 256, 92);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 26px sans-serif';
      ctx.shadowBlur = 4;
      ctx.fillText(subtitle, 256, 168);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.MeshBasicMaterial({ map: texture });

    // Front text plate
    const textPlateFront = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 2.6), textMat);
    textPlateFront.position.set(0, 3.8, 0.16);
    sign.add(textPlateFront);

    return sign;
  }

  /**
   * Builds completely unburied, cute 3D Penguins that freely wander across town paths!
   */
  private buildPenguins(): void {
    const startPositions = [
      new THREE.Vector3(-14, 1.8, -8),
      new THREE.Vector3(12, 1.8, -6),
      new THREE.Vector3(-10, 1.8, 12),
      new THREE.Vector3(10, 1.8, 14),
      new THREE.Vector3(-18, 1.8, 4),
      new THREE.Vector3(16, 1.8, 6)
    ];

    const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 });
    const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    startPositions.forEach((pos, idx) => {
      const pGroup = new THREE.Group();
      pGroup.position.copy(pos);

      // Body (Plump Egg sitting fully atop the snow/cobblestone at y = 1.0)
      const bodyGeo = new THREE.SphereGeometry(0.75, 14, 14);
      const body = new THREE.Mesh(bodyGeo, blackMat);
      body.scale.set(0.9, 1.3, 0.85);
      body.position.y = 1.0;
      body.castShadow = true;
      pGroup.add(body);

      // White Belly
      const bellyGeo = new THREE.SphereGeometry(0.62, 12, 12);
      const belly = new THREE.Mesh(bellyGeo, whiteMat);
      belly.scale.set(0.75, 1.1, 0.75);
      belly.position.set(0, 0.95, 0.35);
      pGroup.add(belly);

      // Beak
      const beakGeo = new THREE.ConeGeometry(0.18, 0.4, 8);
      const beak = new THREE.Mesh(beakGeo, orangeMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 1.45, 0.8);
      pGroup.add(beak);

      // Big Villager Eyes & Sparkles
      const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.22, 1.55, 0.65);
      pGroup.add(eyeL);

      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(0.22, 1.55, 0.65);
      pGroup.add(eyeR);

      const sparkleGeo = new THREE.SphereGeometry(0.035, 6, 6);
      const spL = new THREE.Mesh(sparkleGeo, sparkleMat);
      spL.position.set(-0.20, 1.58, 0.72);
      pGroup.add(spL);

      const spR = new THREE.Mesh(sparkleGeo, sparkleMat);
      spR.position.set(0.24, 1.58, 0.72);
      pGroup.add(spR);

      // Flippers
      const flipperGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.9, 6);
      const flipperL = new THREE.Mesh(flipperGeo, blackMat);
      flipperL.position.set(-0.75, 1.0, 0);
      flipperL.rotation.z = 0.4;
      pGroup.add(flipperL);

      const flipperR = new THREE.Mesh(flipperGeo, blackMat);
      flipperR.position.set(0.75, 1.0, 0);
      flipperR.rotation.z = -0.4;
      pGroup.add(flipperR);

      // Orange Webbed Feet - Perfectly perched at y = 0.06 on top of snow!
      const footGeo = new THREE.BoxGeometry(0.32, 0.12, 0.45);
      const footL = new THREE.Mesh(footGeo, orangeMat);
      footL.position.set(-0.35, 0.06, 0.15);
      pGroup.add(footL);

      const footR = new THREE.Mesh(footGeo, orangeMat);
      footR.position.set(0.35, 0.06, 0.15);
      pGroup.add(footR);

      this.scene.add(pGroup);

      const randomTarget = new THREE.Vector3(
        (Math.random() - 0.5) * 32,
        1.8,
        (Math.random() - 0.5) * 30
      );

      this.animatedPenguins.push({
        group: pGroup,
        currentPos: pos.clone(),
        targetPos: randomTarget,
        speed: 1.4 + (idx % 3) * 0.35,
        waddlePhase: Math.random() * Math.PI * 2,
        pauseTimer: Math.random() * 2.0,
        isPausing: false,
        footL,
        footR,
        flipperL,
        flipperR
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

  /**
   * Calculates the organic multi-lobed island coastline radius at any polar angle.
   */
  private getIslandRadius(angle: number): number {
    let theta = angle;
    while (theta < 0) theta += Math.PI * 2;
    while (theta >= Math.PI * 2) theta -= Math.PI * 2;

    let r = 84;
    r += Math.cos(2 * theta) * 12;
    r -= Math.sin(3 * theta) * 8;
    r += Math.cos(5 * theta + 0.4) * 6;
    r += Math.sin(theta - 0.8) * 10;

    // Regional lobe extensions:
    if (theta > 4.2 && theta < 5.2) r += 9; // North ridge for Wordle
    if (theta > 5.1 && theta < 6.0) r += 11; // North-East peninsula for Elves
    if (theta > 6.0 || theta < 0.5) r += 7; // East cove for Henry Lake
    if (theta > 0.5 && theta < 1.3) r += 12; // South-East mountain for Word Ladder
    if (theta > 1.3 && theta < 1.9) r += 7; // South beach dock for Santa
    if (theta > 1.9 && theta < 2.8) r += 9; // South-West meadow for Cozy Hearth
    if (theta > 2.8 && theta < 3.8) r += 7; // West bluff for Quiz Lodge

    return r;
  }

  /**
   * Builds 3D festive sailboat for water navigation on Henry Lake and the open ocean.
   */
  private buildSailboat(): void {
    this.sailboatGroup = new THREE.Group();
    this.sailboatGroup.position.set(0, 1.7, 0);
    this.sailboatGroup.visible = false;

    // 1. Rich Teak Wood Hull
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x92400e,
      roughness: 0.65,
      metalness: 0.1
    });

    // Hull Midsection & Transom
    const hullBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 3.4), hullMat);
    hullBase.position.set(0, 0.48, -0.2);
    hullBase.castShadow = true;
    hullBase.receiveShadow = true;
    this.sailboatGroup.add(hullBase);

    // Pointed Bow Wedge (Facing +Z)
    const bowShape = new THREE.Shape();
    bowShape.moveTo(-1.2, 0);
    bowShape.lineTo(1.2, 0);
    bowShape.lineTo(0, 1.6);
    bowShape.closePath();
    const bowGeo = new THREE.ExtrudeGeometry(bowShape, { depth: 0.95, bevelEnabled: false });
    const bowMesh = new THREE.Mesh(bowGeo, hullMat);
    bowMesh.rotation.x = -Math.PI / 2;
    bowMesh.position.set(0, 0.01, 1.5);
    bowMesh.castShadow = true;
    this.sailboatGroup.add(bowMesh);

    // Festive Red Waterline Stripes
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 3.4), stripeMat);
    stripeL.position.set(-1.22, 0.55, -0.2);
    this.sailboatGroup.add(stripeL);
    const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 3.4), stripeMat);
    stripeR.position.set(1.22, 0.55, -0.2);
    this.sailboatGroup.add(stripeR);

    // Wooden Deck
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 3.2), deckMat);
    deck.position.set(0, 0.96, -0.2);
    this.sailboatGroup.add(deck);

    // Cockpit Bench Recess (at stern, -Z)
    const cockpitMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.28, 1.3), cockpitMat);
    cockpit.position.set(0, 1.05, -1.0);
    this.sailboatGroup.add(cockpit);

    // Wooden Tiller / Rudder Post
    const tillerMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
    const rudderPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), tillerMat);
    rudderPost.position.set(0, 1.25, -1.8);
    this.sailboatGroup.add(rudderPost);

    const tillerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 8), tillerMat);
    tillerHandle.rotation.x = Math.PI / 2;
    tillerHandle.position.set(0, 1.45, -1.4);
    this.sailboatGroup.add(tillerHandle);

    // Mast (Tall vertical spruce spar)
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 6.2, 12), mastMat);
    mast.position.set(0, 4.0, 0.6);
    mast.castShadow = true;
    this.sailboatGroup.add(mast);

    // Boom (Horizontal spar extending back toward stern)
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 8), mastMat);
    boom.rotation.x = Math.PI / 2;
    boom.position.set(0, 1.95, -0.75);
    this.sailboatGroup.add(boom);

    // Bowsprit (Pole extending forward past bow)
    const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8), mastMat);
    bowsprit.rotation.x = Math.PI / 2.3;
    bowsprit.position.set(0, 1.05, 3.5);
    this.sailboatGroup.add(bowsprit);

    // Canvas Sails Material
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.5,
      side: THREE.DoubleSide
    });

    // Festive Triangular Main Sail
    const sailGeo = new THREE.BufferGeometry();
    const sailVertices = new Float32Array([
      0, 2.0, 0.6,
      0, 2.0, -2.0,
      0, 6.8, 0.6,

      0, 6.8, 0.6,
      0, 2.0, -2.0,
      0, 2.0, 0.6
    ]);
    sailGeo.setAttribute('position', new THREE.BufferAttribute(sailVertices, 3));
    sailGeo.computeVertexNormals();
    const mainSail = new THREE.Mesh(sailGeo, sailMat);
    this.sailboatGroup.add(mainSail);

    // Red Festive Chevron Stripe across Main Sail
    const stripeGeo = new THREE.BufferGeometry();
    const stripeVertices = new Float32Array([
      0, 3.6, 0.6,
      0, 3.6, -1.0,
      0, 4.2, 0.6,

      0, 4.2, 0.6,
      0, 3.6, -1.0,
      0, 4.2, -0.8
    ]);
    stripeGeo.setAttribute('position', new THREE.BufferAttribute(stripeVertices, 3));
    stripeGeo.computeVertexNormals();
    const sailStripe = new THREE.Mesh(stripeGeo, new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      side: THREE.DoubleSide
    }));
    this.sailboatGroup.add(sailStripe);

    // Jib / Fore Sail (Triangular front sail)
    const jibGeo = new THREE.BufferGeometry();
    const jibVertices = new Float32Array([
      0, 1.15, 3.0,
      0, 1.6, 0.8,
      0, 5.5, 0.6,

      0, 5.5, 0.6,
      0, 1.6, 0.8,
      0, 1.15, 3.0
    ]);
    jibGeo.setAttribute('position', new THREE.BufferAttribute(jibVertices, 3));
    jibGeo.computeVertexNormals();
    const jibSail = new THREE.Mesh(jibGeo, sailMat);
    this.sailboatGroup.add(jibSail);

    // Masthead Golden Cap
    const capGeo = new THREE.SphereGeometry(0.16, 10, 10);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
    const mastCap = new THREE.Mesh(capGeo, capMat);
    mastCap.position.set(0, 7.1, 0.6);
    this.sailboatGroup.add(mastCap);

    // Fluttering Pennant Flag on Mast Top
    const flagGeo = new THREE.BufferGeometry();
    const flagVertices = new Float32Array([
      0, 7.1, 0.6,
      0, 6.7, 0.6,
      0, 6.9, -0.6,

      0, 6.9, -0.6,
      0, 6.7, 0.6,
      0, 7.1, 0.6
    ]);
    flagGeo.setAttribute('position', new THREE.BufferAttribute(flagVertices, 3));
    flagGeo.computeVertexNormals();
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    this.boatPennant = new THREE.Mesh(flagGeo, flagMat);
    this.sailboatGroup.add(this.boatPennant);

    // Lifebuoy ring on boat side
    const buoyGeo = new THREE.TorusGeometry(0.28, 0.08, 8, 16);
    const buoyMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    const buoy = new THREE.Mesh(buoyGeo, buoyMat);
    buoy.position.set(1.25, 0.82, -0.5);
    buoy.rotation.y = Math.PI / 2;
    this.sailboatGroup.add(buoy);

    // Active Captain seated at helm
    const captainGroup = new THREE.Group();
    captainGroup.position.set(0, 1.25, -0.85);

    // Captain body
    const capBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.48, 0.95, 10),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 })
    );
    capBody.position.y = 0.48;
    captainGroup.add(capBody);

    // Captain head
    const capHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.5 })
    );
    capHead.position.y = 1.2;
    captainGroup.add(capHead);

    // Captain Beanie Hat
    const capHat = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.55, 12),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 })
    );
    capHat.position.set(0, 1.55, -0.05);
    captainGroup.add(capHat);

    // Pom pom
    const pom = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    pom.position.set(0, 1.85, -0.05);
    captainGroup.add(pom);

    this.sailboatGroup.add(captainGroup);

    this.scene.add(this.sailboatGroup);
  }

  /**
   * Sets player mode: 'avatar' | 'sailboat_lake' | 'sailboat_ocean'
   */
  private setPlayerMode(mode: 'avatar' | 'sailboat_lake' | 'sailboat_ocean'): void {
    if (this.playerMode === mode) return;
    this.playerMode = mode;

    if (mode === 'avatar') {
      this.playerGroup.visible = true;
      this.sailboatGroup.visible = false;
      this.playerPos.y = 1.8;
      this.playerGroup.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      playSound('waterSplash');
    } else {
      this.playerGroup.visible = false;
      this.sailboatGroup.visible = true;
      if (mode === 'sailboat_lake') {
        this.playerPos.y = 1.70;
        this.showCollectToast('⛵ Boarded Sailboat on Henry Lake! Return to the dock sign to step back onto land.');
      } else {
        this.playerPos.y = -0.40;
        this.showCollectToast('⛵ Set Sail on the Open Ocean! You can re-enter the island at any point along the coast.');
      }
      this.sailboatGroup.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      this.sailboatGroup.rotation.y = this.playerTargetRotation;
      playSound('waterSplash');
    }
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
        pos: new THREE.Vector3(25, 1.8, 1),
        radius: 6.5,
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
        pos: new THREE.Vector3(-14, 1.8, 10),
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
      },
      {
        id: 'target24',
        pos: new THREE.Vector3(-36, 1.8, 32),
        radius: 8,
        title: '🎯 Henry Target 24',
        actionText: 'Tap or Press Space to Play Target 24'
      },
      {
        id: 'santa',
        pos: new THREE.Vector3(0, 1.8, 38),
        radius: 9,
        title: "🎅 Santa's Sleigh & Reindeer",
        actionText: 'Greet Santa & Rudolph'
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

  public teleportTo(id: GameType | 'podium' | 'board' | 'elves' | 'hearth' | 'santa'): void {
    const portal = this.interactivePortals.find(p => p.id === id);
    if (portal) {
      this.setPlayerMode('avatar');
      this.playerPos.copy(portal.pos);
      this.playerPos.y = 1.8;
      this.playerGroup.position.copy(this.playerPos);
      playSound('snowStep');
      this.checkProximity();
    }
  }

  public triggerSantaSpeech(): void {
    this.santaSpeechVisible = true;
    this.santaSpeechTimer = 5.0;
    if (this.santaSpeechBubble) {
      this.santaSpeechBubble.scale.set(1, 1, 1);
    }
  }

  private triggerInteraction(id: string): void {
    if (this.isModalOpen()) return;
    playSound('buttonClick');
    if (id === 'wordle' || id === 'lake' || id === 'quiz' || id === 'wordLadder' || id === 'target24') {
      this.callbacks.onTriggerGame(id as GameType);
    } else if (id === 'podium') {
      this.callbacks.onOpenPodium();
    } else if (id === 'board') {
      this.callbacks.onOpenMessageBoard();
    } else if (id === 'santa') {
      this.triggerSantaSpeech();
      this.showCollectToast("🎅 Santa: 'HO, HO, HO! Merry Christmas, Henry Family!'");
      soundAudio.playJingle();
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
      const moveSpeed = this.playerMode === 'avatar' ? 16.0 : 19.0;
      const normX = dx / Math.max(1, len);
      const normZ = dz / Math.max(1, len);

      this.playerPos.x += normX * moveSpeed * delta;
      this.playerPos.z += normZ * moveSpeed * delta;
      this.playerTargetRotation = Math.atan2(normX, normZ);

      // 1. HUMAN AVATAR MODE
      if (this.playerMode === 'avatar') {
        // A. Henry Lake Entry: Walking off the dock slipway near the Henry Lake sign
        const distToLake = Math.hypot(this.playerPos.x - 48, this.playerPos.z - 4);
        const isNearLakeDockSlip = this.playerPos.x >= 28.0 && Math.abs(this.playerPos.z - 4) <= 4.5;

        if (isNearLakeDockSlip && distToLake < 20.5) {
          // Board Sailboat on Henry Lake!
          this.setPlayerMode('sailboat_lake');
          this.playerPos.x = 29.5;
        } else if (distToLake < 19.8) {
          // Block walking into lake anywhere else
          const angle = Math.atan2(this.playerPos.z - 4, this.playerPos.x - 48);
          this.playerPos.x = 48 + Math.cos(angle) * 19.8;
          this.playerPos.z = 4 + Math.sin(angle) * 19.8;
        }

        // B. Ocean Entry: Walking past the island beach coastline into the open sea
        const angleFromCenter = Math.atan2(this.playerPos.z, this.playerPos.x);
        const coastRadius = this.getIslandRadius(angleFromCenter);
        const distFromCenter = Math.hypot(this.playerPos.x, this.playerPos.z);
        if (distFromCenter > coastRadius + 1.8) {
          // Board Sailboat on the Open Ocean!
          this.setPlayerMode('sailboat_ocean');
        }

        // Limb walk cycle
        this.walkCycle += delta * 14;
        const legAngle = Math.sin(this.walkCycle) * 0.65;
        this.playerLegL.rotation.x = legAngle;
        this.playerLegR.rotation.x = -legAngle;
        this.playerArmL.rotation.x = -legAngle * 0.8;
        this.playerArmR.rotation.x = legAngle * 0.8;

        if (Math.sin(this.walkCycle) > 0.95 && Math.random() < 0.25) {
          playSound('snowStep');
        }
      }
      // 2. SAILBOAT ON HENRY LAKE MODE
      else if (this.playerMode === 'sailboat_lake') {
        // Exit only at the dock entrance where the player entered
        const isAtLakeDockSlip = this.playerPos.x <= 28.2 && Math.abs(this.playerPos.z - 4) <= 4.5;
        if (isAtLakeDockSlip) {
          // Disembark back onto the dock as human avatar
          this.setPlayerMode('avatar');
          this.playerPos.x = 27.0;
          this.playerPos.y = 1.8;
          this.showCollectToast('🚶 Stepped back onto the Henry Lake dock!');
        } else {
          // Constrain movement: Navigate around Henry Lake ONLY!
          const distToLake = Math.hypot(this.playerPos.x - 48, this.playerPos.z - 4);
          if (distToLake >= 19.5) {
            const angle = Math.atan2(this.playerPos.z - 4, this.playerPos.x - 48);
            this.playerPos.x = 48 + Math.cos(angle) * 19.5;
            this.playerPos.z = 4 + Math.sin(angle) * 19.5;
          }
        }

        // Water sounds while sailing
        this.boatWakeTimer += delta;
        if (this.boatWakeTimer > 0.8 && Math.random() < 0.3) {
          playSound('waterSplash');
          this.boatWakeTimer = 0;
        }
      }
      // 3. SAILBOAT ON OPEN OCEAN MODE
      else if (this.playerMode === 'sailboat_ocean') {
        // Outer ocean limit
        const distFromCenter = Math.hypot(this.playerPos.x, this.playerPos.z);
        if (distFromCenter > 240) {
          this.playerPos.x = (this.playerPos.x / distFromCenter) * 240;
          this.playerPos.z = (this.playerPos.z / distFromCenter) * 240;
        }

        // Re-enter island at ANY point along the coastline!
        const angleFromCenter = Math.atan2(this.playerPos.z, this.playerPos.x);
        const coastRadius = this.getIslandRadius(angleFromCenter);
        if (distFromCenter <= coastRadius + 0.8) {
          // Stepped ashore -> turn back into avatar!
          this.setPlayerMode('avatar');
          this.playerPos.y = 1.8;
          this.showCollectToast('🚶 Stepped ashore onto Henry Island!');
        }

        // Water sounds while sailing
        this.boatWakeTimer += delta;
        if (this.boatWakeTimer > 0.8 && Math.random() < 0.3) {
          playSound('waterSplash');
          this.boatWakeTimer = 0;
        }
      }

      // Update positions and rotations
      if (this.playerMode === 'avatar') {
        this.playerGroup.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
        this.playerGroup.rotation.y = THREE.MathUtils.lerp(
          this.playerGroup.rotation.y,
          this.playerTargetRotation,
          0.18
        );
      } else {
        this.sailboatGroup.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
        this.sailboatGroup.rotation.y = THREE.MathUtils.lerp(
          this.sailboatGroup.rotation.y,
          this.playerTargetRotation,
          0.14
        );
      }
    } else {
      if (this.playerMode === 'avatar') {
        this.playerLegL.rotation.x = THREE.MathUtils.lerp(this.playerLegL.rotation.x, 0, 0.2);
        this.playerLegR.rotation.x = THREE.MathUtils.lerp(this.playerLegR.rotation.x, 0, 0.2);
        this.playerArmL.rotation.x = THREE.MathUtils.lerp(this.playerArmL.rotation.x, 0, 0.2);
        this.playerArmR.rotation.x = THREE.MathUtils.lerp(this.playerArmR.rotation.x, 0, 0.2);
      }
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
    if (this.playerMode !== 'avatar') {
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
      return;
    }

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
        const pickupRadius = this.playerMode === 'avatar' ? 3.8 : 5.5;
        const dist = Math.hypot(this.playerPos.x - item.basePos.x, this.playerPos.z - item.basePos.z);
        if (dist <= pickupRadius) {
          // Player collected item!
          const result = familyStore.recordScavengerItemFound(item.id, active.id);
          if (result.newlyFound) {
            soundAudio.playJingle();
            const dailyItems = getDailyScavengerItems(getTodayDateKey());
            const def = dailyItems.find(d => d.id === item.id);
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

    // 2. Sailboat Bobbing on Water
    if (this.playerMode !== 'avatar') {
      const bobY = Math.sin(time * 3.0) * 0.08;
      const rollZ = Math.sin(time * 2.2) * 0.04;
      const pitchX = Math.cos(time * 1.8) * 0.03;
      this.sailboatGroup.position.y = this.playerPos.y + bobY;
      this.sailboatGroup.rotation.z = rollZ;
      this.sailboatGroup.rotation.x = pitchX;
      if (this.boatPennant) {
        this.boatPennant.rotation.y = Math.sin(time * 6.0) * 0.25;
      }
    }

    // 3. Proximity checks
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

    // 6. Lily Pads Bobbing & Lake Water Shimmer
    this.animatedLilyPads.forEach(pad => {
      pad.mesh.position.y = pad.baseY + Math.sin(time * 2 + pad.phase) * 0.04;
      pad.mesh.rotation.y += delta * pad.rotSpeed;
    });

    if (this.lakeWaterMesh) {
      const wMat = this.lakeWaterMesh.material as THREE.MeshStandardMaterial;
      wMat.opacity = 0.82 + Math.sin(time * 1.5) * 0.05;
    }

    // 7. Lively Penguins Wandering AI
    this.animatedPenguins.forEach(p => {
      if (p.isPausing) {
        p.pauseTimer -= delta;
        p.footL.rotation.x = 0;
        p.footR.rotation.x = 0;
        p.group.rotation.z = 0;
        p.group.position.y = 1.8;
        if (p.pauseTimer <= 0) {
          p.isPausing = false;
          // Pick new random wander target within plaza/paths
          const angle = Math.random() * Math.PI * 2;
          const dist = 5 + Math.random() * 18;
          let tx = Math.cos(angle) * dist;
          let tz = Math.sin(angle) * dist;
          // Avoid walking into lake (x > 22) or off island
          if (tx > 20) tx = 18;
          if (tz < -18) tz = -16;
          p.targetPos.set(tx, 1.8, tz);
        }
      } else {
        const toTarget = new THREE.Vector3().subVectors(p.targetPos, p.currentPos);
        toTarget.y = 0;
        const distToTarget = toTarget.length();

        if (distToTarget < 0.8) {
          p.isPausing = true;
          p.pauseTimer = 1.8 + Math.random() * 3.0;
        } else {
          toTarget.normalize();
          p.currentPos.addScaledVector(toTarget, p.speed * delta);
          p.group.position.x = p.currentPos.x;
          p.group.position.z = p.currentPos.z;

          // Smooth turning towards direction of movement
          const targetHeading = Math.atan2(toTarget.x, toTarget.z);
          p.group.rotation.y = THREE.MathUtils.lerp(
            p.group.rotation.y,
            targetHeading,
            0.12
          );

          // Waddle & footstep animation
          p.waddlePhase += delta * 7.5;
          p.group.rotation.z = Math.sin(p.waddlePhase) * 0.14;
          p.group.position.y = 1.8 + Math.abs(Math.sin(p.waddlePhase)) * 0.08;

          p.footL.rotation.x = Math.sin(p.waddlePhase) * 0.35;
          p.footR.rotation.x = -Math.sin(p.waddlePhase) * 0.35;

          p.flipperL.rotation.z = 0.4 + Math.sin(p.waddlePhase) * 0.25;
          p.flipperR.rotation.z = -0.4 - Math.sin(p.waddlePhase) * 0.25;
        }
      }
    });

    // 8. Santa's Sleigh, Waving Arm, Children & Speech Bubble
    if (this.santaArm) {
      this.santaArm.rotation.z = -Math.PI / 3 + Math.sin(time * 5) * 0.35;
      this.santaArm.rotation.x = Math.sin(time * 4) * 0.15;
    }
    if (this.santaTorso) {
      this.santaTorso.position.y = 2.8 + Math.abs(Math.sin(time * 3)) * 0.08;
    }

    this.animatedChildren.forEach((child, idx) => {
      child.group.position.y = child.baseY + Math.abs(Math.sin(time * 4 + idx * 1.5)) * 0.22;
      if (child.armL && idx === 1) {
        child.armL.rotation.x = -Math.PI / 2.5 + Math.sin(time * 6) * 0.2;
      }
      if (child.armR) {
        child.armR.rotation.x = -Math.PI / 3 + Math.sin(time * 5 + idx) * 0.25;
      }
    });

    this.santaSpeechTimer -= delta;
    if (this.santaSpeechTimer <= 0) {
      if (this.santaSpeechVisible) {
        this.santaSpeechVisible = false;
        this.santaSpeechTimer = 10 + Math.random() * 8;
      } else {
        this.santaSpeechVisible = true;
        this.santaSpeechTimer = 4.5;
      }
    }

    if (this.santaSpeechBubble) {
      const targetScale = this.santaSpeechVisible ? 1.0 : 0.0;
      this.santaSpeechBubble.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
      this.santaSpeechBubble.lookAt(this.camera.position);
    }

    // 9. Render
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
