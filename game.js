// ============================================
// 🚗 JUEGO DE CARROS PARA NIÑOS
// ============================================

class CarGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // Estado del juego
    this.isRunning = false;
    this.lastTime = 0;

    // Auto
    this.car = {
      x: 0,
      y: 0,
      width: 60,
      height: 100,
      angle: 0,
      speed: 0,
      maxSpeed: 8,
      maxReverseSpeed: -4,
      acceleration: 0.15,
      brakeForce: 0.25,
      friction: 0.02,
      turnSpeed: 0.04,
    };

    // Controles
    this.controls = {
      accelerating: false,
      braking: false,
      tiltX: 0,
    };

    // Carretera
    this.road = {
      offset: 0,
      lineSpacing: 80,
      width: 300,
    };

    // Decoraciones
    this.decorations = [];
    this.clouds = [];
    this.particles = [];

    // Sonidos visuales (efectos)
    this.effects = [];

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    this.setupControls();
    this.setupStartScreen();
    this.generateDecorations();
    this.generateClouds();

    // Posición inicial del auto
    this.car.x = this.canvas.width / 2;
    this.car.y = this.canvas.height * 0.55;
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Reposicionar auto
    if (this.car) {
      this.car.x = this.canvas.width / 2;
      this.car.y = this.canvas.height * 0.55;
    }

    // Regenerar decoraciones para nuevo tamaño
    this.generateDecorations();
    this.generateClouds();
  }

  setupStartScreen() {
    const startScreen = document.getElementById("start-screen");
    const startButton = document.getElementById("start-button");

    startButton.addEventListener("click", () => {
      startScreen.classList.add("hidden");
      this.start();
    });

    startButton.addEventListener("touchstart", (e) => {
      e.preventDefault();
      startScreen.classList.add("hidden");
      this.start();
    });
  }

  setupControls() {
    const gasBtn = document.getElementById("gas-btn");
    const brakeBtn = document.getElementById("brake-btn");

    // Eventos táctiles para el botón de acelerar
    gasBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.controls.accelerating = true;
      gasBtn.classList.add("pressed");
    });

    gasBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.controls.accelerating = false;
      gasBtn.classList.remove("pressed");
    });

    gasBtn.addEventListener("touchcancel", () => {
      this.controls.accelerating = false;
      gasBtn.classList.remove("pressed");
    });

    // Eventos táctiles para el botón de freno
    brakeBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.controls.braking = true;
      brakeBtn.classList.add("pressed");
    });

    brakeBtn.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.controls.braking = false;
      brakeBtn.classList.remove("pressed");
    });

    brakeBtn.addEventListener("touchcancel", () => {
      this.controls.braking = false;
      brakeBtn.classList.remove("pressed");
    });

    // Eventos de mouse (para testing en PC)
    gasBtn.addEventListener("mousedown", () => {
      this.controls.accelerating = true;
      gasBtn.classList.add("pressed");
    });

    gasBtn.addEventListener("mouseup", () => {
      this.controls.accelerating = false;
      gasBtn.classList.remove("pressed");
    });

    gasBtn.addEventListener("mouseleave", () => {
      this.controls.accelerating = false;
      gasBtn.classList.remove("pressed");
    });

    brakeBtn.addEventListener("mousedown", () => {
      this.controls.braking = true;
      brakeBtn.classList.add("pressed");
    });

    brakeBtn.addEventListener("mouseup", () => {
      this.controls.braking = false;
      brakeBtn.classList.remove("pressed");
    });

    brakeBtn.addEventListener("mouseleave", () => {
      this.controls.braking = false;
      brakeBtn.classList.remove("pressed");
    });

    // Giroscopio para inclinación
    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", (e) => {
        // gamma es la inclinación izquierda/derecha (-90 a 90)
        if (e.gamma !== null) {
          this.controls.tiltX = e.gamma / 30; // Normalizar
          this.controls.tiltX = Math.max(-1, Math.min(1, this.controls.tiltX));
        }
      });
    }

    // Controles de teclado (para testing)
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "w") {
        this.controls.accelerating = true;
        document.getElementById("gas-btn").classList.add("pressed");
      }
      if (e.key === "ArrowDown" || e.key === "s") {
        this.controls.braking = true;
        document.getElementById("brake-btn").classList.add("pressed");
      }
      if (e.key === "ArrowLeft" || e.key === "a") {
        this.controls.tiltX = -1;
      }
      if (e.key === "ArrowRight" || e.key === "d") {
        this.controls.tiltX = 1;
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.key === "ArrowUp" || e.key === "w") {
        this.controls.accelerating = false;
        document.getElementById("gas-btn").classList.remove("pressed");
      }
      if (e.key === "ArrowDown" || e.key === "s") {
        this.controls.braking = false;
        document.getElementById("brake-btn").classList.remove("pressed");
      }
      if (
        e.key === "ArrowLeft" ||
        e.key === "a" ||
        e.key === "ArrowRight" ||
        e.key === "d"
      ) {
        this.controls.tiltX = 0;
      }
    });
  }

  generateDecorations() {
    this.decorations = [];
    const roadLeft = (this.canvas.width - this.road.width) / 2 - 50;
    const roadRight = (this.canvas.width + this.road.width) / 2 + 50;

    // Generar árboles y flores a los lados
    for (let y = -200; y < this.canvas.height + 200; y += 100) {
      // Lado izquierdo
      if (Math.random() > 0.3) {
        this.decorations.push({
          type: Math.random() > 0.5 ? "tree" : "flower",
          x: Math.random() * (roadLeft - 30) + 15,
          y: y + Math.random() * 50,
          size: 0.8 + Math.random() * 0.4,
        });
      }

      // Lado derecho
      if (Math.random() > 0.3) {
        this.decorations.push({
          type: Math.random() > 0.5 ? "tree" : "flower",
          x:
            roadRight +
            Math.random() * (this.canvas.width - roadRight - 30) +
            15,
          y: y + Math.random() * 50,
          size: 0.8 + Math.random() * 0.4,
        });
      }
    }
  }

  generateClouds() {
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * (this.canvas.height * 0.3),
        size: 0.5 + Math.random() * 0.5,
        speed: 0.2 + Math.random() * 0.3,
      });
    }
  }

  start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  gameLoop(currentTime = 0) {
    if (!this.isRunning) return;

    const deltaTime = (currentTime - this.lastTime) / 16.67; // Normalizar a 60fps
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(deltaTime) {
    const dt = Math.min(deltaTime, 3); // Limitar para evitar saltos grandes

    // Actualizar física del auto
    this.updateCar(dt);

    // Actualizar decoraciones (efecto de movimiento)
    this.updateDecorations(dt);

    // Actualizar nubes
    this.updateClouds(dt);

    // Actualizar partículas
    this.updateParticles(dt);

    // Actualizar indicador de velocidad
    this.updateSpeedIndicator();

    // Generar partículas al acelerar
    if (this.controls.accelerating && this.car.speed > 1) {
      this.addExhaustParticle();
    }
  }

  updateCar(dt) {
    const car = this.car;
    const ctrl = this.controls;

    // Aceleración
    if (ctrl.accelerating) {
      car.speed += car.acceleration * dt;
      if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
    }

    // Frenado y reversa
    if (ctrl.braking) {
      if (car.speed > 0) {
        car.speed -= car.brakeForce * dt;
        if (car.speed < 0) car.speed = 0;
      } else {
        // Reversa
        car.speed -= car.acceleration * 0.5 * dt;
        if (car.speed < car.maxReverseSpeed) car.speed = car.maxReverseSpeed;
      }
    }

    // Fricción natural
    if (!ctrl.accelerating && !ctrl.braking) {
      if (car.speed > 0) {
        car.speed -= car.friction * dt;
        if (car.speed < 0) car.speed = 0;
      } else if (car.speed < 0) {
        car.speed += car.friction * dt;
        if (car.speed > 0) car.speed = 0;
      }
    }

    // Dirección (solo si hay velocidad)
    if (Math.abs(car.speed) > 0.5) {
      const turnFactor = car.speed > 0 ? 1 : -1;
      car.angle += ctrl.tiltX * car.turnSpeed * turnFactor * dt;
    }

    // Movimiento horizontal basado en el ángulo
    car.x += Math.sin(car.angle) * car.speed * dt * 2;

    // Mantener el auto dentro de los límites
    const margin = car.width / 2;
    if (car.x < margin) car.x = margin;
    if (car.x > this.canvas.width - margin) car.x = this.canvas.width - margin;

    // Limitar el ángulo
    const maxAngle = Math.PI / 4;
    if (car.angle > maxAngle) car.angle = maxAngle;
    if (car.angle < -maxAngle) car.angle = -maxAngle;

    // Volver gradualmente al centro cuando no hay inclinación
    if (Math.abs(ctrl.tiltX) < 0.1) {
      car.angle *= 0.95;
    }
  }

  updateDecorations(dt) {
    const speed = this.car.speed;

    this.decorations.forEach((dec) => {
      dec.y += speed * dt * 2;

      // Reciclar decoraciones que salen de la pantalla
      if (dec.y > this.canvas.height + 100) {
        dec.y = -100;
        dec.x =
          dec.x < this.canvas.width / 2
            ? Math.random() * ((this.canvas.width - this.road.width) / 2 - 50) +
              15
            : (this.canvas.width + this.road.width) / 2 +
              50 +
              Math.random() * 100;
      }
      if (dec.y < -200) {
        dec.y = this.canvas.height + 100;
      }
    });

    // Actualizar offset de la carretera
    this.road.offset += speed * dt * 2;
    if (this.road.offset > this.road.lineSpacing) {
      this.road.offset -= this.road.lineSpacing;
    }
    if (this.road.offset < 0) {
      this.road.offset += this.road.lineSpacing;
    }
  }

  updateClouds(dt) {
    this.clouds.forEach((cloud) => {
      cloud.x += cloud.speed * dt;
      if (cloud.x > this.canvas.width + 100) {
        cloud.x = -100;
      }
    });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 0.05;
      p.size *= 0.98;

      if (p.life <= 0 || p.size < 0.5) {
        this.particles.splice(i, 1);
      }
    }
  }

  addExhaustParticle() {
    // Calcular posición trasera del auto
    const behindCar = 50;
    const particleX = this.car.x - Math.sin(this.car.angle) * behindCar;
    const particleY = this.car.y + Math.cos(this.car.angle) * behindCar;

    this.particles.push({
      x: particleX + (Math.random() - 0.5) * 20,
      y: particleY,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 2,
      size: 5 + Math.random() * 10,
      life: 1,
      color: `hsl(${30 + Math.random() * 20}, 80%, 60%)`,
    });
  }

  updateSpeedIndicator() {
    const speedBar = document.getElementById("speed-bar");
    const speedEmoji = document.getElementById("speed-emoji");

    const speedPercent = (Math.abs(this.car.speed) / this.car.maxSpeed) * 100;
    speedBar.style.width = `${Math.min(speedPercent, 100)}%`;

    // Cambiar emoji según velocidad
    if (this.car.speed < 0) {
      speedEmoji.textContent = "🔙";
    } else if (speedPercent < 20) {
      speedEmoji.textContent = "🚗";
    } else if (speedPercent < 50) {
      speedEmoji.textContent = "🚙";
    } else if (speedPercent < 80) {
      speedEmoji.textContent = "🏎️";
    } else {
      speedEmoji.textContent = "🚀";
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Limpiar canvas
    ctx.clearRect(0, 0, w, h);

    // Dibujar cielo con gradiente
    this.drawSky();

    // Dibujar nubes
    this.drawClouds();

    // Dibujar césped
    this.drawGrass();

    // Dibujar carretera
    this.drawRoad();

    // Dibujar decoraciones (árboles, flores)
    this.drawDecorations();

    // Dibujar partículas
    this.drawParticles();

    // Dibujar auto
    this.drawCar();
  }

  drawSky() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(
      0,
      0,
      0,
      this.canvas.height * 0.4
    );
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(1, "#B0E0E6");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height * 0.4);
  }

  drawClouds() {
    const ctx = this.ctx;

    this.clouds.forEach((cloud) => {
      ctx.save();
      ctx.translate(cloud.x, cloud.y);
      ctx.scale(cloud.size, cloud.size);

      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.arc(25, -10, 25, 0, Math.PI * 2);
      ctx.arc(50, 0, 30, 0, Math.PI * 2);
      ctx.arc(25, 10, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  drawGrass() {
    const ctx = this.ctx;
    const grassGradient = ctx.createLinearGradient(
      0,
      this.canvas.height * 0.4,
      0,
      this.canvas.height
    );
    grassGradient.addColorStop(0, "#90EE90");
    grassGradient.addColorStop(0.5, "#32CD32");
    grassGradient.addColorStop(1, "#228B22");

    ctx.fillStyle = grassGradient;
    ctx.fillRect(
      0,
      this.canvas.height * 0.35,
      this.canvas.width,
      this.canvas.height * 0.65
    );
  }

  drawRoad() {
    const ctx = this.ctx;
    const roadWidth = this.road.width;
    const roadX = (this.canvas.width - roadWidth) / 2;

    // Carretera principal
    ctx.fillStyle = "#444";
    ctx.fillRect(
      roadX,
      this.canvas.height * 0.35,
      roadWidth,
      this.canvas.height * 0.65
    );

    // Bordes de la carretera
    ctx.fillStyle = "#fff";
    ctx.fillRect(
      roadX,
      this.canvas.height * 0.35,
      8,
      this.canvas.height * 0.65
    );
    ctx.fillRect(
      roadX + roadWidth - 8,
      this.canvas.height * 0.35,
      8,
      this.canvas.height * 0.65
    );

    // Líneas centrales discontinuas
    ctx.fillStyle = "#FFD700";
    const lineWidth = 6;
    const lineHeight = 40;
    const centerX = this.canvas.width / 2 - lineWidth / 2;

    for (
      let y =
        this.canvas.height * 0.35 - this.road.lineSpacing + this.road.offset;
      y < this.canvas.height;
      y += this.road.lineSpacing
    ) {
      ctx.fillRect(centerX, y, lineWidth, lineHeight);
    }
  }

  drawDecorations() {
    const ctx = this.ctx;

    // Ordenar por Y para efecto de profundidad
    const sortedDecs = [...this.decorations].sort((a, b) => a.y - b.y);

    sortedDecs.forEach((dec) => {
      ctx.save();
      ctx.translate(dec.x, dec.y);
      ctx.scale(dec.size, dec.size);

      if (dec.type === "tree") {
        this.drawTree(ctx);
      } else {
        this.drawFlower(ctx);
      }

      ctx.restore();
    });
  }

  drawTree(ctx) {
    // Tronco
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(-8, 0, 16, 40);

    // Copa del árbol
    ctx.fillStyle = "#228B22";
    ctx.beginPath();
    ctx.arc(0, -20, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#32CD32";
    ctx.beginPath();
    ctx.arc(-10, -30, 25, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(15, -25, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFlower(ctx) {
    const colors = ["#FF69B4", "#FF6347", "#FFD700", "#FF4500", "#DA70D6"];
    const color = colors[Math.floor(Math.random() * colors.length)];

    // Tallo
    ctx.strokeStyle = "#228B22";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(0, 0);
    ctx.stroke();

    // Pétalos
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(
        Math.cos((i * Math.PI * 2) / 5) * 10,
        Math.sin((i * Math.PI * 2) / 5) * 10 - 10,
        8,
        12,
        (i * Math.PI * 2) / 5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Centro
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(0, -10, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  drawParticles() {
    const ctx = this.ctx;

    this.particles.forEach((p) => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }

  drawCar() {
    const ctx = this.ctx;
    const car = this.car;

    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Sombra del auto
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(5, 10, car.width * 0.6, car.height * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo del auto (forma básica)
    const carWidth = car.width;
    const carHeight = car.height;

    // Ruedas traseras
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-carWidth / 2 - 5, carHeight / 2 - 25, 12, 25);
    ctx.fillRect(carWidth / 2 - 7, carHeight / 2 - 25, 12, 25);

    // Ruedas delanteras (con giro)
    ctx.save();
    ctx.translate(-carWidth / 2 + 2, -carHeight / 2 + 20);
    ctx.rotate(this.controls.tiltX * 0.3);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-6, -12, 12, 25);
    ctx.restore();

    ctx.save();
    ctx.translate(carWidth / 2 - 2, -carHeight / 2 + 20);
    ctx.rotate(this.controls.tiltX * 0.3);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-6, -12, 12, 25);
    ctx.restore();

    // Cuerpo principal
    ctx.fillStyle = "#FF4444";
    ctx.beginPath();
    ctx.roundRect(-carWidth / 2, -carHeight / 2, carWidth, carHeight, 15);
    ctx.fill();

    // Detalles del auto - techo/cabina
    ctx.fillStyle = "#CC3333";
    ctx.beginPath();
    ctx.roundRect(
      -carWidth / 2 + 8,
      -carHeight / 2 + 20,
      carWidth - 16,
      carHeight * 0.4,
      10
    );
    ctx.fill();

    // Ventanas
    ctx.fillStyle = "#87CEEB";
    ctx.beginPath();
    ctx.roundRect(
      -carWidth / 2 + 12,
      -carHeight / 2 + 25,
      carWidth - 24,
      carHeight * 0.3,
      8
    );
    ctx.fill();

    // Parabrisas
    ctx.fillStyle = "#ADD8E6";
    ctx.beginPath();
    ctx.roundRect(-carWidth / 2 + 10, -carHeight / 2 + 5, carWidth - 20, 20, 5);
    ctx.fill();

    // Luces delanteras
    ctx.fillStyle = "#FFFF00";
    ctx.beginPath();
    ctx.arc(-carWidth / 2 + 12, -carHeight / 2 + 8, 6, 0, Math.PI * 2);
    ctx.arc(carWidth / 2 - 12, -carHeight / 2 + 8, 6, 0, Math.PI * 2);
    ctx.fill();

    // Luces traseras
    ctx.fillStyle = this.controls.braking ? "#FF0000" : "#880000";
    ctx.beginPath();
    ctx.arc(-carWidth / 2 + 10, carHeight / 2 - 8, 5, 0, Math.PI * 2);
    ctx.arc(carWidth / 2 - 10, carHeight / 2 - 8, 5, 0, Math.PI * 2);
    ctx.fill();

    // Sonrisa en el auto (para hacerlo amigable)
    if (this.car.speed >= 0) {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, -carHeight / 2 + 35, 12, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();

      // Ojos
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(-10, -carHeight / 2 + 25, 5, 0, Math.PI * 2);
      ctx.arc(10, -carHeight / 2 + 25, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(-10, -carHeight / 2 + 25, 2, 0, Math.PI * 2);
      ctx.arc(10, -carHeight / 2 + 25, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// Inicializar juego cuando carga la página
window.addEventListener("load", () => {
  new CarGame();
});
