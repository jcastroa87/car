// ============================================
// 🚗 JUEGO DE CARROS 3D - CIUDAD CON CALLES
// Con cuadrícula de calles, intersecciones, casas y edificios
// ============================================

class CarGame3D {
    constructor() {
        this.container = document.getElementById('game-canvas');
        
        // Three.js
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Objetos
        this.car = null;
        this.trees = [];
        this.buildings = [];
        this.clouds = [];
        
        // Estado
        this.isRunning = false;
        this.clock = new THREE.Clock();
        
        // Física del auto - Rotación 360°
        this.carState = {
            x: 0,
            z: 0,
            rotation: 0,
            speed: 0,
            maxSpeed: 0.35,        // Muy lento para niños (era 0.8)
            maxReverseSpeed: -0.2, // Lento en reversa
            acceleration: 0.006,   // Aceleración suave (era 0.015)
            brakeForce: 0.03,
            friction: 0.005,
            turnSpeed: 0.03,       // Giro suave
            tilt: 0
        };
        
        // Sistema de daño
        this.health = 100;
        this.maxHealth = 100;
        this.lastDamageTime = 0;
        
        // Controles
        this.controls = {
            accelerating: false,
            braking: false,
            turningLeft: false,
            turningRight: false
        };
        
        // Configuración de la ciudad
        this.city = {
            blockSize: 40,
            streetWidth: 12,
            gridSize: 8,
            blocks: []
        };
        
        // Sistema de misiones - Formas coleccionables
        this.mission = {
            shapes: [],           // Formas en el mapa
            collected: 0,         // Formas recolectadas
            target: 0,            // Objetivo de la misión
            currentShape: '',     // Forma actual a buscar
            score: 0              // Puntuación total
        };
        
        // Audio
        this.audioContext = null;
        this.audioInitialized = false;
        
        this.init();
    }
    
    init() {
        this.setupThreeJS();
        this.createScene();
        this.setupControls();
        this.setupStartScreen();
        this.onWindowResize();
        
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupThreeJS() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 80, 250);
        
        this.camera = new THREE.PerspectiveCamera(
            70, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            400
        );
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
        
        // Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 80, 50);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
    }
    
    createScene() {
        this.createGround();
        this.createCityGrid();
        this.createCar();
        this.createNPCCars();
        this.createShapes();      // Formas coleccionables
        this.createClouds();
        this.createHealthBar();
        this.createMissionUI();   // UI de misión
        this.startNewMission();   // Iniciar primera misión
    }
    
    createGround() {
        // Césped base
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
        
        // Materiales
        const asphaltMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
        const lineMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const yellowMat = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
        
        // Crear calles horizontales (Este-Oeste)
        for (let i = 0; i <= gridSize; i++) {
            const z = -halfSize + i * (blockSize + streetWidth) + streetWidth / 2;
            
            // Asfalto de la calle
            const streetGeo = new THREE.PlaneGeometry(totalSize, streetWidth);
            const street = new THREE.Mesh(streetGeo, asphaltMat);
            street.rotation.x = -Math.PI / 2;
            street.position.set(0, 0.01, z);
            street.receiveShadow = true;
            this.scene.add(street);
            
            // Líneas blancas laterales
            const lineGeo = new THREE.PlaneGeometry(totalSize, 0.4);
            [-streetWidth/2 + 0.5, streetWidth/2 - 0.5].forEach(offset => {
                const line = new THREE.Mesh(lineGeo, lineMat);
                line.rotation.x = -Math.PI / 2;
                line.position.set(0, 0.02, z + offset);
                this.scene.add(line);
            });
            
            // Línea central amarilla discontinua
            for (let x = -halfSize; x < halfSize; x += 8) {
                const centerGeo = new THREE.PlaneGeometry(4, 0.3);
                const centerLine = new THREE.Mesh(centerGeo, yellowMat);
                centerLine.rotation.x = -Math.PI / 2;
                centerLine.position.set(x, 0.02, z);
                this.scene.add(centerLine);
            }
        }
        
        // Crear calles verticales (Norte-Sur)
        for (let i = 0; i <= gridSize; i++) {
            const x = -halfSize + i * (blockSize + streetWidth) + streetWidth / 2;
            
            // Asfalto de la calle
            const streetGeo = new THREE.PlaneGeometry(streetWidth, totalSize);
            const street = new THREE.Mesh(streetGeo, asphaltMat);
            street.rotation.x = -Math.PI / 2;
            street.position.set(x, 0.015, 0);
            street.receiveShadow = true;
            this.scene.add(street);
            
            // Líneas blancas laterales
            const lineGeo = new THREE.PlaneGeometry(0.4, totalSize);
            [-streetWidth/2 + 0.5, streetWidth/2 - 0.5].forEach(offset => {
                const line = new THREE.Mesh(lineGeo, lineMat);
                line.rotation.x = -Math.PI / 2;
                line.position.set(x + offset, 0.025, 0);
                this.scene.add(line);
            });
            
            // Línea central amarilla discontinua
            for (let z = -halfSize; z < halfSize; z += 8) {
                const centerGeo = new THREE.PlaneGeometry(0.3, 4);
                const centerLine = new THREE.Mesh(centerGeo, yellowMat);
                centerLine.rotation.x = -Math.PI / 2;
                centerLine.position.set(x, 0.025, z);
                this.scene.add(centerLine);
            }
        }
        
        // Crear manzanas con edificios y casas
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const blockX = -halfSize + col * (blockSize + streetWidth) + streetWidth + blockSize / 2;
                const blockZ = -halfSize + row * (blockSize + streetWidth) + streetWidth + blockSize / 2;
                
                this.createCityBlock(blockX, blockZ, blockSize);
            }
        }
        
        // Posicionar el auto en una intersección
        this.carState.x = streetWidth / 2;
        this.carState.z = streetWidth / 2;
    }
    
    createCityBlock(centerX, centerZ, size) {
        const halfSize = size / 2 - 2; // Margen para aceras
        
        // Acera alrededor de la manzana
        const sidewalkGeo = new THREE.PlaneGeometry(size - 1, size - 1);
        const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0xAAAAAA });
        const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
        sidewalk.rotation.x = -Math.PI / 2;
        sidewalk.position.set(centerX, 0.005, centerZ);
        sidewalk.receiveShadow = true;
        this.scene.add(sidewalk);
        
        // Decidir qué tipo de manzana crear
        const rand = Math.random();
        
        if (rand < 0.3) {
            // Parque con árboles
            this.createPark(centerX, centerZ, halfSize);
        } else if (rand < 0.6) {
            // Zona residencial con casas
            this.createResidentialBlock(centerX, centerZ, halfSize);
        } else {
            // Zona comercial con edificios
            this.createCommercialBlock(centerX, centerZ, halfSize);
        }
    }
    
    createPark(centerX, centerZ, halfSize) {
        // Césped del parque
        const grassGeo = new THREE.PlaneGeometry(halfSize * 1.8, halfSize * 1.8);
        const grassMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.set(centerX, 0.01, centerZ);
        this.scene.add(grass);
        
        // Árboles en el parque
        const numTrees = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numTrees; i++) {
            const tree = this.createTree();
            tree.position.set(
                centerX + (Math.random() - 0.5) * halfSize * 1.5,
                0,
                centerZ + (Math.random() - 0.5) * halfSize * 1.5
            );
            tree.scale.setScalar(0.6 + Math.random() * 0.4);
            tree.userData.radius = 2;
            this.trees.push(tree);
            this.scene.add(tree);
        }
    }
    
    createResidentialBlock(centerX, centerZ, halfSize) {
        // 4 casas en cada esquina
        const positions = [
            [-halfSize/2, -halfSize/2],
            [halfSize/2, -halfSize/2],
            [-halfSize/2, halfSize/2],
            [halfSize/2, halfSize/2]
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
        
        // Algunos árboles decorativos
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
        // Edificios grandes
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
    }
    
    createTree() {
        const group = new THREE.Group();
        
        // Tronco
        const trunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 4, 8);
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2;
        trunk.castShadow = true;
        group.add(trunk);
        
        // Copa
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
        
        // Cuerpo
        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const bodyMat = new THREE.MeshLambertMaterial({ color: houseColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = height / 2;
        body.castShadow = true;
        group.add(body);
        
        // Techo
        const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.75, 3, 4);
        const roofMat = new THREE.MeshLambertMaterial({ color: roofColor });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = height + 1.5;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);
        
        // Puerta
        const doorGeo = new THREE.BoxGeometry(1, 2, 0.1);
        const doorMat = new THREE.MeshLambertMaterial({ color: 0x4A3728 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 1, depth / 2 + 0.05);
        group.add(door);
        
        // Ventanas
        const windowGeo = new THREE.BoxGeometry(1, 1, 0.1);
        const windowMat = new THREE.MeshLambertMaterial({ color: 0x87CEEB });
        
        [[-width/3, height * 0.65], [width/3, height * 0.65]].forEach(([x, y]) => {
            const win = new THREE.Mesh(windowGeo, windowMat);
            win.position.set(x, y, depth / 2 + 0.05);
            group.add(win);
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
        
        // Cuerpo
        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const bodyMat = new THREE.MeshLambertMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = height / 2;
        body.castShadow = true;
        group.add(body);
        
        // Ventanas
        const windowGeo = new THREE.BoxGeometry(1, 1.5, 0.1);
        const windowMat = new THREE.MeshBasicMaterial({ color: 0x87CEEB });
        const windowLitMat = new THREE.MeshBasicMaterial({ color: 0xFFFF99 });
        
        for (let f = 0; f < floors; f++) {
            const y = (f + 0.5) * floorHeight + 0.5;
            
            for (let w = -1; w <= 1; w++) {
                const mat = Math.random() > 0.3 ? windowMat : windowLitMat;
                
                const frontWin = new THREE.Mesh(windowGeo, mat);
                frontWin.position.set(w * (width / 3.5), y, depth / 2 + 0.05);
                group.add(frontWin);
                
                const backWin = new THREE.Mesh(windowGeo, mat);
                backWin.position.set(w * (width / 3.5), y, -depth / 2 - 0.05);
                group.add(backWin);
            }
        }
        
        // Estructura en el techo
        if (Math.random() > 0.4) {
            const roofGeo = new THREE.BoxGeometry(width * 0.3, 2, depth * 0.3);
            const roofMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
            const roofStruct = new THREE.Mesh(roofGeo, roofMat);
            roofStruct.position.y = height + 1;
            group.add(roofStruct);
        }
        
        return group;
    }
    
    createCar() {
        const carGroup = new THREE.Group();
        
        // Cuerpo
        const bodyGeo = new THREE.BoxGeometry(2.8, 1.1, 4.5);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xFF4444 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9;
        body.castShadow = true;
        carGroup.add(body);
        this.carBody = body;
        
        // Cabina
        const cabinGeo = new THREE.BoxGeometry(2.5, 0.9, 2.2);
        const cabinMat = new THREE.MeshLambertMaterial({ color: 0xCC3333 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.7, -0.3);
        cabin.castShadow = true;
        carGroup.add(cabin);
        
        // Ventanas
        const windowMat = new THREE.MeshLambertMaterial({ 
            color: 0x87CEEB, transparent: true, opacity: 0.7 
        });
        const windshieldGeo = new THREE.BoxGeometry(2.3, 0.7, 0.1);
        const windshield = new THREE.Mesh(windshieldGeo, windowMat);
        windshield.position.set(0, 1.7, 0.85);
        carGroup.add(windshield);
        
        // Ruedas
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
        
        // Luces delanteras
        const lightGeo = new THREE.SphereGeometry(0.22, 8, 8);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        [[-0.9, 0.9, 2.25], [0.9, 0.9, 2.25]].forEach(pos => {
            const light = new THREE.Mesh(lightGeo, lightMat);
            light.position.set(...pos);
            carGroup.add(light);
        });
        
        // Luces traseras
        this.brakeMat = new THREE.MeshBasicMaterial({ color: 0x880000 });
        [[-0.9, 0.9, -2.25], [0.9, 0.9, -2.25]].forEach(pos => {
            const light = new THREE.Mesh(lightGeo, this.brakeMat);
            light.position.set(...pos);
            light.scale.setScalar(0.8);
            carGroup.add(light);
        });
        
        // Ojos
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
        
        // Sonrisa
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
    // AUTOS NPC (TRÁFICO)
    // =====================
    
    createNPCCars() {
        this.npcCars = [];
        
        const carColors = [0x3498db, 0x9b59b6, 0x1abc9c, 0xf39c12, 0xe74c3c, 0x2ecc71, 0x34495e];
        const { blockSize, streetWidth, gridSize } = this.city;
        const totalSize = (blockSize + streetWidth) * gridSize;
        const halfSize = totalSize / 2;
        
        // Crear 8-12 autos NPC
        const numCars = 8 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < numCars; i++) {
            const color = carColors[Math.floor(Math.random() * carColors.length)];
            const npcCar = this.createNPCCarMesh(color);
            
            // Posición inicial en una calle aleatoria
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
                mesh: npcCar,
                speed: 0.15 + Math.random() * 0.15,
                direction: rotation,
                turnTimer: 50 + Math.random() * 100,
                isHorizontal: isHorizontal
            });
        }
    }
    
    createNPCCarMesh(color) {
        const group = new THREE.Group();
        
        // Cuerpo más pequeño
        const bodyGeo = new THREE.BoxGeometry(2.2, 0.9, 3.5);
        const bodyMat = new THREE.MeshLambertMaterial({ color: color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7;
        body.castShadow = true;
        group.add(body);
        
        // Cabina
        const cabinGeo = new THREE.BoxGeometry(2, 0.7, 1.8);
        const cabinMat = new THREE.MeshLambertMaterial({ color: color * 0.8 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.35, -0.2);
        group.add(cabin);
        
        // Ventanas
        const windowMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const windshieldGeo = new THREE.BoxGeometry(1.8, 0.5, 0.1);
        const windshield = new THREE.Mesh(windshieldGeo, windowMat);
        windshield.position.set(0, 1.35, 0.7);
        group.add(windshield);
        
        // Ruedas
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        
        [[-1.1, 0.35, 1.1], [1.1, 0.35, 1.1], [-1.1, 0.35, -1.1], [1.1, 0.35, -1.1]].forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            group.add(wheel);
        });
        
        // Luces
        const lightGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const headlightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFCC });
        const taillightMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        
        [[-0.7, 0.7, 1.75], [0.7, 0.7, 1.75]].forEach(pos => {
            const light = new THREE.Mesh(lightGeo, headlightMat);
            light.position.set(...pos);
            group.add(light);
        });
        
        [[-0.7, 0.7, -1.75], [0.7, 0.7, -1.75]].forEach(pos => {
            const light = new THREE.Mesh(lightGeo, taillightMat);
            light.position.set(...pos);
            group.add(light);
        });
        
        return group;
    }
    
    updateNPCCars(dt) {
        if (!this.npcCars) return;
        
        const { blockSize, streetWidth, gridSize } = this.city;
        const totalSize = (blockSize + streetWidth) * gridSize;
        const halfSize = totalSize / 2;
        
        this.npcCars.forEach(npc => {
            // Mover el auto
            const moveX = Math.sin(npc.direction) * npc.speed * dt;
            const moveZ = Math.cos(npc.direction) * npc.speed * dt;
            
            npc.mesh.position.x += moveX;
            npc.mesh.position.z += moveZ;
            
            // Rotar las ruedas (animación)
            npc.mesh.children.forEach(child => {
                if (child.geometry && child.geometry.type === 'CylinderGeometry') {
                    child.rotation.x += npc.speed * dt * 2;
                }
            });
            
            // Verificar si llegó a una intersección
            npc.turnTimer -= dt;
            
            if (npc.turnTimer <= 0) {
                // En una intersección, decidir si girar
                const rand = Math.random();
                
                if (rand < 0.3) {
                    // Girar a la derecha
                    npc.direction -= Math.PI / 2;
                    npc.isHorizontal = !npc.isHorizontal;
                } else if (rand < 0.6) {
                    // Girar a la izquierda
                    npc.direction += Math.PI / 2;
                    npc.isHorizontal = !npc.isHorizontal;
                }
                // else seguir recto
                
                npc.mesh.rotation.y = npc.direction;
                npc.turnTimer = 40 + Math.random() * 80;
            }
            
            // Wrap around - si sale del mapa, aparece del otro lado
            if (npc.mesh.position.x > halfSize + 20) npc.mesh.position.x = -halfSize - 10;
            if (npc.mesh.position.x < -halfSize - 20) npc.mesh.position.x = halfSize + 10;
            if (npc.mesh.position.z > halfSize + 20) npc.mesh.position.z = -halfSize - 10;
            if (npc.mesh.position.z < -halfSize - 20) npc.mesh.position.z = halfSize + 10;
        });
    }
    
    createHealthBar() {
        const healthContainer = document.createElement('div');
        healthContainer.id = 'health-container';
        healthContainer.innerHTML = `
            <div class="health-label">❤️ VIDA</div>
            <div class="health-bar-bg">
                <div id="health-bar-fill" class="health-bar-fill"></div>
            </div>
        `;
        document.getElementById('game-container').appendChild(healthContainer);
        
        const style = document.createElement('style');
        style.textContent = `
            #health-container {
                position: absolute;
                top: 15px;
                left: 15px;
                z-index: 50;
            }
            .health-label {
                font-size: 14px;
                font-weight: bold;
                color: white;
                text-shadow: 1px 1px 2px black;
                margin-bottom: 5px;
            }
            .health-bar-bg {
                width: 120px;
                height: 20px;
                background: rgba(0,0,0,0.5);
                border-radius: 10px;
                overflow: hidden;
                border: 2px solid #333;
            }
            .health-bar-fill {
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, #4ade80, #22c55e);
                transition: width 0.2s;
            }
        `;
        document.head.appendChild(style);
    }
    
    // =====================
    // SISTEMA DE MISIONES
    // =====================
    
    createShapes() {
        const { blockSize, streetWidth, gridSize } = this.city;
        const totalSize = (blockSize + streetWidth) * gridSize;
        const halfSize = totalSize / 2;
        
        const shapeTypes = ['circle', 'square', 'triangle'];
        const colors = {
            circle: 0xFF6B6B,    // Rojo coral
            square: 0x4ECDC4,    // Turquesa
            triangle: 0xFFE66D   // Amarillo
        };
        
        // Crear formas en las intersecciones
        for (let row = 0; row <= gridSize; row++) {
            for (let col = 0; col <= gridSize; col++) {
                if (Math.random() < 0.4) { // 40% de probabilidad
                    const x = -halfSize + col * (blockSize + streetWidth) + streetWidth / 2;
                    const z = -halfSize + row * (blockSize + streetWidth) + streetWidth / 2;
                    
                    const shapeType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
                    const shape = this.createShape(shapeType, colors[shapeType]);
                    
                    // Colocar más alto para que sea visible desde lejos
                    shape.position.set(x, 2.0, z);
                    shape.userData = { type: shapeType, collected: false };
                    
                    this.mission.shapes.push(shape);
                    this.scene.add(shape);
                }
            }
        }
    }
    
    createShape(type, color) {
        const group = new THREE.Group();
        let geometry;
        
        // Formas 3D GRANDES y visibles
        switch (type) {
            case 'circle':
                // Esfera grande en lugar de cilindro plano
                geometry = new THREE.SphereGeometry(2.5, 32, 32);
                break;
            case 'square':
                // Cubo grande
                geometry = new THREE.BoxGeometry(3.5, 3.5, 3.5);
                break;
            case 'triangle':
                // Tetraedro grande (pirámide)
                geometry = new THREE.TetrahedronGeometry(3.0);
                break;
        }
        
        // Material brillante y llamativo (Phong para brillo)
        const material = new THREE.MeshPhongMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.6,
            shininess: 100,
            specular: 0xFFFFFF
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
        
        // Halo de luz/energía alrededor
        const ringGeo = new THREE.TorusGeometry(4.0, 0.3, 16, 32);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.6
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.userData.isRing = true; // Para animarlo distinto
        group.add(ring);
        
        // Otro anillo cruzado
        const ring2 = ring.clone();
        ring2.rotation.x = Math.PI / 2;
        group.add(ring2);
        
        return group;
    }
    
    createMissionUI() {
        const missionUI = document.createElement('div');
        missionUI.id = 'mission-ui';
        missionUI.innerHTML = `
            <div id="mission-text">🎯 Busca: <span id="mission-shape">-</span></div>
            <div id="mission-progress">Encontrados: <span id="mission-collected">0</span>/<span id="mission-target">5</span></div>
            <div id="mission-score">⭐ Puntos: <span id="score-value">0</span></div>
        `;
        document.getElementById('game-container').appendChild(missionUI);
        
        const style = document.createElement('style');
        style.textContent = `
            #mission-ui {
                position: absolute;
                top: 80px;
                left: 15px;
                background: rgba(0,0,0,0.7);
                padding: 10px 15px;
                border-radius: 10px;
                z-index: 50;
                font-size: 14px;
                color: white;
                text-shadow: 1px 1px 2px black;
            }
            #mission-text { font-weight: bold; margin-bottom: 5px; }
            #mission-shape { color: #FFD700; }
            #mission-progress { margin-bottom: 5px; }
            #mission-score { color: #FFD700; }
            
            .shape-collected {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 48px;
                color: #4ade80;
                text-shadow: 2px 2px 4px black;
                animation: popIn 0.5s ease-out forwards;
                z-index: 1000;
                pointer-events: none;
            }
            @keyframes popIn {
                0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
                50% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
            }
            
            .mission-complete {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 36px;
                color: #FFD700;
                text-shadow: 2px 2px 4px black;
                background: rgba(0,0,0,0.8);
                padding: 20px 40px;
                border-radius: 15px;
                animation: celebrate 2s ease-out forwards;
                z-index: 1000;
            }
            @keyframes celebrate {
                0% { transform: translate(-50%, -50%) scale(0); }
                20% { transform: translate(-50%, -50%) scale(1.2); }
                40% { transform: translate(-50%, -50%) scale(1); }
                100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    startNewMission() {
        const shapes = ['⭕ Círculo', '🔲 Cuadrado', '🔺 Triángulo'];
        const shapeTypes = ['circle', 'square', 'triangle'];
        const randomIndex = Math.floor(Math.random() * 3);
        
        this.mission.currentShape = shapeTypes[randomIndex];
        this.mission.target = 3 + Math.floor(Math.random() * 3); // 3-5 formas
        this.mission.collected = 0;
        
        // Actualizar UI
        const shapeEl = document.getElementById('mission-shape');
        const targetEl = document.getElementById('mission-target');
        const collectedEl = document.getElementById('mission-collected');
        
        if (shapeEl) shapeEl.textContent = shapes[randomIndex];
        if (targetEl) targetEl.textContent = this.mission.target;
        if (collectedEl) collectedEl.textContent = '0';
        
        // Hacer visibles solo las formas del tipo actual
        this.mission.shapes.forEach(shape => {
            shape.visible = !shape.userData.collected;
        });
    }
    
    checkShapeCollection() {
        const carX = this.carState.x;
        const carZ = this.carState.z;
        const collectRadius = 3;
        
        this.mission.shapes.forEach(shape => {
            if (shape.userData.collected || !shape.visible) return;
            
            const dx = carX - shape.position.x;
            const dz = carZ - shape.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < collectRadius) {
                // ¡Recolectada!
                if (shape.userData.type === this.mission.currentShape) {
                    shape.userData.collected = true;
                    shape.visible = false;
                    
                    this.mission.collected++;
                    this.mission.score += 10;
                    
                    // Efecto visual
                    this.showCollectEffect('✓ +10');
                    
                    // Actualizar UI
                    const collectedEl = document.getElementById('mission-collected');
                    const scoreEl = document.getElementById('score-value');
                    if (collectedEl) collectedEl.textContent = this.mission.collected;
                    if (scoreEl) scoreEl.textContent = this.mission.score;
                    
                    // Verificar si completó la misión
                    if (this.mission.collected >= this.mission.target) {
                        this.mission.score += 50; // Bonus por completar
                        if (scoreEl) scoreEl.textContent = this.mission.score;
                        this.showMissionComplete();
                        
                        // Restaurar formas y nueva misión después de 2 segundos
                        setTimeout(() => {
                            this.mission.shapes.forEach(s => s.userData.collected = false);
                            this.startNewMission();
                        }, 2000);
                    }
                }
            }
        });
    }
    
    showCollectEffect(text) {
        const effect = document.createElement('div');
        effect.className = 'shape-collected';
        effect.textContent = text;
        document.body.appendChild(effect);
        setTimeout(() => effect.remove(), 500);
    }
    
    showMissionComplete() {
        const complete = document.createElement('div');
        complete.className = 'mission-complete';
        complete.textContent = '🎉 ¡MISIÓN COMPLETA! +50';
        document.body.appendChild(complete);
        setTimeout(() => complete.remove(), 2000);
    }
    
    updateShapes(dt) {
        // Animar las formas (rotación y flotación)
        const time = Date.now() * 0.002;
        
        this.mission.shapes.forEach((shape, i) => {
            if (shape.visible) {
                // Rotación suave
                shape.rotation.y += 0.02 * dt;
                
                // Flotación suave
                shape.position.y = 0.5 + Math.sin(time + i) * 0.2;
            }
        });
    }
    
    // =====================
    // SISTEMA DE AUDIO
    // =====================
    
    // =====================
    // SISTEMA DE GAME OVER
    // =====================
    
    showGameOver() {
        this.isRunning = false;
        
        const gameOver = document.createElement('div');
        gameOver.id = 'game-over-screen';
        gameOver.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            z-index: 2000; animation: fadeIn 0.5s;
        `;
        
        gameOver.innerHTML = `
            <h1 style="color: #ff4444; font-size: 60px; margin-bottom: 20px; text-shadow: 0 0 10px red;">💥 ¡PERDISTE! 💥</h1>
            <p style="color: white; font-size: 24px; margin-bottom: 30px;">Tu auto quedó destruido</p>
            <div style="color: #FFD700; font-size: 20px; margin-bottom: 40px;">Puntuación Final: ${this.mission.score}</div>
            <button id="restart-btn" style="
                background: linear-gradient(145deg, #4ade80, #22c55e);
                border: none; padding: 20px 50px; font-size: 24px;
                color: white; border-radius: 50px; cursor: pointer;
                box-shadow: 0 5px 15px rgba(34, 197, 94, 0.5);
                font-weight: bold;
            ">♻️ COMENZAR OTRA VEZ</button>
        `;
        
        document.body.appendChild(gameOver);
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            gameOver.remove();
            this.restartGame();
        });
    }
    
    restartGame() {
        // Resetear estado
        this.health = this.maxHealth;
        this.mission.score = 0;
        this.mission.collected = 0;
        
        // Resetear posición
        this.carState.x = 0;
        this.carState.z = 0;
        this.carState.speed = 0;
        this.carState.rotation = 0;
        
        this.car.position.set(0, 0.5, 0);
        this.car.rotation.set(0, 0, 0);
        
        // Nueva misión
        this.mission.shapes.forEach(s => s.userData.collected = false);
        this.startNewMission();
        
        // Reiniciar loop
        this.lastDamageTime = 0;
        this.isRunning = true;
        this.clock.start();
        this.gameLoop();
    }
    
    setupStartScreen() {
        const startScreen = document.getElementById('start-screen');
        const startButton = document.getElementById('start-button');
        
        const startGame = (e) => {
            e.preventDefault();
            startScreen.classList.add('hidden');
            this.start();
        };
        
        startButton.addEventListener('click', startGame);
        startButton.addEventListener('touchstart', startGame);
    }
    
    setupControls() {
        const gasBtn = document.getElementById('gas-btn');
        const brakeBtn = document.getElementById('brake-btn');
        const leftBtn = document.getElementById('left-btn');
        const rightBtn = document.getElementById('right-btn');
        
        const setup = (btn, key) => {
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
        
        setup(gasBtn, 'accelerating');
        setup(brakeBtn, 'braking');
        setup(leftBtn, 'turningLeft');
        setup(rightBtn, 'turningRight');
        
        // Teclado
        const keys = {
            ArrowUp: 'accelerating', w: 'accelerating', W: 'accelerating',
            ArrowDown: 'braking', s: 'braking', S: 'braking',
            ArrowLeft: 'turningLeft', a: 'turningLeft', A: 'turningLeft',
            ArrowRight: 'turningRight', d: 'turningRight', D: 'turningRight'
        };
        const btns = {
            accelerating: 'gas-btn', braking: 'brake-btn',
            turningLeft: 'left-btn', turningRight: 'right-btn'
        };
        
        window.addEventListener('keydown', (e) => {
            if (keys[e.key]) {
                this.controls[keys[e.key]] = true;
                document.getElementById(btns[keys[e.key]]).classList.add('pressed');
            }
        });
        window.addEventListener('keyup', (e) => {
            if (keys[e.key]) {
                this.controls[keys[e.key]] = false;
                document.getElementById(btns[keys[e.key]]).classList.remove('pressed');
            }
        });
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
        this.checkShapeCollection();  // Recolección de formas
        this.updateShapes(dt);        // Animación de formas
        this.updateCamera();
        this.updateClouds(dt);
        this.updateUI();
    }
    
    updateCar(dt) {
        const state = this.carState;
        const ctrl = this.controls;
        
        // Aceleración
        if (ctrl.accelerating) {
            state.speed += state.acceleration * dt;
            if (state.speed > state.maxSpeed) state.speed = state.maxSpeed;
        }
        
        // Frenado/Reversa
        if (ctrl.braking) {
            if (state.speed > 0) {
                state.speed -= state.brakeForce * dt;
                if (state.speed < 0) state.speed = 0;
            } else {
                state.speed -= state.acceleration * 0.6 * dt;
                if (state.speed < state.maxReverseSpeed) state.speed = state.maxReverseSpeed;
            }
        }
        
        // Fricción
        if (!ctrl.accelerating && !ctrl.braking) {
            if (state.speed > 0) {
                state.speed -= state.friction * dt;
                if (state.speed < 0) state.speed = 0;
            } else if (state.speed < 0) {
                state.speed += state.friction * dt;
                if (state.speed > 0) state.speed = 0;
            }
        }
        
        // Rotación 360°
        if (Math.abs(state.speed) > 0.01) {
            const turnFactor = state.speed > 0 ? 1 : -1;
            if (ctrl.turningLeft) {
                state.rotation += state.turnSpeed * turnFactor * dt;
            }
            if (ctrl.turningRight) {
                state.rotation -= state.turnSpeed * turnFactor * dt;
            }
        }
        
        // Mover el auto
        state.x += Math.sin(state.rotation) * state.speed * dt;
        state.z += Math.cos(state.rotation) * state.speed * dt;
        
        // Aplicar posición
        this.car.position.x = state.x;
        this.car.position.z = state.z;
        this.car.rotation.y = state.rotation;
        
        // Inclinación al girar
        let targetTilt = 0;
        if (ctrl.turningLeft) targetTilt = 0.1;
        if (ctrl.turningRight) targetTilt = -0.1;
        state.tilt += (targetTilt - state.tilt) * 0.1;
        this.car.rotation.z = state.tilt * Math.abs(state.speed);
        
        // Animar ruedas
        this.wheels.forEach(wheel => {
            wheel.rotation.x += state.speed * dt * 2;
        });
        
        // Luces de freno
        this.brakeMat.color.setHex(ctrl.braking ? 0xFF0000 : 0x880000);
    }
    
    checkCollisions() {
        const carRadius = 2.5;
        const now = Date.now();
        
        // Función para colisión SÓLIDA - no permite atravesar
        const checkSolidCollision = (obj, damageAmount) => {
            const dx = this.carState.x - obj.position.x;
            const dz = this.carState.z - obj.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const scale = obj.scale?.x || 1;
            const minDist = carRadius + (obj.userData.radius || 3) * scale;
            
            if (dist < minDist) {
                // Calcular penetración
                const overlap = minDist - dist;
                const angle = Math.atan2(dx, dz);
                
                // EMPUJAR AL AUTO FUERA COMPLETAMENTE (colisión sólida)
                this.carState.x += Math.sin(angle) * overlap * 1.1;
                this.carState.z += Math.cos(angle) * overlap * 1.1;
                
                // Detener el auto al colisionar
                this.carState.speed *= 0.1;
                
                // Daño con cooldown
                if (now - this.lastDamageTime > 300) {
                    this.takeDamage(damageAmount);
                    this.lastDamageTime = now;
                }
                
                return true;
            }
            return false;
        };
        
        // Verificar colisiones con árboles
        this.trees.forEach(tree => checkSolidCollision(tree, 3));
        
        // Verificar colisiones con edificios/casas
        this.buildings.forEach(building => checkSolidCollision(building, 5));
        
        // Verificar colisiones con otros autos
        if (this.npcCars) {
            this.npcCars.forEach(npc => {
                const dx = this.carState.x - npc.mesh.position.x;
                const dz = this.carState.z - npc.mesh.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                const minDist = carRadius + 2.5;
                
                if (dist < minDist) {
                    const overlap = minDist - dist;
                    const angle = Math.atan2(dx, dz);
                    this.carState.x += Math.sin(angle) * overlap * 1.1;
                    this.carState.z += Math.cos(angle) * overlap * 1.1;
                    this.carState.speed *= 0.2;
                    
                    if (now - this.lastDamageTime > 300) {
                        this.takeDamage(10);
                        this.lastDamageTime = now;
                    }
                }
            });
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        
        if (this.health <= 0) {
            this.health = 0;
            this.showGameOver();
        } else {
            // Flash visual
            const flash = document.createElement('div');
            flash.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(255, 0, 0, 0.3); z-index: 1000;
                pointer-events: none;
            `;
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 100);
        }
        
        this.updateUI();
    }
    
    updateCamera() {
        const state = this.carState;
        const camDist = 15;
        const camHeight = 10;
        
        const targetX = state.x - Math.sin(state.rotation) * camDist;
        const targetZ = state.z - Math.cos(state.rotation) * camDist;
        
        this.camera.position.x += (targetX - this.camera.position.x) * 0.08;
        this.camera.position.y = camHeight;
        this.camera.position.z += (targetZ - this.camera.position.z) * 0.08;
        
        this.camera.lookAt(state.x, 1.5, state.z);
    }
    
    updateClouds(dt) {
        this.clouds.forEach(cloud => {
            cloud.position.x += cloud.userData.speed * dt;
            if (cloud.position.x > 200) cloud.position.x = -200;
        });
    }
    
    updateUI() {
        const healthBar = document.getElementById('health-bar-fill');
        if (healthBar) {
            const percent = (this.health / this.maxHealth) * 100;
            healthBar.style.width = `${percent}%`;
            
            if (percent > 50) {
                healthBar.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
            } else if (percent > 25) {
                healthBar.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
            } else {
                healthBar.style.background = 'linear-gradient(90deg, #ff4444, #dc2626)';
            }
        }
        
        // Velocímetro
        const needle = document.getElementById('speed-needle');
        const speedValue = document.getElementById('speed-value');
        
        if (needle && speedValue) {
            const speedPercent = Math.abs(this.carState.speed) / this.carState.maxSpeed;
            const speedKmh = Math.round(speedPercent * 120);
            const needleAngle = -120 + (speedPercent * 240);
            
            speedValue.textContent = this.carState.speed < 0 ? '-' + speedKmh : speedKmh;
            speedValue.style.color = this.carState.speed < 0 ? '#ff6b6b' : 
                                     speedPercent > 0.7 ? '#ff6b6b' : '#4ade80';
            needle.parentElement.style.transform = `translate(-50%, -100%) rotate(${needleAngle}deg)`;
        }
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

// Iniciar
window.addEventListener('load', () => new CarGame3D());
