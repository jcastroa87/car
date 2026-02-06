// ============================================
// 🚗 JUEGO DE CARROS 3D - CIUDAD CON CALLES
// Kid-friendly: auto-drive, zonas táctiles, giroscopio
// Sonido, bocina, día/noche, animaciones de ciudad
// ============================================

class CarGame3D {
    constructor() {
        this.container = document.getElementById('game-canvas');

        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.car = null;
        this.trees = [];
        this.buildings = [];
        this.clouds = [];

        this.isRunning = false;
        this.clock = new THREE.Clock();

        // Color del auto (seleccionable)
        this.carColor = 0xFF4444;

        // Física del auto
        this.carState = {
            x: 0, z: 0, rotation: 0, speed: 0,
            maxSpeed: 0.25,
            maxReverseSpeed: -0.12,
            acceleration: 0.004,
            brakeForce: 0.02,
            friction: 0.003,
            turnSpeed: 0.035,
            tilt: 0
        };

        this.controls = {
            braking: false,
            turningLeft: false,
            turningRight: false
        };

        this.gyro = {
            enabled: false,
            gamma: 0,
            deadZone: 8,
            sensitivity: 0.0015
        };

        this.city = {
            blockSize: 40,
            streetWidth: 12,
            gridSize: 8,
            blocks: []
        };

        this.mission = { shapes: [], score: 0 };

        // Audio
        this.audioCtx = null;
        this.engineOsc = null;
        this.engineGain = null;

        // Flecha direccional
        this.directionArrow = null;

        // Día/noche
        this.dayNight = {
            time: 0,       // 0 = amanecer, 0.25 = mediodía, 0.5 = atardecer, 0.75 = noche
            speed: 0.008,  // Velocidad del ciclo
            ambientLight: null,
            dirLight: null
        };

        // Semáforos y banderas
        this.trafficLights = [];
        this.flags = [];
        this.birds = [];

        // Materiales de ventanas (para día/noche)
        this.windowDayMat = null;
        this.windowNightMat = null;
        this.allWindowMeshes = [];

        this.init();
    }

    init() {
        this.setupThreeJS();
        this.createScene();
        this.setupControls();
        this.setupGyroscope();
        this.setupColorPicker();
        this.setupStartScreen();
        this.onWindowResize();
        window.addEventListener('resize', () => this.onWindowResize());
    }

    // =====================
    // AUDIO (Web Audio API)
    // =====================

