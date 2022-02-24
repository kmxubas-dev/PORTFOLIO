(() => {
  const canvasWidth = 640;
  const canvasHeight = 400;
  const shipRadius = 13;
  const turnSpeed = 4.6;
  const thrustPower = 230;
  const drag = 0.992;
  const bulletSpeed = 420;
  const bulletLife = 0.9;
  const bulletCooldown = 0.18;
  const respawnSeconds = 1.35;
  const controlText = "Controls: WASD/Arrows move - Space fire";

  let canvas;
  let ctx;
  let scoreEl;
  let livesEl;
  let waveEl;
  let statusEl;
  let overlayEl;
  let restartBtn;
  let pauseBtn;
  let pauseLabelEl;
  let frameId = null;
  let lastFrameTime = 0;
  let active = false;
  let paused = false;
  let gameOver = false;
  let score = 0;
  let lives = 3;
  let wave = 1;
  let shotTimer = 0;
  let respawnTimer = 0;
  let ship;
  let bullets = [];
  let asteroids = [];
  let particles = [];
  const keys = new Set();

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const randomRange = (min, max) => min + Math.random() * (max - min);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const setStatus = () => {
    if (statusEl) statusEl.textContent = controlText;
  };

  const setOverlay = (text = "", visible = false) => {
    if (!overlayEl) return;
    overlayEl.textContent = text;
    overlayEl.dataset.visible = String(visible);
  };

  const setPauseLabel = text => {
    if (pauseLabelEl) pauseLabelEl.textContent = text;
  };

  const setPauseEnabled = enabled => {
    if (pauseBtn) pauseBtn.disabled = !enabled;
  };

  const updateHud = () => {
    if (scoreEl) scoreEl.textContent = String(score);
    if (livesEl) livesEl.textContent = String(lives);
    if (waveEl) waveEl.textContent = String(wave);
  };

  const wrapEntity = entity => {
    if (entity.x < -entity.radius) entity.x = canvasWidth + entity.radius;
    if (entity.x > canvasWidth + entity.radius) entity.x = -entity.radius;
    if (entity.y < -entity.radius) entity.y = canvasHeight + entity.radius;
    if (entity.y > canvasHeight + entity.radius) entity.y = -entity.radius;
  };

  const createShip = () => ({
    x: canvasWidth / 2,
    y: canvasHeight / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: shipRadius
  });

  const createAsteroid = (x, y, size = 3) => {
    const radius = size === 3 ? randomRange(34, 46) : size === 2 ? randomRange(22, 30) : randomRange(13, 18);
    const speed = randomRange(28, 74) + wave * 4;
    const angle = randomRange(0, Math.PI * 2);
    const points = Array.from({ length: 10 }, (_, index) => {
      const pointAngle = (index / 10) * Math.PI * 2;
      return {
        angle: pointAngle,
        scale: randomRange(0.72, 1.18)
      };
    });

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: randomRange(0, Math.PI * 2),
      spin: randomRange(-1.2, 1.2),
      radius,
      size,
      points
    };
  };

  const spawnWave = () => {
    asteroids = [];
    const count = clamp(3 + wave, 4, 8);

    for (let index = 0; index < count; index += 1) {
      let x = randomRange(0, canvasWidth);
      let y = randomRange(0, canvasHeight);
      let attempts = 0;

      while (distance({ x, y }, ship) < 150 && attempts < 24) {
        x = randomRange(0, canvasWidth);
        y = randomRange(0, canvasHeight);
        attempts += 1;
      }

      asteroids.push(createAsteroid(x, y, 3));
    }

    setStatus(`Wave ${wave}`);
  };

  const createBurst = (x, y, color, count) => {
    for (let index = 0; index < count; index += 1) {
      const angle = randomRange(0, Math.PI * 2);
      const speed = randomRange(30, 150);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.28, 0.72),
        maxLife: 0.72,
        color,
        radius: randomRange(1.2, 2.8)
      });
    }
  };

  const stopLoop = () => {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = null;
    lastFrameTime = 0;
  };

  const drawBackground = () => {
    ctx.fillStyle = "#05090f";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = "rgba(103, 223, 255, 0.055)";
    ctx.lineWidth = 1;
    for (let x = 40; x < canvasWidth; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvasHeight);
      ctx.stroke();
    }
    for (let y = 40; y < canvasHeight; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvasWidth, y + 0.5);
      ctx.stroke();
    }
  };

  const drawShip = () => {
    if (respawnTimer > 0 && Math.floor(respawnTimer * 10) % 2 === 0) return;

    const nose = {
      x: ship.x + Math.cos(ship.angle) * 18,
      y: ship.y + Math.sin(ship.angle) * 18
    };
    const left = {
      x: ship.x + Math.cos(ship.angle + 2.45) * 15,
      y: ship.y + Math.sin(ship.angle + 2.45) * 15
    };
    const right = {
      x: ship.x + Math.cos(ship.angle - 2.45) * 15,
      y: ship.y + Math.sin(ship.angle - 2.45) * 15
    };

    ctx.strokeStyle = respawnTimer > 0 ? "rgba(255, 209, 125, 0.95)" : "#67dfff";
    ctx.fillStyle = "rgba(103, 223, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(nose.x, nose.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(ship.x - Math.cos(ship.angle) * 6, ship.y - Math.sin(ship.angle) * 6);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (keys.has("ArrowUp") || keys.has("w")) {
      ctx.strokeStyle = "#ffd17d";
      ctx.beginPath();
      ctx.moveTo(ship.x - Math.cos(ship.angle) * 12, ship.y - Math.sin(ship.angle) * 12);
      ctx.lineTo(ship.x - Math.cos(ship.angle) * 24, ship.y - Math.sin(ship.angle) * 24);
      ctx.stroke();
    }
  };

  const drawAsteroid = asteroid => {
    ctx.strokeStyle = asteroid.size === 3 ? "rgba(83, 245, 192, 0.86)" : "rgba(103, 223, 255, 0.88)";
    ctx.fillStyle = "rgba(103, 223, 255, 0.045)";
    ctx.lineWidth = 2;
    ctx.beginPath();

    asteroid.points.forEach((point, index) => {
      const angle = point.angle + asteroid.angle;
      const x = asteroid.x + Math.cos(angle) * asteroid.radius * point.scale;
      const y = asteroid.y + Math.sin(angle) * asteroid.radius * point.scale;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const draw = () => {
    if (!ctx) return;
    drawBackground();

    bullets.forEach(bullet => {
      ctx.fillStyle = "#ffd17d";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 2.8, 0, Math.PI * 2);
      ctx.fill();
    });

    asteroids.forEach(drawAsteroid);

    particles.forEach(particle => {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    if (!gameOver) drawShip();

    ctx.strokeStyle = "rgba(83, 245, 192, 0.95)";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvasWidth - 4, canvasHeight - 4);
    ctx.strokeStyle = "rgba(103, 223, 255, 0.72)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(7, 7, canvasWidth - 14, canvasHeight - 14);
  };

  const fireBullet = () => {
    if (shotTimer > 0 || gameOver || paused) return;

    bullets.push({
      x: ship.x + Math.cos(ship.angle) * 18,
      y: ship.y + Math.sin(ship.angle) * 18,
      vx: ship.vx + Math.cos(ship.angle) * bulletSpeed,
      vy: ship.vy + Math.sin(ship.angle) * bulletSpeed,
      life: bulletLife,
      radius: 3
    });

    shotTimer = bulletCooldown;
  };

  const splitAsteroid = asteroid => {
    score += asteroid.size === 3 ? 20 : asteroid.size === 2 ? 50 : 100;
    createBurst(asteroid.x, asteroid.y, asteroid.size === 1 ? "#ffd17d" : "#67dfff", asteroid.size === 3 ? 12 : 8);

    if (asteroid.size > 1) {
      asteroids.push(createAsteroid(asteroid.x, asteroid.y, asteroid.size - 1));
      asteroids.push(createAsteroid(asteroid.x, asteroid.y, asteroid.size - 1));
    }

    updateHud();
  };

  const loseLife = () => {
    lives -= 1;
    updateHud();
    createBurst(ship.x, ship.y, "#ffd17d", 18);

    if (lives <= 0) {
      gameOver = true;
      active = false;
      setStatus("Game over");
      setOverlay("Game over - press Restart", true);
      setPauseEnabled(false);
      setPauseLabel("Pause");
      stopLoop();
      draw();
      return;
    }

    ship = createShip();
    bullets = [];
    respawnTimer = respawnSeconds;
    setStatus("Respawning");
  };

  const updateBullets = delta => {
    bullets.forEach(bullet => {
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      bullet.life -= delta;
      wrapEntity(bullet);
    });

    bullets = bullets.filter(bullet => bullet.life > 0);
  };

  const updateAsteroids = delta => {
    asteroids.forEach(asteroid => {
      asteroid.x += asteroid.vx * delta;
      asteroid.y += asteroid.vy * delta;
      asteroid.angle += asteroid.spin * delta;
      wrapEntity(asteroid);
    });
  };

  const updateParticles = delta => {
    particles.forEach(particle => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.life -= delta;
    });
    particles = particles.filter(particle => particle.life > 0);
  };

  const handleCollisions = () => {
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = bullets[bulletIndex];
      const asteroidIndex = asteroids.findIndex(asteroid => distance(bullet, asteroid) < asteroid.radius);

      if (asteroidIndex >= 0) {
        const asteroid = asteroids.splice(asteroidIndex, 1)[0];
        bullets.splice(bulletIndex, 1);
        splitAsteroid(asteroid);
      }
    }

    if (respawnTimer > 0 || gameOver) return;

    const shipHit = asteroids.some(asteroid => distance(ship, asteroid) < ship.radius + asteroid.radius * 0.82);
    if (shipHit) loseLife();
  };

  const updateShip = delta => {
    if (keys.has("ArrowLeft") || keys.has("a")) ship.angle -= turnSpeed * delta;
    if (keys.has("ArrowRight") || keys.has("d")) ship.angle += turnSpeed * delta;

    if (keys.has("ArrowUp") || keys.has("w")) {
      ship.vx += Math.cos(ship.angle) * thrustPower * delta;
      ship.vy += Math.sin(ship.angle) * thrustPower * delta;
      createBurst(
        ship.x - Math.cos(ship.angle) * 14,
        ship.y - Math.sin(ship.angle) * 14,
        "rgba(255, 209, 125, 0.9)",
        1
      );
    }

    ship.vx *= Math.pow(drag, delta * 60);
    ship.vy *= Math.pow(drag, delta * 60);
    ship.x += ship.vx * delta;
    ship.y += ship.vy * delta;
    wrapEntity(ship);
  };

  const update = delta => {
    shotTimer = Math.max(0, shotTimer - delta);
    respawnTimer = Math.max(0, respawnTimer - delta);

    updateShip(delta);
    updateBullets(delta);
    updateAsteroids(delta);
    updateParticles(delta);
    handleCollisions();

    if (!gameOver && asteroids.length === 0) {
      wave += 1;
      updateHud();
      spawnWave();
    }

    if (!gameOver && statusEl?.textContent !== `Wave ${wave}` && respawnTimer <= 0) {
      setStatus(`Wave ${wave}`);
    }
  };

  const loop = timestamp => {
    if (!active || paused || gameOver) return;
    const delta = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.034) : 0;
    lastFrameTime = timestamp;

    update(delta);
    draw();
    if (!active || gameOver) return;
    frameId = window.requestAnimationFrame(loop);
  };

  const startLoop = () => {
    stopLoop();
    frameId = window.requestAnimationFrame(loop);
  };

  const startGame = () => {
    score = 0;
    lives = 3;
    wave = 1;
    shotTimer = 0;
    respawnTimer = respawnSeconds;
    ship = createShip();
    bullets = [];
    particles = [];
    active = true;
    paused = false;
    gameOver = false;
    keys.clear();
    updateHud();
    setOverlay("", false);
    setPauseLabel("Pause");
    setPauseEnabled(true);
    spawnWave();
    draw();
    startLoop();
  };

  const prepareIdleState = () => {
    score = 0;
    lives = 3;
    wave = 1;
    shotTimer = 0;
    respawnTimer = 0;
    ship = createShip();
    bullets = [];
    asteroids = [];
    particles = [];
    active = false;
    paused = false;
    gameOver = false;
    keys.clear();
    updateHud();
    setStatus("Ready");
    setOverlay("Open Asteroids to launch", true);
    setPauseLabel("Pause");
    setPauseEnabled(false);
    stopLoop();
    draw();
  };

  const togglePause = () => {
    if (!active || gameOver) return;

    paused = !paused;
    if (paused) {
      stopLoop();
      setStatus("Paused");
      setOverlay("Paused", true);
      setPauseLabel("Resume");
    } else {
      setStatus(`Wave ${wave}`);
      setOverlay("", false);
      setPauseLabel("Pause");
      startLoop();
    }
  };

  const isTypingTarget = target => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  };

  const isFocusedAsteroids = () => {
    const asteroidsWindow = document.getElementById("app-asteroids");
    return Boolean(asteroidsWindow && asteroidsWindow.dataset.state === "open" && asteroidsWindow.dataset.focused === "true");
  };

  const normalizeKey = key => key.length === 1 ? key.toLowerCase() : key;

  const handleKeydown = event => {
    if (!isFocusedAsteroids()) return;
    if (isTypingTarget(event.target)) return;

    const key = normalizeKey(event.key);

    if (key === " ") {
      event.preventDefault();
      if (active && !paused) fireBullet();
      return;
    }

    if (key === "Enter") {
      event.preventDefault();
      startGame();
      return;
    }

    if (key === "p") {
      event.preventDefault();
      togglePause();
      return;
    }

    if (["ArrowLeft", "ArrowRight", "ArrowUp", "a", "d", "w"].includes(key)) {
      event.preventDefault();
      keys.add(key);
    }
  };

  const handleKeyup = event => {
    const key = normalizeKey(event.key);
    if (keys.has(key)) keys.delete(key);
  };

  const handleWindowOpen = event => {
    if (event.detail?.appId !== "asteroids") return;
    startGame();
  };

  const handleWindowClose = event => {
    if (event.detail?.appId !== "asteroids") return;
    active = false;
    paused = false;
    gameOver = false;
    keys.clear();
    setPauseLabel("Pause");
    setPauseEnabled(false);
    stopLoop();
  };

  const init = () => {
    canvas = document.getElementById("asteroidsCanvas");
    scoreEl = document.getElementById("asteroidsScore");
    livesEl = document.getElementById("asteroidsLives");
    waveEl = document.getElementById("asteroidsWave");
    statusEl = document.getElementById("asteroidsStatus");
    overlayEl = document.getElementById("asteroidsOverlay");
    restartBtn = document.getElementById("asteroidsRestart");
    pauseBtn = document.getElementById("asteroidsPause");
    pauseLabelEl = pauseBtn?.querySelector("span");

    if (!canvas) return;

    ctx = canvas.getContext("2d");
    prepareIdleState();

    restartBtn?.addEventListener("click", startGame);
    pauseBtn?.addEventListener("click", togglePause);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);
    window.addEventListener("kmx:window-open", handleWindowOpen);
    window.addEventListener("kmx:window-close", handleWindowClose);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
