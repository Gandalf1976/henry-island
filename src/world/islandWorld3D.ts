import * as THREE from 'three';
import { AVATAR_ROSTER } from '../data/avatars';
import { familyStore } from '../state/familyStore';
import { GameType } from '../types';
import { playSound } from '../utils/audio';

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
  private podiumSnowmenGroups: THREE.Group[] = [];

  // Interactive targets
  private interactivePortals: {
    id: GameType | 'podium' | 'board';
    pos: THREE.Vector3;
    radius: number;
    title: string;
    actionText: string;
  }[] = [];

  // Movement & Camera
  private keysDown: { [key: string]: boolean } = {};
  private joystickVector = { x: 0, y: 0 };
  private playerPos = new THREE.Vector3(0, 0, 10);
  private playerTargetRotation = 0;
  private isMoving = false;
  private walkCycle = 0;
  private cameraOffset = new THREE.Vector3(0, 28, 32);

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
    this.scene.fog = new THREE.FogExp2(0xa5c9eb, 0.007);

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

    // 5. Environment & Island
    this.buildTerrain();
    this.buildLandmarks();
    this.buildSantaAndSleigh();
    this.buildDecorations();
    this.buildPenguins();
    this.buildSnowfall();

    // 6. Player
    this.buildPlayer();

    // 7. Interactive Portals Registration
    this.setupPortals();

    // 8. Event Listeners
    this.setupInputs();

    // 9. Subscribe to store for podium snowmen updates
    this.unsubscribeStore = familyStore.subscribe(() => {
      this.updatePodiumSnowmen();
    });

    // 10. Start Animation Loop
    this.animate();
  }

  private setupLights(): void {
    // Ambient Light
    const ambient = new THREE.AmbientLight(0xfff3e0, 0.75);
    this.scene.add(ambient);

    // Directional Sunlight (casting shadows)
    const sun = new THREE.DirectionalLight(0xfffaf0, 1.2);
    sun.position.set(40, 70, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 160;
    const d = 60;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Hemisphere light for winter bounce
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x93c5fd, 0.4);
    this.scene.add(hemiLight);
  }

  private buildTerrain(): void {
    // Ocean Plane
    const oceanGeo = new THREE.PlaneGeometry(400, 400);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -1.2;
    this.scene.add(ocean);

    // Island Base (Large rounded winter island)
    const islandGeo = new THREE.CylinderGeometry(85, 95, 3.5, 48);
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.85,
      metalness: 0.05
    });
    const island = new THREE.Mesh(islandGeo, snowMat);
    island.position.y = 0;
    island.receiveShadow = true;
    this.scene.add(island);

    // Island Shore Trim (Sandy/frozen rim)
    const rimGeo = new THREE.CylinderGeometry(95, 98, 1.5, 48);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.9 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = -1.2;
    this.scene.add(rim);

    // Cobblestone Paths leading to landmarks
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });

    // Center Plaza Round Cobblestones
    const plazaGeo = new THREE.CylinderGeometry(18, 18, 0.1, 32);
    const plaza = new THREE.Mesh(plazaGeo, pathMat);
    plaza.position.set(0, 1.8, 0);
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    // Path to Wordle Lodge (North)
    const pathNorthGeo = new THREE.BoxGeometry(6, 0.1, 40);
    const pathNorth = new THREE.Mesh(pathNorthGeo, pathMat);
    pathNorth.position.set(0, 1.8, -25);
    pathNorth.receiveShadow = true;
    this.scene.add(pathNorth);

    // Path to Lake (East)
    const pathEastGeo = new THREE.BoxGeometry(42, 0.1, 6);
    const pathEast = new THREE.Mesh(pathEastGeo, pathMat);
    pathEast.position.set(26, 1.8, 4);
    pathEast.receiveShadow = true;
    this.scene.add(pathEast);

    // Path to Quiz Lodge (West)
    const pathWestGeo = new THREE.BoxGeometry(42, 0.1, 6);
    const pathWest = new THREE.Mesh(pathWestGeo, pathMat);
    pathWest.position.set(-26, 1.8, 4);
    pathWest.receiveShadow = true;
    this.scene.add(pathWest);

    // Path to Santa & Sleigh (South)
    const pathSouthGeo = new THREE.BoxGeometry(6, 0.1, 35);
    const pathSouth = new THREE.Mesh(pathSouthGeo, pathMat);
    pathSouth.position.set(0, 1.8, 25);
    pathSouth.receiveShadow = true;
    this.scene.add(pathSouth);

    // Floating Icebergs in ocean
    const icebergMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.3 });
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.2;
      const dist = 110 + Math.random() * 35;
      const ibGeo = new THREE.DodecahedronGeometry(5 + Math.random() * 7, 1);
      const ib = new THREE.Mesh(ibGeo, icebergMat);
      ib.position.set(Math.cos(angle) * dist, -0.5, Math.sin(angle) * dist);
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

    // Glowing Windows
    const winGeo = new THREE.PlaneGeometry(2.5, 3.5);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const win1 = new THREE.Mesh(winGeo, winMat);
    win1.position.set(-4, 5, 7.05);
    wordleGroup.add(win1);
    const win2 = new THREE.Mesh(winGeo, winMat);
    win2.position.set(4, 5, 7.05);
    wordleGroup.add(win2);

    // Door
    const doorGeo = new THREE.PlaneGeometry(3, 5);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 2.5, 7.05);
    wordleGroup.add(door);

    // Front Porch Signpost
    const signGroup = this.createSignpost('WORDLE LODGE', '5-Letter Daily');
    signGroup.position.set(0, 0, 9);
    wordleGroup.add(signGroup);

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

    // 3D Lilypads resting near shore
    const padMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const padGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.15, 16);
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(Math.cos(angle) * 14, 0.45, Math.sin(angle) * 14);
      lakeGroup.add(pad);
    }

    // Lake Signpost
    const lakeSign = this.createSignpost('HENRY LAKE', '120s Word Scramble');
    lakeSign.position.set(-18, 0, 2);
    lakeGroup.add(lakeSign);

    this.scene.add(lakeGroup);

    // -------------------------------------------------------------
    // 3. QUIZ LODGE (West: -48, 1.8, 4)
    // -------------------------------------------------------------
    const quizGroup = new THREE.Group();
    quizGroup.position.set(-48, 1.8, 4);

    // Lodge Main Hall
    const quizHallGeo = new THREE.BoxGeometry(18, 12, 16);
    const hallMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 }); // Festive red timber
    const quizHall = new THREE.Mesh(quizHallGeo, hallMat);
    quizHall.position.y = 6;
    quizHall.castShadow = true;
    quizGroup.add(quizHall);

    // Chalet Gabled Roof
    const quizRoofGeo = new THREE.ConeGeometry(15, 8, 4);
    const quizRoof = new THREE.Mesh(quizRoofGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    quizRoof.position.y = 15;
    quizRoof.rotation.y = Math.PI / 4;
    quizRoof.scale.set(1.2, 1, 1.2);
    quizRoof.castShadow = true;
    quizGroup.add(quizRoof);

    // Clock / Bell Tower
    const towerGeo = new THREE.BoxGeometry(4, 9, 4);
    const tower = new THREE.Mesh(towerGeo, new THREE.MeshStandardMaterial({ color: 0x991b1b }));
    tower.position.set(0, 18, 0);
    quizGroup.add(tower);

    // Golden Bell
    const bellGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const bell = new THREE.Mesh(bellGeo, new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 }));
    bell.position.set(0, 21.5, 0);
    quizGroup.add(bell);

    // Candy Cane entrance pillars
    const caneL = this.createCandyCane();
    caneL.position.set(-4, 0, 8.5);
    caneL.scale.set(1.5, 1.5, 1.5);
    quizGroup.add(caneL);

    const caneR = this.createCandyCane();
    caneR.position.set(4, 0, 8.5);
    caneR.scale.set(1.5, 1.5, 1.5);
    quizGroup.add(caneR);

    // Quiz Signpost
    const quizSign = this.createSignpost('QUIZ LODGE', '60s Teen Trivia');
    quizSign.position.set(18, 0, 2);
    quizGroup.add(quizSign);

    this.scene.add(quizGroup);

    // -------------------------------------------------------------
    // 4. TOWN CENTER PODIUM & MESSAGE BOARD (0, 1.8, 0)
    // -------------------------------------------------------------
    this.buildPodiumAndBoard();
  }

  private buildPodiumAndBoard(): void {
    const centerGroup = new THREE.Group();
    centerGroup.position.set(0, 1.8, 0);

    // Podium Pedestals
    const podiumPillars = [
      { rank: 2, x: -7, h: 2.2, color: 0x94a3b8 }, // 2nd Silver
      { rank: 1, x: 0, h: 3.4, color: 0xf59e0b },  // 1st Gold
      { rank: 3, x: 7, h: 1.6, color: 0xb45309 }   // 3rd Bronze
    ];

    podiumPillars.forEach(p => {
      const pGeo = new THREE.CylinderGeometry(3.2, 3.5, p.h, 24);
      const pMat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.5, metalness: 0.2 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(p.x, p.h / 2, -6);
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      centerGroup.add(pMesh);
    });

    // -------------------------------------------------------------
    // 3D HOLIDAY BULLETIN BOARD / MESSAGE BOARD (x: 10, z: -2)
    // -------------------------------------------------------------
    const boardGroup = new THREE.Group();
    boardGroup.position.set(10, 0, -2);

    // Wooden Posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const postGeo = new THREE.CylinderGeometry(0.3, 0.3, 7, 12);
    const post1 = new THREE.Mesh(postGeo, postMat);
    post1.position.set(-3, 3.5, 0);
    post1.castShadow = true;
    boardGroup.add(post1);

    const post2 = new THREE.Mesh(postGeo, postMat);
    post2.position.set(3, 3.5, 0);
    post2.castShadow = true;
    boardGroup.add(post2);

    // Cork Bulletin Board Board
    const boardPanelGeo = new THREE.BoxGeometry(6.5, 4.5, 0.4);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    const boardPanel = new THREE.Mesh(boardPanelGeo, boardMat);
    boardPanel.position.set(0, 4.5, 0);
    boardPanel.castShadow = true;
    boardGroup.add(boardPanel);

    // Pinned Notes on board
    const noteMat1 = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const noteMat2 = new THREE.MeshBasicMaterial({ color: 0xa7f3d0 });
    const noteGeo = new THREE.PlaneGeometry(1.4, 1.2);
    const note1 = new THREE.Mesh(noteGeo, noteMat1);
    note1.position.set(-1.6, 5, 0.22);
    boardGroup.add(note1);

    const note2 = new THREE.Mesh(noteGeo, noteMat2);
    note2.position.set(1.4, 4.2, 0.22);
    boardGroup.add(note2);

    // Little cute yellow bird / bell on the top of the board
    const birdGeo = new THREE.SphereGeometry(0.5, 12, 12);
    const birdMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    const bird = new THREE.Mesh(birdGeo, birdMat);
    bird.position.set(0, 7.1, 0);
    boardGroup.add(bird);

    // Sign banner above board
    const boardBanner = this.createSignpost('BULLETIN BOARD', 'Family Messages 💬');
    boardBanner.position.set(0, 0, 1.5);
    boardBanner.scale.set(0.8, 0.8, 0.8);
    boardGroup.add(boardBanner);

    centerGroup.add(boardGroup);
    this.scene.add(centerGroup);

    // Build the dynamic 3D snowmen on the podium
    this.updatePodiumSnowmen();
  }

  private updatePodiumSnowmen(): void {
    // Remove existing snowmen
    this.podiumSnowmenGroups.forEach(g => this.scene.remove(g));
    this.podiumSnowmenGroups = [];

    const leaderboard = familyStore.getLeaderboard();
    const slots = [
      { rank: 2, x: -7, h: 2.2 },
      { rank: 1, x: 0, h: 3.4 },
      { rank: 3, x: 7, h: 1.6 }
    ];

    slots.forEach(slot => {
      const entry = leaderboard.find(l => l.rank === slot.rank);
      if (entry) {
        // Base scale scales with average score
        const scoreScale = THREE.MathUtils.clamp(0.8 + (entry.stats.averageScore / 10) * 0.4, 0.7, 1.4);
        const smGroup = this.create3DSnowman(scoreScale, entry.rank === 1);
        smGroup.position.set(slot.x, 1.8 + slot.h, -6);
        this.scene.add(smGroup);
        this.podiumSnowmenGroups.push(smGroup);
      }
    });
  }

  private create3DSnowman(scale: number, isWinner: boolean): THREE.Group {
    const sm = new THREE.Group();
    sm.scale.set(scale, scale, scale);

    const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const coalMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const carrotMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.5 });
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 });

    // Bottom Sphere
    const baseGeo = new THREE.SphereGeometry(1.6, 20, 20);
    const baseMesh = new THREE.Mesh(baseGeo, snowMat);
    baseMesh.position.y = 1.4;
    baseMesh.castShadow = true;
    sm.add(baseMesh);

    // Torso Sphere
    const torsoGeo = new THREE.SphereGeometry(1.2, 20, 20);
    const torsoMesh = new THREE.Mesh(torsoGeo, snowMat);
    torsoMesh.position.y = 3.3;
    torsoMesh.castShadow = true;
    sm.add(torsoMesh);

    // Head Sphere
    const headGeo = new THREE.SphereGeometry(0.9, 20, 20);
    const headMesh = new THREE.Mesh(headGeo, snowMat);
    headMesh.position.y = 4.8;
    headMesh.castShadow = true;
    sm.add(headMesh);

    // Carrot Nose
    const carrotGeo = new THREE.ConeGeometry(0.2, 0.9, 12);
    const carrot = new THREE.Mesh(carrotGeo, carrotMat);
    carrot.rotation.x = Math.PI / 2;
    carrot.position.set(0, 4.8, 0.9 + 0.4);
    sm.add(carrot);

    // Coal Eyes
    const eyeGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, coalMat);
    eyeL.position.set(-0.3, 5.0, 0.82);
    sm.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, coalMat);
    eyeR.position.set(0.3, 5.0, 0.82);
    sm.add(eyeR);

    // Knitted Scarf
    const scarfGeo = new THREE.TorusGeometry(1.0, 0.25, 12, 24);
    const scarf = new THREE.Mesh(scarfGeo, scarfMat);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.set(0, 4.1, 0);
    sm.add(scarf);

    // Top Hat or Golden Crown
    if (isWinner) {
      // Golden Crown for 1st place!
      const crownGeo = new THREE.CylinderGeometry(1.1, 0.9, 0.8, 6);
      const crownMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(0, 5.8, 0);
      sm.add(crown);
    } else {
      // Top hat
      const brimGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.12, 16);
      const brim = new THREE.Mesh(brimGeo, coalMat);
      brim.position.set(0, 5.5, 0);
      sm.add(brim);

      const topGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.1, 16);
      const top = new THREE.Mesh(topGeo, coalMat);
      top.position.set(0, 6.05, 0);
      sm.add(top);
    }

    return sm;
  }

  private buildSantaAndSleigh(): void {
    const group = new THREE.Group();
    group.position.set(0, 1.8, 45); // South holiday display

    // 1. SLEIGH (Crimson Red with Gold Runners)
    const sleighMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 });

    // Sleigh Body
    const bodyGeo = new THREE.BoxGeometry(7, 3.5, 12);
    const body = new THREE.Mesh(bodyGeo, sleighMat);
    body.position.set(0, 2.5, 0);
    body.castShadow = true;
    group.add(body);

    // Sleigh Gold Runners
    const runnerGeo = new THREE.BoxGeometry(0.4, 0.4, 15);
    const runnerL = new THREE.Mesh(runnerGeo, goldMat);
    runnerL.position.set(-3.2, 0.6, 0);
    group.add(runnerL);

    const runnerR = new THREE.Mesh(runnerGeo, goldMat);
    runnerR.position.set(3.2, 0.6, 0);
    group.add(runnerR);

    // Wrapped Gift Boxes inside Sleigh
    const giftColors = [0x10b981, 0x3b82f6, 0xf59e0b, 0xec4899];
    for (let i = 0; i < 7; i++) {
      const gGeo = new THREE.BoxGeometry(1.8 + Math.random() * 0.8, 1.8 + Math.random() * 0.8, 1.8 + Math.random() * 0.8);
      const gMat = new THREE.MeshStandardMaterial({ color: giftColors[i % giftColors.length], roughness: 0.7 });
      const g = new THREE.Mesh(gGeo, gMat);
      g.position.set(-1.8 + (i % 3) * 1.8, 4.2 + Math.floor(i / 3) * 1.2, -3 + (i % 2) * 3);
      g.rotation.y = (i * 0.4);
      group.add(g);
    }

    // 2. REINDEER (Rudolph in front of the Sleigh)
    const deerGroup = new THREE.Group();
    deerGroup.position.set(0, 0, 13);

    const deerMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

    // Deer Body
    const deerBodyGeo = new THREE.BoxGeometry(2.4, 3, 5);
    const deerBody = new THREE.Mesh(deerBodyGeo, deerMat);
    deerBody.position.y = 3.5;
    deerBody.castShadow = true;
    deerGroup.add(deerBody);

    // Deer Legs
    const legGeo = new THREE.CylinderGeometry(0.3, 0.3, 2.8, 8);
    for (let lx of [-0.9, 0.9]) {
      for (let lz of [-1.8, 1.8]) {
        const leg = new THREE.Mesh(legGeo, deerMat);
        leg.position.set(lx, 1.4, lz);
        leg.castShadow = true;
        deerGroup.add(leg);
      }
    }

    // Deer Neck & Head
    const headGeo = new THREE.BoxGeometry(1.6, 1.8, 2.4);
    const deerHead = new THREE.Mesh(headGeo, deerMat);
    deerHead.position.set(0, 5.5, 2.8);
    deerGroup.add(deerHead);

    // Rudolph Glowing Red Nose!
    const noseGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const noseMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 5.2, 4.1);
    deerGroup.add(nose);

    // Antlers
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const antlerGeo = new THREE.CylinderGeometry(0.15, 0.15, 2, 6);
    const antlerL = new THREE.Mesh(antlerGeo, antlerMat);
    antlerL.position.set(-0.8, 6.8, 2.6);
    antlerL.rotation.z = -0.4;
    deerGroup.add(antlerL);

    const antlerR = new THREE.Mesh(antlerGeo, antlerMat);
    antlerR.position.set(0.8, 6.8, 2.6);
    antlerR.rotation.z = 0.4;
    deerGroup.add(antlerR);

    group.add(deerGroup);

    // 3. 3D SANTA CLAUS (Beside the sleigh)
    const santaGroup = new THREE.Group();
    santaGroup.position.set(-5, 0, 0);

    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfecdd3, roughness: 0.6 });
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });

    // Santa Body
    const sBodyGeo = new THREE.CylinderGeometry(1.6, 2.0, 3.5, 16);
    const sBody = new THREE.Mesh(sBodyGeo, redMat);
    sBody.position.y = 2.4;
    sBody.castShadow = true;
    santaGroup.add(sBody);

    // Black Belt & Gold Buckle
    const beltGeo = new THREE.CylinderGeometry(1.85, 1.85, 0.5, 16);
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = 2.2;
    santaGroup.add(belt);

    const buckleGeo = new THREE.BoxGeometry(0.8, 0.6, 0.2);
    const buckle = new THREE.Mesh(buckleGeo, goldMat);
    buckle.position.set(0, 2.2, 1.8);
    santaGroup.add(buckle);

    // Santa Head & Fluffy Beard
    const sHeadGeo = new THREE.SphereGeometry(1.0, 16, 16);
    const sHead = new THREE.Mesh(sHeadGeo, skinMat);
    sHead.position.y = 4.6;
    santaGroup.add(sHead);

    const beardGeo = new THREE.SphereGeometry(1.1, 16, 16);
    const beard = new THREE.Mesh(beardGeo, whiteMat);
    beard.position.set(0, 4.3, 0.5);
    beard.scale.set(1.0, 1.2, 0.7);
    santaGroup.add(beard);

    // Santa Hat
    const hatGeo = new THREE.ConeGeometry(1.1, 1.8, 16);
    const hat = new THREE.Mesh(hatGeo, redMat);
    hat.position.set(0, 5.8, -0.2);
    hat.rotation.x = -0.3;
    santaGroup.add(hat);

    const pomGeo = new THREE.SphereGeometry(0.35, 10, 10);
    const pom = new THREE.Mesh(pomGeo, whiteMat);
    pom.position.set(0, 6.7, -0.7);
    santaGroup.add(pom);

    group.add(santaGroup);

    this.scene.add(group);
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

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.8, 1.0, 3, 10);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x543310, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    tree.add(trunk);

    // Foliage tiers with snow tips
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

      const snowCone = new THREE.Mesh(new THREE.ConeGeometry(t.r * 0.9, t.h * 0.35, 12), snowTipMat);
      snowCone.position.y = t.y + t.h * 0.35;
      tree.add(snowCone);
    });

    // Colorful Baubles
    const colors = [0xef4444, 0xfacc15, 0x38bdf8, 0xa855f7];
    for (let i = 0; i < 14; i++) {
      const bGeo = new THREE.SphereGeometry(0.35, 8, 8);
      const bMat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        metalness: 0.6,
        roughness: 0.3
      });
      const b = new THREE.Mesh(bGeo, bMat);
      const t = tiers[i % 3];
      const angle = (i * 1.8);
      const rad = t.r * 0.85;
      b.position.set(Math.cos(angle) * rad, t.y - 0.5, Math.sin(angle) * rad);
      tree.add(b);
    }

    // Golden Star on top
    const starGeo = new THREE.OctahedronGeometry(0.9, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.y = 12.0;
    tree.add(star);

    return tree;
  }

  private createCandyCane(): THREE.Group {
    const cane = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
    const stemGeo = new THREE.CylinderGeometry(0.4, 0.4, 6, 12);
    const stem = new THREE.Mesh(stemGeo, mat);
    stem.position.y = 3;
    stem.castShadow = true;
    cane.add(stem);

    const hookGeo = new THREE.TorusGeometry(1.2, 0.4, 10, 16, Math.PI);
    const hook = new THREE.Mesh(hookGeo, mat);
    hook.position.set(1.2, 6, 0);
    hook.rotation.z = -Math.PI / 2;
    cane.add(hook);

    return cane;
  }

  private createStreetLantern(): THREE.Group {
    const lantern = new THREE.Group();
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });

    // Post
    const poleGeo = new THREE.CylinderGeometry(0.25, 0.35, 7, 8);
    const pole = new THREE.Mesh(poleGeo, ironMat);
    pole.position.y = 3.5;
    pole.castShadow = true;
    lantern.add(pole);

    // Glass lamp with glowing warm light
    const lampGeo = new THREE.BoxGeometry(1.2, 1.6, 1.2);
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.y = 7.3;
    lantern.add(lamp);

    // Warm PointLight
    const light = new THREE.PointLight(0xffedd5, 0.9, 14);
    light.position.y = 7.3;
    lantern.add(light);

    return lantern;
  }

  private createSignpost(title: string, subtitle: string): THREE.Group {
    const sign = new THREE.Group();

    // Wooden post
    const postGeo = new THREE.CylinderGeometry(0.3, 0.3, 4.5, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 2.25;
    post.castShadow = true;
    sign.add(post);

    // Board
    const boardGeo = new THREE.BoxGeometry(5.5, 2.2, 0.4);
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = 3.8;
    board.castShadow = true;
    sign.add(board);

    // Create Canvas Texture for Signboard Text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 244, 116);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, 128, 52);

      ctx.fillStyle = '#fef08a';
      ctx.font = '16px sans-serif';
      ctx.fillText(subtitle, 128, 88);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.MeshBasicMaterial({ map: texture });
    const textPlate = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.0), textMat);
    textPlate.position.set(0, 3.8, 0.22);
    sign.add(textPlate);

    return sign;
  }

  private buildPenguins(): void {
    const penguinPositions = [
      new THREE.Vector3(-15, 1.8, -12),
      new THREE.Vector3(22, 1.8, -8),
      new THREE.Vector3(14, 1.8, 18),
      new THREE.Vector3(-20, 1.8, 12)
    ];

    penguinPositions.forEach(pos => {
      const pGroup = new THREE.Group();
      pGroup.position.copy(pos);

      // Body (Black & White)
      const bodyGeo = new THREE.CylinderGeometry(0.8, 1.0, 2.2, 12);
      const bMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
      const body = new THREE.Mesh(bodyGeo, bMat);
      body.position.y = 1.1;
      pGroup.add(body);

      // White Belly
      const bellyGeo = new THREE.CylinderGeometry(0.65, 0.8, 1.8, 12);
      const belly = new THREE.Mesh(bellyGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }));
      belly.position.set(0, 1.0, 0.25);
      pGroup.add(belly);

      // Orange Beak & Feet
      const beakGeo = new THREE.ConeGeometry(0.3, 0.6, 8);
      const beak = new THREE.Mesh(beakGeo, new THREE.MeshStandardMaterial({ color: 0xf97316 }));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 1.6, 0.9);
      pGroup.add(beak);

      this.scene.add(pGroup);

      this.animatedPenguins.push({
        group: pGroup,
        basePos: pos.clone(),
        angle: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.3,
        waddle: Math.random() * 10
      });
    });
  }

  private buildSnowfall(): void {
    const count = 1600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 1] = Math.random() * 50 + 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.45,
      transparent: true,
      opacity: 0.85
    });

    this.snowParticles = new THREE.Points(geometry, material);
    this.scene.add(this.snowParticles);
  }

  private buildPlayer(): void {
    this.playerGroup = new THREE.Group();
    this.playerGroup.position.copy(this.playerPos);

    const activePlayer = familyStore.getActivePlayer();
    const avatarDef = AVATAR_ROSTER.find(a => a.id === activePlayer?.avatarId);
    const coatColor = avatarDef ? new THREE.Color(avatarDef.color).getHex() : 0x2563eb;
    const skinColor = 0xfecdd3;
    const hatColor = avatarDef ? new THREE.Color(avatarDef.hatColor).getHex() : 0xdc2626;

    // Body / Coat
    const bodyGeo = new THREE.CylinderGeometry(0.8, 1.1, 1.8, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.6;
    body.castShadow = true;
    this.playerGroup.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.85, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.9;
    head.castShadow = true;
    this.playerGroup.add(head);

    // Bobble Hat
    const hatGeo = new THREE.ConeGeometry(0.9, 1.2, 16);
    const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.7 });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 3.8;
    this.playerGroup.add(hat);

    const pomGeo = new THREE.SphereGeometry(0.3, 10, 10);
    const pom = new THREE.Mesh(pomGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
    pom.position.y = 4.5;
    this.playerGroup.add(pom);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.7 });

    this.playerArmL = new THREE.Mesh(armGeo, armMat);
    this.playerArmL.position.set(-1.1, 1.8, 0);
    this.playerGroup.add(this.playerArmL);

    this.playerArmR = new THREE.Mesh(armGeo, armMat);
    this.playerArmR.position.set(1.1, 1.8, 0);
    this.playerGroup.add(this.playerArmR);

    // Legs / Boots
    const legGeo = new THREE.CylinderGeometry(0.28, 0.35, 1.1, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    this.playerLegL = new THREE.Mesh(legGeo, legMat);
    this.playerLegL.position.set(-0.45, 0.55, 0);
    this.playerLegL.castShadow = true;
    this.playerGroup.add(this.playerLegL);

    this.playerLegR = new THREE.Mesh(legGeo, legMat);
    this.playerLegR.position.set(0.45, 0.55, 0);
    this.playerLegR.castShadow = true;
    this.playerGroup.add(this.playerLegR);

    this.scene.add(this.playerGroup);
  }

  private setupPortals(): void {
    this.interactivePortals = [
      {
        id: 'wordle',
        pos: new THREE.Vector3(0, 1.8, -42),
        radius: 9,
        title: '🟩 Henry-Wordle',
        actionText: 'Tap or Press Space to Play Wordle'
      },
      {
        id: 'lake',
        pos: new THREE.Vector3(42, 1.8, 4),
        radius: 12,
        title: '🪷 Henry-Lake',
        actionText: 'Tap or Press Space to Play Lake'
      },
      {
        id: 'quiz',
        pos: new THREE.Vector3(-42, 1.8, 4),
        radius: 10,
        title: '🧠 Henry-Quiz',
        actionText: 'Tap or Press Space to Play Quiz'
      },
      {
        id: 'podium',
        pos: new THREE.Vector3(0, 1.8, -4),
        radius: 7,
        title: '🏆 Snowman Podium',
        actionText: 'Tap or Press Space for Leaderboard'
      },
      {
        id: 'board',
        pos: new THREE.Vector3(10, 1.8, -2),
        radius: 6,
        title: '📌 Bulletin Board',
        actionText: 'Tap or Press Space for Messages'
      }
    ];

    // Create Action Prompt Overlay element
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

  private setupInputs(): void {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keysDown[e.key.toLowerCase()] = true;
      if (e.key === ' ' || e.key === 'Enter') {
        if (this.currentActiveTarget) {
          e.preventDefault();
          this.triggerInteraction(this.currentActiveTarget.id);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown[e.key.toLowerCase()] = false;
    });

    // Window Resize
    window.addEventListener('resize', () => {
      if (!this.camera || !this.renderer) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Click / Tap on 3D objects
    this.container.addEventListener('pointerdown', (e) => {
      // Raycast click to interact with portals
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Check distance to interactive landmarks
      for (const portal of this.interactivePortals) {
        const dist = this.playerPos.distanceTo(portal.pos);
        if (dist <= portal.radius * 1.5) {
          this.triggerInteraction(portal.id);
          break;
        }
      }
    });
  }

  public setJoystickInput(x: number, y: number): void {
    this.joystickVector.x = x;
    this.joystickVector.y = y;
  }

  public teleportTo(id: GameType | 'podium' | 'board'): void {
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
    playSound('buttonClick');
    if (id === 'wordle' || id === 'lake' || id === 'quiz') {
      this.callbacks.onTriggerGame(id as GameType);
    } else if (id === 'podium') {
      this.callbacks.onOpenPodium();
    } else if (id === 'board') {
      this.callbacks.onOpenMessageBoard();
    }
  }

  private updateMovement(delta: number): void {
    let dx = 0;
    let dz = 0;

    // Keyboard inputs
    if (this.keysDown['w'] || this.keysDown['arrowup']) dz -= 1;
    if (this.keysDown['s'] || this.keysDown['arrowdown']) dz += 1;
    if (this.keysDown['a'] || this.keysDown['arrowleft']) dx -= 1;
    if (this.keysDown['d'] || this.keysDown['arrowright']) dx += 1;

    // Mobile Joystick inputs
    if (Math.abs(this.joystickVector.x) > 0.05) dx += this.joystickVector.x;
    if (Math.abs(this.joystickVector.y) > 0.05) dz += this.joystickVector.y;

    const moveLen = Math.hypot(dx, dz);
    this.isMoving = moveLen > 0.1;

    const speed = 18; // Walk speed
    if (this.isMoving) {
      const normX = dx / moveLen;
      const normZ = dz / moveLen;

      this.playerPos.x += normX * speed * delta;
      this.playerPos.z += normZ * speed * delta;

      // Keep player inside island boundaries
      const distFromCenter = Math.hypot(this.playerPos.x, this.playerPos.z);
      if (distFromCenter > 75) {
        const angle = Math.atan2(this.playerPos.z, this.playerPos.x);
        this.playerPos.x = Math.cos(angle) * 75;
        this.playerPos.z = Math.sin(angle) * 75;
      }

      this.playerGroup.position.copy(this.playerPos);

      // Rotate player towards movement
      this.playerTargetRotation = Math.atan2(normX, normZ);
      this.playerGroup.rotation.y = THREE.MathUtils.lerp(
        this.playerGroup.rotation.y,
        this.playerTargetRotation,
        0.2
      );

      // Walk limb animation
      this.walkCycle += delta * 12;
      this.playerLegL.rotation.x = Math.sin(this.walkCycle) * 0.7;
      this.playerLegR.rotation.x = -Math.sin(this.walkCycle) * 0.7;
      this.playerArmL.rotation.x = -Math.sin(this.walkCycle) * 0.7;
      this.playerArmR.rotation.x = Math.sin(this.walkCycle) * 0.7;
    } else {
      // Idle pose
      this.playerLegL.rotation.x = THREE.MathUtils.lerp(this.playerLegL.rotation.x, 0, 0.1);
      this.playerLegR.rotation.x = THREE.MathUtils.lerp(this.playerLegR.rotation.x, 0, 0.1);
      this.playerArmL.rotation.x = THREE.MathUtils.lerp(this.playerArmL.rotation.x, 0, 0.1);
      this.playerArmR.rotation.x = THREE.MathUtils.lerp(this.playerArmR.rotation.x, 0, 0.1);
    }

    // Camera smoothly follows player
    const targetCamX = this.playerPos.x + this.cameraOffset.x;
    const targetCamY = this.playerPos.y + this.cameraOffset.y;
    const targetCamZ = this.playerPos.z + this.cameraOffset.z;

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, 0.08);
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, 0.08);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, 0.08);
    this.camera.lookAt(this.playerPos.x, this.playerPos.y + 2, this.playerPos.z);

    this.checkProximity();
  }

  private checkProximity(): void {
    let closestTarget: (typeof this.interactivePortals)[0] | null = null;
    let minDistance = Infinity;

    for (const portal of this.interactivePortals) {
      const dist = this.playerPos.distanceTo(portal.pos);
      if (dist <= portal.radius && dist < minDistance) {
        minDistance = dist;
        closestTarget = portal;
      }
    }

    if (closestTarget !== this.currentActiveTarget) {
      this.currentActiveTarget = closestTarget;
      if (this.promptEl) {
        if (closestTarget) {
          this.promptEl.innerHTML = `
            <span class="text-xl animate-bounce">👉</span>
            <div>
              <div class="font-black text-sm text-amber-300">${closestTarget.title}</div>
              <div class="text-xs text-slate-300">${closestTarget.actionText}</div>
            </div>
          `;
          this.promptEl.classList.remove('hidden', 'opacity-0', 'scale-95');
          this.promptEl.classList.add('opacity-100', 'scale-100');
        } else {
          this.promptEl.classList.remove('opacity-100', 'scale-100');
          this.promptEl.classList.add('opacity-0', 'scale-95');
          setTimeout(() => {
            if (!this.currentActiveTarget && this.promptEl) {
              this.promptEl.classList.add('hidden');
            }
          }, 200);
        }
      }
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Player and camera movement
    this.updateMovement(delta);

    // Animate falling snowflakes
    if (this.snowParticles) {
      const posAttr = this.snowParticles.geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;
      for (let i = 0; i < array.length; i += 3) {
        array[i + 1] -= delta * 6; // fall down
        array[i] += Math.sin(array[i + 1] * 0.1) * delta * 2; // wind drift
        if (array[i + 1] < 0) {
          array[i + 1] = 50;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Animate wandering penguins
    this.animatedPenguins.forEach(p => {
      p.angle += delta * p.speed * 0.4;
      p.group.position.x = p.basePos.x + Math.cos(p.angle) * 5;
      p.group.position.z = p.basePos.z + Math.sin(p.angle) * 5;
      p.group.rotation.y = -p.angle + Math.PI / 2;
      p.waddle += delta * 8;
      p.group.rotation.z = Math.sin(p.waddle) * 0.15; // cute waddle
    });

    this.renderer.render(this.scene, this.camera);
  };

  public destroy(): void {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.unsubscribeStore) this.unsubscribeStore();
    if (this.promptEl) this.promptEl.remove();
    this.renderer.dispose();
  }
}