    initAudio() {
        if (this.audioCtx) return;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Motor: oscilador continuo
        this.engineOsc = this.audioCtx.createOscillator();
        this.engineGain = this.audioCtx.createGain();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 60;
        this.engineGain.gain.value = 0;
        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.audioCtx.destination);
        this.engineOsc.start();
    }

    updateEngineSound() {
        if (!this.audioCtx || !this.engineGain) return;
        const speed = Math.abs(this.carState.speed);
        const maxSpeed = this.carState.maxSpeed;
        const ratio = speed / maxSpeed;

        this.engineOsc.frequency.value = 60 + ratio * 120;
        this.engineGain.gain.value = 0.03 + ratio * 0.06;
    }

    playCollectSound() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 600;
        gain.gain.value = 0.15;
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.frequency.linearRampToValueAtTime(1200, this.audioCtx.currentTime + 0.15);
        gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.3);
        osc.stop(this.audioCtx.currentTime + 0.3);
    }

    playBounceSound() {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 300;
        gain.gain.value = 0.1;
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        osc.frequency.linearRampToValueAtTime(100, this.audioCtx.currentTime + 0.15);
        gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.2);
        osc.stop(this.audioCtx.currentTime + 0.2);
    }

    playHornSound() {
        if (!this.audioCtx) return;
        // Dos tonos simultáneos = bocina de auto
        [420, 520].forEach(freq => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.value = freq;
            gain.gain.value = 0.08;
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start();
            gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.4);
            osc.stop(this.audioCtx.currentTime + 0.4);
        });
    }

    playCelebrationSound() {
        if (!this.audioCtx) return;
        const notes = [523, 659, 784, 1047]; // Do Mi Sol Do alto
        notes.forEach((freq, i) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.value = 0.12;
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(this.audioCtx.currentTime + i * 0.12);
            gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime + i * 0.12);
            gain.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + i * 0.12 + 0.3);
            osc.stop(this.audioCtx.currentTime + i * 0.12 + 0.3);
        });
    }

    // =====================
    // THREE.JS SETUP
    // =====================

    setupThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 80, 250);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 400);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        // Luces (referenciadas para día/noche)
        this.dayNight.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(this.dayNight.ambientLight);

        this.dayNight.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.dayNight.dirLight.position.set(50, 80, 50);
        this.dayNight.dirLight.castShadow = true;
        this.scene.add(this.dayNight.dirLight);

        // Materiales de ventana compartidos
        this.windowDayMat = new THREE.MeshBasicMaterial({ color: 0x87CEEB });
        this.windowNightMat = new THREE.MeshBasicMaterial({ color: 0xFFFF99 });
    }

    createScene() {
        this.createGround();
        this.createCityGrid();
        this.createCar();
        this.createNPCCars();
        this.createShapes();
        this.createDirectionArrow();
        this.createClouds();
        this.createBirds();
    }

    // =====================
    // CITY GENERATION
    // =====================

    createGround() {
        const geo = new THREE.PlaneGeometry(600, 600);
        const mat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
        const ground = new THREE.Mesh(geo, mat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    createCityGrid() {
        const { blockSize, streetWidth, gridSize } = this.city;
        const totalSize = (blockSize + streetWidth) * gridSize;
        const halfSize = totalSize / 2;

        const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const lineMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const yellowMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });

        for (let i = 0; i <= gridSize; i++) {
            const z = -halfSize + i * (blockSize + streetWidth) + streetWidth / 2;
            const streetGeo = new THREE.PlaneGeometry(totalSize, streetWidth);
            const street = new THREE.Mesh(streetGeo, asphaltMat);
            street.rotation.x = -Math.PI / 2;
            street.position.set(0, 0.01, z);
            street.receiveShadow = true;
            this.scene.add(street);

            const lineGeo = new THREE.PlaneGeometry(totalSize, 0.4);
            [-streetWidth/2 + 0.5, streetWidth/2 - 0.5].forEach(offset => {
                const line = new THREE.Mesh(lineGeo, lineMat);
                line.rotation.x = -Math.PI / 2;
                line.position.set(0, 0.02, z + offset);
                this.scene.add(line);
            });

            for (let x = -halfSize; x < halfSize; x += 8) {
                const centerGeo = new THREE.PlaneGeometry(4, 0.3);
                const centerLine = new THREE.Mesh(centerGeo, yellowMat);
                centerLine.rotation.x = -Math.PI / 2;
                centerLine.position.set(x, 0.02, z);
                this.scene.add(centerLine);
            }
        }

        for (let i = 0; i <= gridSize; i++) {
            const x = -halfSize + i * (blockSize + streetWidth) + streetWidth / 2;
            const streetGeo = new THREE.PlaneGeometry(streetWidth, totalSize);
            const street = new THREE.Mesh(streetGeo, asphaltMat);
            street.rotation.x = -Math.PI / 2;
            street.position.set(x, 0.015, 0);
            street.receiveShadow = true;
            this.scene.add(street);

            const lineGeo = new THREE.PlaneGeometry(0.4, totalSize);
            [-streetWidth/2 + 0.5, streetWidth/2 - 0.5].forEach(offset => {
                const line = new THREE.Mesh(lineGeo, lineMat);
                line.rotation.x = -Math.PI / 2;
                line.position.set(x + offset, 0.025, 0);
                this.scene.add(line);
            });

            for (let z = -halfSize; z < halfSize; z += 8) {
                const centerGeo = new THREE.PlaneGeometry(0.3, 4);
                const centerLine = new THREE.Mesh(centerGeo, yellowMat);
                centerLine.rotation.x = -Math.PI / 2;
                centerLine.position.set(x, 0.025, z);
                this.scene.add(centerLine);
            }
        }

        // Semáforos en algunas intersecciones
        for (let row = 0; row <= gridSize; row++) {
            for (let col = 0; col <= gridSize; col++) {
                if (Math.random() < 0.3) {
                    const x = -halfSize + col * (blockSize + streetWidth) + streetWidth / 2;
                    const z = -halfSize + row * (blockSize + streetWidth) + streetWidth / 2;
                    this.createTrafficLight(x + streetWidth / 2 - 1, z + streetWidth / 2 - 1);
                }
            }
        }

        // Manzanas
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const blockX = -halfSize + col * (blockSize + streetWidth) + streetWidth + blockSize / 2;
                const blockZ = -halfSize + row * (blockSize + streetWidth) + streetWidth + blockSize / 2;
                this.createCityBlock(blockX, blockZ, blockSize);
            }
        }

        this.carState.x = streetWidth / 2;
        this.carState.z = streetWidth / 2;
    }

    createTrafficLight(x, z) {
        const group = new THREE.Group();

        // Poste
        const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 5, 8);
        const postMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.y = 2.5;
        group.add(post);

        // Caja
        const boxGeo = new THREE.BoxGeometry(0.6, 1.5, 0.6);
        const boxMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.y = 5.2;
        group.add(box);

        // Luces (rojo, amarillo, verde)
        const lightGeo = new THREE.SphereGeometry(0.18, 8, 8);
        const colors = [0xFF0000, 0xFFAA00, 0x00FF00];
        const lights = [];
        colors.forEach((c, i) => {
            const mat = new THREE.MeshBasicMaterial({ color: c });
            const light = new THREE.Mesh(lightGeo, mat);
            light.position.set(0, 5.7 - i * 0.5, 0.35);
            light.material.opacity = 0.3;
            light.material.transparent = true;
            group.add(light);
            lights.push(light);
        });

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.trafficLights.push({
            lights: lights,
            timer: Math.random() * 100,
            state: 0 // 0=rojo, 1=amarillo, 2=verde
        });
    }

    createCityBlock(centerX, centerZ, size) {
        const halfSize = size / 2 - 2;
        const sidewalkGeo = new THREE.PlaneGeometry(size - 1, size - 1);
        const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xAAAAAA });
        const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
        sidewalk.rotation.x = -Math.PI / 2;
        sidewalk.position.set(centerX, 0.005, centerZ);
        sidewalk.receiveShadow = true;
        this.scene.add(sidewalk);

        const rand = Math.random();
        if (rand < 0.3) {
            this.createPark(centerX, centerZ, halfSize);
        } else if (rand < 0.6) {
            this.createResidentialBlock(centerX, centerZ, halfSize);
        } else {
            this.createCommercialBlock(centerX, centerZ, halfSize);
        }
    }

    createPark(centerX, centerZ, halfSize) {
        const grassGeo = new THREE.PlaneGeometry(halfSize * 1.8, halfSize * 1.8);
        const grassMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(centerX, 0.01, centerZ);
        this.scene.add(grass);

        const numTrees = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numTrees; i++) {
            const tree = this.createTree();
            tree.position.set(
                centerX + (Math.random() - 0.5) * halfSize * 1.5, 0,
                centerZ + (Math.random() - 0.5) * halfSize * 1.5
            );
            tree.scale.setScalar(0.6 + Math.random() * 0.4);
            tree.userData.radius = 2;
            this.trees.push(tree);
            this.scene.add(tree);
        }

        // Bandera en el parque
        if (Math.random() > 0.5) {
            this.createFlag(centerX, centerZ);
        }
    }

    createResidentialBlock(centerX, centerZ, halfSize) {
        const positions = [
            [-halfSize/2, -halfSize/2], [halfSize/2, -halfSize/2],
            [-halfSize/2, halfSize/2], [halfSize/2, halfSize/2]
        ];
        positions.forEach(([ox, oz]) => {
            if (Math.random() > 0.2) {
                const house = this.createHouse();
                house.position.set(centerX + ox, 0, centerZ + oz);
                house.rotation.y = Math.random() * Math.PI * 2;
                house.userData.radius = 5;
                this.buildings.push(house);
                this.scene.add(house);
            }
        });
        if (Math.random() > 0.5) {
            const tree = this.createTree();
            tree.position.set(centerX, 0, centerZ);
            tree.scale.setScalar(0.5);
            tree.userData.radius = 1.5;
            this.trees.push(tree);
            this.scene.add(tree);
        }
    }

    createCommercialBlock(centerX, centerZ, halfSize) {
        const numBuildings = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < numBuildings; i++) {
            const building = this.createBuilding();
            const offsetX = numBuildings > 1 ? (i - 0.5) * halfSize : 0;
            building.position.set(centerX + offsetX, 0, centerZ);
            building.rotation.y = Math.random() * Math.PI / 2;
            building.userData.radius = 6;
            this.buildings.push(building);
            this.scene.add(building);
        }
        // Bandera en edificio comercial
        if (Math.random() > 0.4) {
            this.createFlag(centerX, centerZ);
        }
    }

    createTree() {
        const group = new THREE.Group();
        const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 4, 8);
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2;
        trunk.castShadow = true;
        group.add(trunk);
        const foliageMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const foliage = new THREE.Mesh(new THREE.SphereGeometry(2.5, 8, 8), foliageMat);
        foliage.position.y = 5;
        foliage.castShadow = true;
        group.add(foliage);
        return group;
    }

    createHouse() {
        const group = new THREE.Group();
        const houseColors = [0xFFE4C4, 0xFFF8DC, 0xF5DEB3, 0xFFDAB9, 0xE6E6FA, 0xFFC0CB, 0x98FB98];
        const roofColors = [0x8B4513, 0xA0522D, 0xCD853F, 0xD2691E, 0x800000, 0x2F4F4F];
        const houseColor = houseColors[Math.floor(Math.random() * houseColors.length)];
        const roofColor = roofColors[Math.floor(Math.random() * roofColors.length)];
        const width = 5 + Math.random() * 3;
        const height = 4 + Math.random() * 2;
        const depth = 5 + Math.random() * 3;

        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const bodyMat = new THREE.MeshLambertMaterial({ color: houseColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = height / 2;
        body.castShadow = true;
        group.add(body);

        const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.75, 3, 4);
        const roofMat = new THREE.MeshLambertMaterial({ color: roofColor });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = height + 1.5;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);

        const doorGeo = new THREE.BoxGeometry(1, 2, 0.1);
        const doorMat = new THREE.MeshLambertMaterial({ color: 0x4A3728 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 1, depth / 2 + 0.05);
        group.add(door);

        const windowGeo = new THREE.BoxGeometry(1, 1, 0.1);
        [[-width/3, height * 0.65], [width/3, height * 0.65]].forEach(([x, y]) => {
            const win = new THREE.Mesh(windowGeo, this.windowDayMat);
            win.position.set(x, y, depth / 2 + 0.05);
            group.add(win);
            this.allWindowMeshes.push(win);
        });
        return group;
    }

    createBuilding() {
        const group = new THREE.Group();
        const buildingColors = [
            0x708090, 0x778899, 0xA9A9A9, 0xB0C4DE,
            0x4169E1, 0x6495ED, 0x87CEEB, 0xADD8E6,
            0xDDA0DD, 0xE6E6FA, 0xF0E68C, 0xFAFAD2,
            0x9370DB, 0xBA55D3, 0x00CED1
        ];
        const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];
        const floors = 4 + Math.floor(Math.random() * 8);
        const width = 8 + Math.random() * 6;
        const depth = 8 + Math.random() * 6;
        const floorHeight = 3.5;
        const height = floors * floorHeight;

        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const bodyMat = new THREE.MeshLambertMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = height / 2;
        body.castShadow = true;
        group.add(body);

        const windowGeo = new THREE.BoxGeometry(1, 1.5, 0.1);
        for (let f = 0; f < floors; f++) {
            const y = (f + 0.5) * floorHeight + 0.5;
            for (let w = -1; w <= 1; w++) {
                const mat = Math.random() > 0.3 ? this.windowDayMat : this.windowNightMat;
                const frontWin = new THREE.Mesh(windowGeo, mat);
                frontWin.position.set(w * (width / 3.5), y, depth / 2 + 0.05);
                group.add(frontWin);
                this.allWindowMeshes.push(frontWin);
                const backWin = new THREE.Mesh(windowGeo, mat);
                backWin.position.set(w * (width / 3.5), y, -depth / 2 - 0.05);
                group.add(backWin);
                this.allWindowMeshes.push(backWin);
            }
        }

        if (Math.random() > 0.4) {
            const roofGeo = new THREE.BoxGeometry(width * 0.3, 2, depth * 0.3);
            const roofMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
            const roofStruct = new THREE.Mesh(roofGeo, roofMat);
            roofStruct.position.y = height + 1;
            group.add(roofStruct);
        }
        return group;
    }

    // =====================
    // BANDERAS Y PÁJAROS
    // =====================

    createFlag(x, z) {
        const group = new THREE.Group();
        const poleMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 8, 6);
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 4;
        group.add(pole);

        const flagColors = [0xFF4444, 0x4488FF, 0x44CC44, 0xFFCC00, 0xFF66CC];
        const flagColor = flagColors[Math.floor(Math.random() * flagColors.length)];
        const flagGeo = new THREE.PlaneGeometry(2, 1.2, 8, 1);
        const flagMat = new THREE.MeshLambertMaterial({ color: flagColor, side: THREE.DoubleSide });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(1, 7.5, 0);
        group.add(flag);

        group.position.set(x, 0, z);
        this.scene.add(group);
        this.flags.push({ mesh: flag, baseVertices: flagGeo.attributes.position.array.slice() });
    }

    createBirds() {
        for (let i = 0; i < 12; i++) {
            const bird = this.createBird();
            const { blockSize, streetWidth, gridSize } = this.city;
            const totalSize = (blockSize + streetWidth) * gridSize;
            const halfSize = totalSize / 2;
            bird.position.set(
                (Math.random() - 0.5) * halfSize,
                15 + Math.random() * 15,
                (Math.random() - 0.5) * halfSize
            );
            bird.userData = {
                baseY: bird.position.y,
                phase: Math.random() * Math.PI * 2,
                circleRadius: 10 + Math.random() * 20,
                circleSpeed: 0.3 + Math.random() * 0.5,
                centerX: bird.position.x,
                centerZ: bird.position.z,
                scared: false,
                scaredTimer: 0
            };
            this.birds.push(bird);
            this.scene.add(bird);
        }
    }

    createBird() {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

        // Cuerpo
        const bodyGeo = new THREE.SphereGeometry(0.3, 6, 6);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // Alas (dos planos)
        const wingGeo = new THREE.PlaneGeometry(0.8, 0.3);
        const wingMat = new THREE.MeshLambertMaterial({ color: 0x333333, side: THREE.DoubleSide });
        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        leftWing.position.set(-0.5, 0.1, 0);
        leftWing.rotation.z = 0.3;
        group.add(leftWing);
        const rightWing = new THREE.Mesh(wingGeo, wingMat);
        rightWing.position.set(0.5, 0.1, 0);
        rightWing.rotation.z = -0.3;
        group.add(rightWing);

        group.userData.leftWing = leftWing;
        group.userData.rightWing = rightWing;

        return group;
    }

    updateBirds(dt) {
        const time = Date.now() * 0.001;
        this.birds.forEach(bird => {
            const d = bird.userData;

            // Aleteo
            const wingAngle = Math.sin(time * 8 + d.phase) * 0.5;
            if (bird.userData.leftWing) {
                bird.userData.leftWing.rotation.z = 0.3 + wingAngle;
                bird.userData.rightWing.rotation.z = -0.3 - wingAngle;
            }

            // Verificar distancia al auto
            const dx = bird.position.x - this.carState.x;
            const dz = bird.position.z - this.carState.z;
            const distToCar = Math.sqrt(dx * dx + dz * dz);

            if (distToCar < 20 && !d.scared) {
                d.scared = true;
                d.scaredTimer = 3;
            }

            if (d.scared) {
                // Volar hacia arriba y alejarse del auto
                bird.position.y += 0.15 * dt;
                bird.position.x += (dx / distToCar) * 0.2 * dt;
                bird.position.z += (dz / distToCar) * 0.2 * dt;
                d.scaredTimer -= dt * 0.016;
                if (d.scaredTimer <= 0) {
                    d.scared = false;
                    d.centerX = bird.position.x;
                    d.centerZ = bird.position.z;
                    d.baseY = 15 + Math.random() * 15;
                }
            } else {
                // Volar en círculos
                const angle = time * d.circleSpeed + d.phase;
                bird.position.x = d.centerX + Math.cos(angle) * d.circleRadius;
                bird.position.z = d.centerZ + Math.sin(angle) * d.circleRadius;
                bird.position.y = d.baseY + Math.sin(time * 2 + d.phase) * 1;
                bird.rotation.y = angle + Math.PI / 2;
            }
        });
    }

    updateFlags(dt) {
        const time = Date.now() * 0.003;
        this.flags.forEach(flag => {
            const pos = flag.mesh.geometry.attributes.position;
            const base = flag.baseVertices;
            for (let i = 0; i < pos.count; i++) {
                const x = base[i * 3];
                // Ondulación proporcional a la distancia del poste
                pos.array[i * 3 + 1] = base[i * 3 + 1] + Math.sin(time + x * 3) * 0.15 * (x + 1);
            }
            pos.needsUpdate = true;
        });
    }

    updateTrafficLights(dt) {
        this.trafficLights.forEach(tl => {
            tl.timer -= dt;
            if (tl.timer <= 0) {
                tl.state = (tl.state + 1) % 3;
                tl.timer = tl.state === 1 ? 15 : 40; // Amarillo más corto
                tl.lights.forEach((light, i) => {
                    light.material.opacity = i === tl.state ? 1 : 0.2;
                });
            }
        });
    }

    // =====================
    // CAR
    // =====================

    createCar() {
        const carGroup = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(2.8, 1.1, 4.5);
        const bodyMat = new THREE.MeshLambertMaterial({ color: this.carColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9;
        body.castShadow = true;
        carGroup.add(body);
        this.carBody = body;
        this.carBodyMat = bodyMat;

        const cabinColor = new THREE.Color(this.carColor).multiplyScalar(0.8);
        const cabinGeo = new THREE.BoxGeometry(2.5, 0.9, 2.2);
        const cabinMat = new THREE.MeshLambertMaterial({ color: cabinColor });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.7, -0.3);
        cabin.castShadow = true;
        carGroup.add(cabin);
        this.carCabinMat = cabinMat;

        const windowMat = new THREE.MeshLambertMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.7 });
        const windshieldGeo = new THREE.BoxGeometry(2.3, 0.7, 0.1);
        const windshield = new THREE.Mesh(windshieldGeo, windowMat);
        windshield.position.set(0, 1.7, 0.85);
        carGroup.add(windshield);

        const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 16);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        this.wheels = [];
        [[-1.4, 0.45, 1.5], [1.4, 0.45, 1.5], [-1.4, 0.45, -1.5], [1.4, 0.45, -1.5]].forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            wheel.castShadow = true;
            carGroup.add(wheel);
            this.wheels.push(wheel);
        });

        // Faros delanteros (referenciados para día/noche)
        const lightGeo = new THREE.SphereGeometry(0.22, 8, 8);
        this.headlightMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        [[-0.9, 0.9, 2.25], [0.9, 0.9, 2.25]].forEach(pos => {
            const light = new THREE.Mesh(lightGeo, this.headlightMat);
            light.position.set(...pos);
            carGroup.add(light);
        });

        this.brakeMat = new THREE.MeshBasicMaterial({ color: 0x880000 });
        [[-0.9, 0.9, -2.25], [0.9, 0.9, -2.25]].forEach(pos => {
            const light = new THREE.Mesh(lightGeo, this.brakeMat);
            light.position.set(...pos);
            light.scale.setScalar(0.8);
            carGroup.add(light);
        });

        // Ojos y sonrisa
        const eyeWhiteGeo = new THREE.SphereGeometry(0.28, 16, 16);
        const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const pupilGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        [[-0.55, 1.35, 2.3], [0.55, 1.35, 2.3]].forEach(pos => {
            const white = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
            white.position.set(...pos);
            carGroup.add(white);
            const pupil = new THREE.Mesh(pupilGeo, pupilMat);
            pupil.position.set(pos[0], pos[1], pos[2] + 0.2);
            carGroup.add(pupil);
        });

        const smileGeo = new THREE.TorusGeometry(0.35, 0.06, 8, 16, Math.PI);
        const smileMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        const smile = new THREE.Mesh(smileGeo, smileMat);
        smile.rotation.x = Math.PI;
        smile.position.set(0, 0.75, 2.3);
        carGroup.add(smile);

        carGroup.position.set(this.carState.x, 0, this.carState.z);
        this.car = carGroup;
        this.scene.add(carGroup);
    }

    setCarColor(colorHex) {
        this.carColor = colorHex;
        if (this.carBodyMat) {
            this.carBodyMat.color.setHex(colorHex);
            this.carCabinMat.color.setHex(colorHex);
            this.carCabinMat.color.multiplyScalar(0.8);
        }
    }

    // =====================
    // DIRECTION ARROW
    // =====================

    createDirectionArrow() {
        const arrowGroup = new THREE.Group();
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.85 });

        const coneGeo = new THREE.ConeGeometry(0.8, 2.0, 8);
        const cone = new THREE.Mesh(coneGeo, arrowMat);
        cone.rotation.x = Math.PI / 2;
        cone.position.z = 1.0;
        arrowGroup.add(cone);

        const stalkGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
        const stalk = new THREE.Mesh(stalkGeo, arrowMat);
        stalk.rotation.x = Math.PI / 2;
        stalk.position.z = -0.5;
        arrowGroup.add(stalk);

        const ringGeo = new THREE.TorusGeometry(1.5, 0.15, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xFFD700, transparent: true, opacity: 0.4 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        arrowGroup.add(ring);

        arrowGroup.position.y = 5;
        this.directionArrow = arrowGroup;
        this.scene.add(arrowGroup);
    }

    updateDirectionArrow() {
        if (!this.directionArrow) return;
        let nearest = null;
        let nearestDist = Infinity;
        this.mission.shapes.forEach(shape => {
            if (!shape.visible || shape.userData.collected) return;
            const dx = shape.position.x - this.carState.x;
            const dz = shape.position.z - this.carState.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < nearestDist) { nearestDist = dist; nearest = shape; }
        });

        this.directionArrow.position.x = this.carState.x;
        this.directionArrow.position.z = this.carState.z;
        const time = Date.now() * 0.003;
        this.directionArrow.position.y = 5 + Math.sin(time) * 0.5;

        if (nearest) {
            this.directionArrow.visible = true;
            const angle = Math.atan2(
                nearest.position.x - this.carState.x,
                nearest.position.z - this.carState.z
            );
            this.directionArrow.rotation.y = angle;
        } else {
            this.directionArrow.visible = false;
        }
    }

    createClouds() {
        for (let i = 0; i < 20; i++) {
            const cloud = this.createCloud();
            cloud.position.set(
                (Math.random() - 0.5) * 400,
                35 + Math.random() * 25,
                (Math.random() - 0.5) * 400
            );
            cloud.userData.speed = 0.01 + Math.random() * 0.02;
            this.clouds.push(cloud);
            this.scene.add(cloud);
        }
    }

    createCloud() {
        const group = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        [[0, 0, 0, 3], [2.5, 0.3, 0, 2.5], [-2.5, 0.3, 0, 2.5]].forEach(([x, y, z, r]) => {
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), mat);
            sphere.position.set(x, y, z);
            group.add(sphere);
        });
        return group;
    }

    // =====================
    // NPC CARS
    // =====================

    createNPCCars() {
        this.npcCars = [];
        const carColors = [0x3498db, 0x9b59b6, 0x1abc9c, 0xf39c12, 0xe74c3c, 0x2ecc71, 0x34495e];
        const { blockSize, streetWidth, gridSize } = this.city;
        const totalSize = (blockSize + streetWidth) * gridSize;
        const halfSize = totalSize / 2;
        const numCars = 8 + Math.floor(Math.random() * 5);

        for (let i = 0; i < numCars; i++) {
            const color = carColors[Math.floor(Math.random() * carColors.length)];
            const npcCar = this.createNPCCarMesh(color);
            const isHorizontal = Math.random() > 0.5;
            const streetIndex = Math.floor(Math.random() * (gridSize + 1));
            let x, z, rotation;
            if (isHorizontal) {
                z = -halfSize + streetIndex * (blockSize + streetWidth) + streetWidth / 2;
                x = (Math.random() - 0.5) * totalSize * 0.8;
                rotation = Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
            } else {
                x = -halfSize + streetIndex * (blockSize + streetWidth) + streetWidth / 2;
                z = (Math.random() - 0.5) * totalSize * 0.8;
                rotation = Math.random() > 0.5 ? 0 : Math.PI;
            }
            npcCar.position.set(x, 0, z);
            npcCar.rotation.y = rotation;
            this.scene.add(npcCar);
            this.npcCars.push({
                mesh: npcCar, speed: 0.15 + Math.random() * 0.15,
                direction: rotation, turnTimer: 50 + Math.random() * 100, isHorizontal
            });
        }
    }

    createNPCCarMesh(color) {
        const group = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(2.2, 0.9, 3.5);
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7;
        body.castShadow = true;
        group.add(body);
        const cabinGeo = new THREE.BoxGeometry(2, 0.7, 1.8);
        const cabinMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).multiplyScalar(0.8) });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.35, -0.2);
        group.add(cabin);
        const windowMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const windshieldGeo = new THREE.BoxGeometry(1.8, 0.5, 0.1);
        const windshield = new THREE.Mesh(windshieldGeo, windowMat);
        windshield.position.set(0, 1.35, 0.7);
        group.add(windshield);
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        [[-1.1, 0.35, 1.1], [1.1, 0.35, 1.1], [-1.1, 0.35, -1.1], [1.1, 0.35, -1.1]].forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            group.add(wheel);
        });
        const lightGeo = new THREE.SphereGeometry(0.15, 6, 6);
        [[-0.7, 0.7, 1.75], [0.7, 0.7, 1.75]].forEach(pos => {
            const l = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xFFFFCC }));
            l.position.set(...pos);
            group.add(l);
        });
        [[-0.7, 0.7, -1.75], [0.7, 0.7, -1.75]].forEach(pos => {
            const l = new THREE.Mesh(lightGeo, new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
            l.position.set(...pos);
            group.add(l);
        });
        return group;
    }

    updateNPCCars(dt) {
        if (!this.npcCars) return;
        const { blockSize, streetWidth, gridSize } = this.city;
        const totalSize = (blockSize + streetWidth) * gridSize;
        const halfSize = totalSize / 2;
        this.npcCars.forEach(npc => {
            npc.mesh.position.x += Math.sin(npc.direction) * npc.speed * dt;
            npc.mesh.position.z += Math.cos(npc.direction) * npc.speed * dt;
            npc.turnTimer -= dt;
            if (npc.turnTimer <= 0) {
                const rand = Math.random();
                if (rand < 0.3) { npc.direction -= Math.PI / 2; npc.isHorizontal = !npc.isHorizontal; }
                else if (rand < 0.6) { npc.direction += Math.PI / 2; npc.isHorizontal = !npc.isHorizontal; }
                npc.mesh.rotation.y = npc.direction;
                npc.turnTimer = 40 + Math.random() * 80;
            }
            if (npc.mesh.position.x > halfSize + 20) npc.mesh.position.x = -halfSize - 10;
            if (npc.mesh.position.x < -halfSize - 20) npc.mesh.position.x = halfSize + 10;
            if (npc.mesh.position.z > halfSize + 20) npc.mesh.position.z = -halfSize - 10;
            if (npc.mesh.position.z < -halfSize - 20) npc.mesh.position.z = halfSize + 10;
        });
    }

    // =====================
    // SHAPES (COLLECTIBLES)
    // =====================

    createShapes() {
        const { blockSize, streetWidth, gridSize } = this.city;
        const totalSize = (blockSize + streetWidth) * gridSize;
        const halfSize = totalSize / 2;
        const shapeTypes = ['circle', 'square', 'triangle'];
        const colors = { circle: 0xFF6B6B, square: 0x4ECDC4, triangle: 0xFFE66D };
        const emojis = { circle: '🔴', square: '🟦', triangle: '🔺' };

        for (let row = 0; row <= gridSize; row++) {
            for (let col = 0; col <= gridSize; col++) {
                if (Math.random() < 0.4) {
                    const x = -halfSize + col * (blockSize + streetWidth) + streetWidth / 2;
                    const z = -halfSize + row * (blockSize + streetWidth) + streetWidth / 2;
                    const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
                    const shape = this.createShape(shapeType, colors[shapeType]);
                    shape.position.set(x, 2.0, z);
                    shape.userData = { type: shapeType, collected: false, emoji: emojis[shapeType] };
                    this.mission.shapes.push(shape);
                    this.scene.add(shape);
                }
            }
        }
    }

    createShape(type, color) {
        const group = new THREE.Group();
        let geometry;
        switch (type) {
            case 'circle': geometry = new THREE.SphereGeometry(2.5, 32, 32); break;
            case 'square': geometry = new THREE.BoxGeometry(3.5, 3.5, 3.5); break;
            case 'triangle': geometry = new THREE.TetrahedronGeometry(3.0); break;
        }
        const material = new THREE.MeshPhongMaterial({
            color, emissive: color, emissiveIntensity: 0.6, shininess: 100, specular: 0xFFFFFF
        });
        group.add(new THREE.Mesh(geometry, material));
        const ringGeo = new THREE.TorusGeometry(4.0, 0.3, 16, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        group.add(ring);
        const ring2 = ring.clone();
        ring2.rotation.x = Math.PI / 2;
        group.add(ring2);
        return group;
    }

    checkShapeCollection() {
        const carX = this.carState.x;
        const carZ = this.carState.z;
        this.mission.shapes.forEach(shape => {
            if (shape.userData.collected || !shape.visible) return;
            const dx = carX - shape.position.x;
            const dz = carZ - shape.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 4) {
                shape.userData.collected = true;
                shape.visible = false;
                this.mission.score += 1;
                this.playCollectSound();
                this.showCollectEffect(shape.userData.emoji);
                const scoreEl = document.getElementById('score-number');
                if (scoreEl) scoreEl.textContent = this.mission.score;

                // Celebración por hito (cada 5 estrellas)
                if (this.mission.score % 5 === 0) {
                    this.showMilestone(this.mission.score);
                    this.playCelebrationSound();
                }

                // Regenerar si se recolectaron todas
                const remaining = this.mission.shapes.filter(s => !s.userData.collected);
                if (remaining.length === 0) {
                    this.showCelebration();
                    this.playCelebrationSound();
                    setTimeout(() => {
                        this.mission.shapes.forEach(s => { s.userData.collected = false; s.visible = true; });
                    }, 1500);
                }
            }
        });
    }

    showCollectEffect(emoji) {
        const effect = document.createElement('div');
        effect.className = 'collect-effect';
        effect.textContent = emoji || '⭐';
        document.body.appendChild(effect);
        setTimeout(() => effect.remove(), 800);
    }

    showCelebration() {
        const emojis = ['🎉', '⭐', '🌟', '✨', '🎊', '🏆'];
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const effect = document.createElement('div');
                effect.style.cssText = `
                    position:fixed; top:${20 + Math.random() * 60}%; left:${10 + Math.random() * 80}%;
                    font-size:${50 + Math.random() * 40}px; animation:collectPop 1s ease-out forwards;
                    z-index:1000; pointer-events:none;
                `;
                effect.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                document.body.appendChild(effect);
                setTimeout(() => effect.remove(), 1000);
            }, i * 100);
        }
    }

    showMilestone(score) {
        const text = document.createElement('div');
        text.className = 'milestone-text';
        text.textContent = `🏆 ¡${score} Estrellas! 🏆`;
        document.body.appendChild(text);
        setTimeout(() => text.remove(), 2000);
        // Lluvia de emojis pequeña
        this.showCelebration();
    }

    updateShapes(dt) {
        const time = Date.now() * 0.002;
        this.mission.shapes.forEach((shape, i) => {
            if (shape.visible) {
                shape.rotation.y += 0.02 * dt;
                shape.position.y = 0.5 + Math.sin(time + i) * 0.2;
            }
        });
    }

    // =====================
    // COLLISIONS (bouncy, no damage)
    // =====================

    checkCollisions() {
        const carRadius = 2.5;
        let collided = false;

        const bounceOff = (obj) => {
            const dx = this.carState.x - obj.position.x;
            const dz = this.carState.z - obj.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const scale = obj.scale?.x || 1;
            const minDist = carRadius + (obj.userData.radius || 3) * scale;
            if (dist < minDist) {
                const overlap = minDist - dist;
                const angle = Math.atan2(dx, dz);
                this.carState.x += Math.sin(angle) * overlap * 1.1;
                this.carState.z += Math.cos(angle) * overlap * 1.1;
                this.carState.speed *= 0.3;
                collided = true;
            }
        };

        this.trees.forEach(tree => bounceOff(tree));
        this.buildings.forEach(building => bounceOff(building));
        if (this.npcCars) {
            this.npcCars.forEach(npc => {
                const dx = this.carState.x - npc.mesh.position.x;
                const dz = this.carState.z - npc.mesh.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < carRadius + 2.5) {
                    const overlap = carRadius + 2.5 - dist;
                    const angle = Math.atan2(dx, dz);
                    this.carState.x += Math.sin(angle) * overlap * 1.1;
                    this.carState.z += Math.cos(angle) * overlap * 1.1;
                    this.carState.speed *= 0.3;
                    collided = true;
                }
            });
        }

        if (collided) {
            this.playBounceSound();
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(50);
        }
    }

    // =====================
    // MAP BOUNDARIES
    // =====================

    enforceMapBounds() {
        const { blockSize, streetWidth, gridSize } = this.city;
        const totalSize = (blockSize + streetWidth) * gridSize;
        const limit = totalSize / 2 + 10; // Pequeño margen

        let bounced = false;
        if (this.carState.x > limit) { this.carState.x = limit; this.carState.speed *= 0.3; bounced = true; }
        if (this.carState.x < -limit) { this.carState.x = -limit; this.carState.speed *= 0.3; bounced = true; }
        if (this.carState.z > limit) { this.carState.z = limit; this.carState.speed *= 0.3; bounced = true; }
        if (this.carState.z < -limit) { this.carState.z = -limit; this.carState.speed *= 0.3; bounced = true; }

        if (bounced) {
            this.playBounceSound();
            if (navigator.vibrate) navigator.vibrate(30);
        }
    }

    // =====================
    // DAY/NIGHT CYCLE
    // =====================

    updateDayNight(dt) {
        const dn = this.dayNight;
        dn.time += dn.speed * dt * 0.016;
        if (dn.time > 1) dn.time -= 1;

        // Calcular intensidad de luz solar (0=noche, 1=mediodía)
        const sunIntensity = Math.max(0, Math.cos((dn.time - 0.25) * Math.PI * 2));

        // Color del cielo
        const dayColor = new THREE.Color(0x87CEEB);
        const sunsetColor = new THREE.Color(0xFF7744);
        const nightColor = new THREE.Color(0x0a0a2e);

        let skyColor;
        if (sunIntensity > 0.3) {
            skyColor = dayColor.clone().lerp(sunsetColor, Math.max(0, 1 - sunIntensity * 2));
        } else {
            skyColor = sunsetColor.clone().lerp(nightColor, 1 - sunIntensity / 0.3);
        }

        this.scene.background = skyColor;
        this.scene.fog.color = skyColor;

        // Luces
        dn.ambientLight.intensity = 0.2 + sunIntensity * 0.5;
        dn.dirLight.intensity = sunIntensity * 0.8;

        // Ventanas: de noche se iluminan
        const isNight = sunIntensity < 0.3;
        const targetMat = isNight ? this.windowNightMat : this.windowDayMat;
        // Solo cambiar si es diferente (optimización)
        if (this.allWindowMeshes.length > 0 && this.allWindowMeshes[0].material !== targetMat) {
            this.allWindowMeshes.forEach(w => { w.material = targetMat; });
        }

        // Faros del auto
        if (this.headlightMat) {
            this.headlightMat.color.setHex(isNight ? 0xFFFF88 : 0xFFFF00);
            // Emissive-like brightness for headlights at night handled by MeshBasicMaterial
        }

        // Indicador de tiempo
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            if (dn.time < 0.2) timeDisplay.textContent = '🌅';      // Amanecer
            else if (dn.time < 0.4) timeDisplay.textContent = '☀️';  // Mañana/Mediodía
            else if (dn.time < 0.55) timeDisplay.textContent = '🌇'; // Atardecer
            else if (dn.time < 0.8) timeDisplay.textContent = '🌙';  // Noche
            else timeDisplay.textContent = '🌌';                      // Noche profunda
        }
    }

    // =====================
    // CONTROLS
    // =====================

    setupControls() {
        const leftZone = document.getElementById('touch-left');
        const rightZone = document.getElementById('touch-right');
        const brakeZone = document.getElementById('touch-brake');
        const hornBtn = document.getElementById('touch-horn');

        const setup = (btn, key) => {
            if (!btn) return;
            ['touchstart', 'mousedown'].forEach(e => {
                btn.addEventListener(e, (ev) => {
                    ev.preventDefault();
                    this.controls[key] = true;
                    btn.classList.add('pressed');
                });
            });
            ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(e => {
                btn.addEventListener(e, () => {
                    this.controls[key] = false;
                    btn.classList.remove('pressed');
                });
            });
        };

        setup(leftZone, 'turningLeft');
        setup(rightZone, 'turningRight');
        setup(brakeZone, 'braking');

        // Bocina
        if (hornBtn) {
            ['touchstart', 'mousedown'].forEach(e => {
                hornBtn.addEventListener(e, (ev) => {
                    ev.preventDefault();
                    hornBtn.classList.add('pressed');
                    this.initAudio();
                    this.playHornSound();
                    if (navigator.vibrate) navigator.vibrate(80);
                });
            });
            ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(e => {
                hornBtn.addEventListener(e, () => hornBtn.classList.remove('pressed'));
            });
        }

        // Teclado
        const keys = {
            ArrowDown: 'braking', s: 'braking', S: 'braking',
            ArrowLeft: 'turningLeft', a: 'turningLeft', A: 'turningLeft',
            ArrowRight: 'turningRight', d: 'turningRight', D: 'turningRight'
        };
        window.addEventListener('keydown', (e) => {
            if (keys[e.key]) this.controls[keys[e.key]] = true;
            if (e.key === ' ') { this.initAudio(); this.playHornSound(); }
        });
        window.addEventListener('keyup', (e) => {
            if (keys[e.key]) this.controls[keys[e.key]] = false;
        });
    }

    setupGyroscope() {
        const requestPermission = () => {
            if (typeof DeviceOrientationEvent !== 'undefined' &&
                typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(response => { if (response === 'granted') this.enableGyroscope(); })
                    .catch(console.error);
            } else {
                this.enableGyroscope();
            }
        };
        document.addEventListener('touchstart', () => requestPermission(), { once: true });
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission !== 'function') {
            this.enableGyroscope();
        }
    }

    enableGyroscope() {
        window.addEventListener('deviceorientation', (e) => {
            if (e.gamma !== null) {
                this.gyro.gamma = e.gamma;
                if (!this.gyro.enabled) {
                    this.gyro.enabled = true;
                    const indicator = document.createElement('div');
                    indicator.className = 'gyro-indicator';
                    indicator.innerHTML = '<div class="gyro-dot"></div> 📱';
                    document.getElementById('game-container').appendChild(indicator);
                }
            }
        });
    }

    // =====================
    // COLOR PICKER
    // =====================

    setupColorPicker() {
        const options = document.querySelectorAll('.color-option');
        options.forEach(opt => {
            const handler = (e) => {
                e.preventDefault();
                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                const colorStr = opt.getAttribute('data-color');
                this.setCarColor(parseInt(colorStr));
            };
            opt.addEventListener('click', handler);
            opt.addEventListener('touchstart', handler);
        });
    }

    // =====================
    // START SCREEN
    // =====================

    setupStartScreen() {
        const startScreen = document.getElementById('start-screen');
        const startButton = document.getElementById('start-button');
        if (!startScreen || !startButton) return;
        const startGame = (e) => {
            e.preventDefault();
            startScreen.classList.add('hidden');
            this.initAudio();
            this.start();
        };
        startButton.addEventListener('click', startGame);
        startButton.addEventListener('touchstart', startGame);
    }

    start() {
        this.isRunning = true;
        this.clock.start();
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.gameLoop());
        const delta = this.clock.getDelta();
        this.update(delta);
        this.render();
    }

    update(delta) {
        const dt = Math.min(delta, 0.1) * 60;
        this.updateCar(dt);
        this.updateNPCCars(dt);
        this.checkCollisions();
        this.enforceMapBounds();
        this.checkShapeCollection();
        this.updateShapes(dt);
        this.updateDirectionArrow();
        this.updateCamera();
        this.updateClouds(dt);
        this.updateEngineSound();
        this.updateDayNight(dt);
        this.updateTrafficLights(dt);
        this.updateFlags(dt);
        this.updateBirds(dt);
    }

    updateCar(dt) {
        const state = this.carState;
        const ctrl = this.controls;

        if (ctrl.braking) {
            if (state.speed > 0) {
                state.speed -= state.brakeForce * dt;
                if (state.speed < 0) state.speed = 0;
            } else {
                state.speed -= state.acceleration * 0.4 * dt;
                if (state.speed < state.maxReverseSpeed) state.speed = state.maxReverseSpeed;
            }
        } else {
            if (state.speed < state.maxSpeed) {
                state.speed += state.acceleration * dt;
                if (state.speed > state.maxSpeed) state.speed = state.maxSpeed;
            }
        }

        const minTurnSpeed = 0.005;
        if (Math.abs(state.speed) > minTurnSpeed) {
            const turnFactor = state.speed > 0 ? 1 : -1;
            if (this.gyro.enabled) {
                const gamma = this.gyro.gamma;
                if (Math.abs(gamma) > this.gyro.deadZone) {
                    const gyroInput = (gamma > 0 ? gamma - this.gyro.deadZone : gamma + this.gyro.deadZone);
                    state.rotation -= gyroInput * this.gyro.sensitivity * turnFactor * dt;
                }
            }
            if (ctrl.turningLeft) state.rotation += state.turnSpeed * turnFactor * dt;
            if (ctrl.turningRight) state.rotation -= state.turnSpeed * turnFactor * dt;
        }

        state.x += Math.sin(state.rotation) * state.speed * dt;
        state.z += Math.cos(state.rotation) * state.speed * dt;
        this.car.position.x = state.x;
        this.car.position.z = state.z;
        this.car.rotation.y = state.rotation;

        let targetTilt = 0;
        if (ctrl.turningLeft || (this.gyro.enabled && this.gyro.gamma < -this.gyro.deadZone)) targetTilt = 0.1;
        if (ctrl.turningRight || (this.gyro.enabled && this.gyro.gamma > this.gyro.deadZone)) targetTilt = -0.1;
        state.tilt += (targetTilt - state.tilt) * 0.1;
        this.car.rotation.z = state.tilt * Math.abs(state.speed);

        this.wheels.forEach(wheel => { wheel.rotation.x += state.speed * dt * 2; });
        this.brakeMat.color.setHex(ctrl.braking ? 0xFF0000 : 0x880000);
    }

    updateCamera() {
        const state = this.carState;
        const targetX = state.x - Math.sin(state.rotation) * 15;
        const targetZ = state.z - Math.cos(state.rotation) * 15;
        this.camera.position.x += (targetX - this.camera.position.x) * 0.08;
        this.camera.position.y = 10;
        this.camera.position.z += (targetZ - this.camera.position.z) * 0.08;
        this.camera.lookAt(state.x, 1.5, state.z);
    }

    updateClouds(dt) {
        this.clouds.forEach(cloud => {
            cloud.position.x += cloud.userData.speed * dt;
            if (cloud.position.x > 200) cloud.position.x = -200;
        });
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

window.addEventListener('load', () => new CarGame3D());
