(() => {
  const gridSize = 21;
  const stepMs = 140;
  const bestStorageKey = "kmx-snake-best";

  let canvas;
  let ctx;
  let scoreEl;
  let bestEl;
  let statusEl;
  let overlayEl;
  let restartBtn;
  let restartLabelEl;
  let pauseBtn;
  let pauseLabelEl;
  let timerId = null;
  let active = false;
  let paused = false;
  let gameOver = false;
  let score = 0;
  let best = 0;
  let snake = [];
  let food = { x: 14, y: 10 };
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };

  const readBest = () => {
    try {
      return Number(localStorage.getItem(bestStorageKey)) || 0;
    } catch {
      return 0;
    }
  };

  const storeBest = value => {
    try {
      localStorage.setItem(bestStorageKey, String(value));
    } catch {
      return;
    }
  };

  const setStatus = text => {
    if (statusEl) statusEl.textContent = text;
  };

  const setOverlay = (text = "", visible = false) => {
    if (!overlayEl) return;
    overlayEl.textContent = text;
    overlayEl.dataset.visible = String(visible);
  };

  const updateScore = () => {
    if (scoreEl) scoreEl.textContent = String(score);
    if (bestEl) bestEl.textContent = String(best);
  };

  const setActionLabel = text => {
    if (restartLabelEl) restartLabelEl.textContent = text;
  };

  const setPauseLabel = text => {
    if (pauseLabelEl) pauseLabelEl.textContent = text;
  };

  const setPauseEnabled = enabled => {
    if (pauseBtn) pauseBtn.disabled = !enabled;
  };

  const isOnSnake = point => snake.some(segment => segment.x === point.x && segment.y === point.y);

  const placeFood = () => {
    const openCells = [];

    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const point = { x, y };
        if (!isOnSnake(point)) openCells.push(point);
      }
    }

    food = openCells[Math.floor(Math.random() * openCells.length)] || { x: 10, y: 10 };
  };

  const drawCell = (point, color, inset = 1) => {
    const cellSize = canvas.width / gridSize;
    const x = point.x * cellSize + inset;
    const y = point.y * cellSize + inset;
    const size = cellSize - inset * 2;

    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
  };

  const draw = () => {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#05090f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(103, 223, 255, 0.055)";
    ctx.lineWidth = 1;
    const cellSize = canvas.width / gridSize;

    for (let index = 1; index < gridSize; index += 1) {
      const position = Math.round(index * cellSize) + 0.5;
      ctx.beginPath();
      ctx.moveTo(position, 0);
      ctx.lineTo(position, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, position);
      ctx.lineTo(canvas.width, position);
      ctx.stroke();
    }

    drawCell(food, "#ffd17d", 3);
    snake.forEach((segment, index) => {
      drawCell(segment, index === 0 ? "#67dfff" : "#53f5c0", index === 0 ? 1.5 : 2.5);
    });

    ctx.strokeStyle = "rgba(83, 245, 192, 0.95)";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    ctx.strokeStyle = "rgba(103, 223, 255, 0.72)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
  };

  const stopLoop = () => {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  };

  const endGame = () => {
    gameOver = true;
    active = false;
    paused = false;
    stopLoop();
    setStatus("Game over");
    setOverlay("Game over - press Restart", true);
    setActionLabel("Restart");
    setPauseLabel("Pause");
    setPauseEnabled(false);
    draw();
  };

  const tick = () => {
    direction = nextDirection;

    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y
    };
    const willEat = head.x === food.x && head.y === food.y;
    const collisionBody = willEat ? snake : snake.slice(0, -1);

    const hitWall = head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
    const hitSelf = collisionBody.some(segment => segment.x === head.x && segment.y === head.y);

    if (hitWall || hitSelf) {
      endGame();
      return;
    }

    snake.unshift(head);

    if (willEat) {
      score += 1;
      best = Math.max(best, score);
      storeBest(best);
      updateScore();
      placeFood();
      setStatus("Nice");
    } else {
      snake.pop();
      setStatus("Use arrows or WASD");
    }

    draw();
  };

  const prepareGame = () => {
    score = 0;
    gameOver = false;
    active = false;
    paused = false;
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    placeFood();
    updateScore();
    setStatus("Ready");
    setOverlay("Press Start or choose a direction", true);
    setActionLabel("Start");
    setPauseLabel("Pause");
    setPauseEnabled(false);
    stopLoop();
    draw();
  };

  const startGame = () => {
    if (active || gameOver) return;

    active = true;
    paused = false;
    setStatus("Use arrows or WASD");
    setOverlay("", false);
    setActionLabel("Restart");
    setPauseLabel("Pause");
    setPauseEnabled(true);
    timerId = window.setInterval(tick, stepMs);
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
      setStatus("Use arrows or WASD");
      setOverlay("", false);
      setPauseLabel("Pause");
      timerId = window.setInterval(tick, stepMs);
    }
  };

  const resetGame = () => {
    prepareGame();
    startGame();
  };

  const handleDirection = next => {
    if (gameOver) return;
    if (paused) return;
    const reversing = next.x + direction.x === 0 && next.y + direction.y === 0;
    if (reversing) return;
    nextDirection = next;
    if (!active) startGame();
  };

  const isTypingTarget = target => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  };

  const handleKeydown = event => {
    const snakeWindow = document.getElementById("app-snake");
    if (!snakeWindow || snakeWindow.dataset.state !== "open" || snakeWindow.dataset.focused !== "true") return;
    if (isTypingTarget(event.target)) return;

    const keyMap = {
      ArrowUp: { x: 0, y: -1 },
      w: { x: 0, y: -1 },
      W: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      s: { x: 0, y: 1 },
      S: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      a: { x: -1, y: 0 },
      A: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      d: { x: 1, y: 0 },
      D: { x: 1, y: 0 }
    };

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (paused) togglePause();
      else if (gameOver) resetGame();
      else startGame();
      return;
    }

    if (event.key === "p" || event.key === "P") {
      event.preventDefault();
      togglePause();
      return;
    }

    const next = keyMap[event.key];
    if (!next) return;

    event.preventDefault();
    handleDirection(next);
  };

  const handleWindowOpen = event => {
    if (event.detail?.appId !== "snake") return;
    prepareGame();
  };

  const handleWindowClose = event => {
    if (event.detail?.appId !== "snake") return;
    active = false;
    paused = false;
    stopLoop();
  };

  const init = () => {
    canvas = document.getElementById("snakeCanvas");
    scoreEl = document.getElementById("snakeScore");
    bestEl = document.getElementById("snakeBest");
    statusEl = document.getElementById("snakeStatus");
    overlayEl = document.getElementById("snakeOverlay");
    restartBtn = document.getElementById("snakeRestart");
    restartLabelEl = restartBtn?.querySelector("span");
    pauseBtn = document.getElementById("snakePause");
    pauseLabelEl = pauseBtn?.querySelector("span");

    if (!canvas) return;

    ctx = canvas.getContext("2d");
    best = readBest();
    prepareGame();

    restartBtn?.addEventListener("click", () => {
      if (active || gameOver) resetGame();
      else startGame();
    });
    pauseBtn?.addEventListener("click", togglePause);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("kmx:window-open", handleWindowOpen);
    window.addEventListener("kmx:window-close", handleWindowClose);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
