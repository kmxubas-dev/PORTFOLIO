(() => {
  const canvasWidth = 640;
  const canvasHeight = 400;
  const paddleWidth = 12;
  const paddleHeight = 78;
  const paddleInset = 28;
  const paddleSpeed = 360;
  const aiSpeed = 290;
  const ballSize = 12;
  const manualRightMs = 2400;

  let canvas;
  let ctx;
  let leftScoreEl;
  let rightScoreEl;
  let modeEl;
  let statusEl;
  let overlayEl;
  let restartBtn;
  let restartLabelEl;
  let pauseBtn;
  let pauseLabelEl;
  let frameId = null;
  let lastFrameTime = 0;
  let active = false;
  let paused = false;
  let leftScore = 0;
  let rightScore = 0;
  let manualRightUntil = 0;
  let leftPaddle = { y: 0 };
  let rightPaddle = { y: 0 };
  let ball = { x: 0, y: 0, vx: 0, vy: 0 };
  const keys = new Set();

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const setStatus = text => {
    if (statusEl) statusEl.textContent = text;
  };

  const setOverlay = (text = "", visible = false) => {
    if (!overlayEl) return;
    overlayEl.textContent = text;
    overlayEl.dataset.visible = String(visible);
  };

  const setPauseLabel = text => {
    if (pauseLabelEl) pauseLabelEl.textContent = text;
  };

  const setActionLabel = text => {
    if (restartLabelEl) restartLabelEl.textContent = text;
  };

  const setPauseEnabled = enabled => {
    if (pauseBtn) pauseBtn.disabled = !enabled;
  };

  const updateScore = () => {
    if (leftScoreEl) leftScoreEl.textContent = String(leftScore);
    if (rightScoreEl) rightScoreEl.textContent = String(rightScore);
  };

  const updateMode = () => {
    if (!modeEl) return;
    modeEl.textContent = Date.now() < manualRightUntil ? "Manual" : "AI";
  };

  const drawNet = () => {
    ctx.fillStyle = "rgba(103, 223, 255, 0.22)";
    for (let y = 14; y < canvasHeight; y += 28) {
      ctx.fillRect(canvasWidth / 2 - 1, y, 2, 14);
    }
  };

  const drawPaddle = (x, y, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, paddleWidth, paddleHeight);
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillRect(x + 2, y + 4, 2, paddleHeight - 8);
  };

  const draw = () => {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#05090f";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = "rgba(103, 223, 255, 0.09)";
    ctx.lineWidth = 1;
    for (let y = 40; y < canvasHeight; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvasWidth, y + 0.5);
      ctx.stroke();
    }

    drawNet();
    drawPaddle(paddleInset, leftPaddle.y, "#53f5c0");
    drawPaddle(canvasWidth - paddleInset - paddleWidth, rightPaddle.y, "#67dfff");

    ctx.fillStyle = "#ffd17d";
    ctx.fillRect(ball.x - ballSize / 2, ball.y - ballSize / 2, ballSize, ballSize);

    ctx.strokeStyle = "rgba(83, 245, 192, 0.95)";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvasWidth - 4, canvasHeight - 4);
    ctx.strokeStyle = "rgba(103, 223, 255, 0.72)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(7, 7, canvasWidth - 14, canvasHeight - 14);
  };

  const stopLoop = () => {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = null;
    lastFrameTime = 0;
  };

  const resetBall = direction => {
    const speed = 260;
    const angle = (Math.random() * 0.7) - 0.35;
    ball = {
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      vx: speed * direction,
      vy: speed * angle
    };
  };

  const resetPositions = () => {
    leftPaddle.y = (canvasHeight - paddleHeight) / 2;
    rightPaddle.y = (canvasHeight - paddleHeight) / 2;
    resetBall(Math.random() > 0.5 ? 1 : -1);
  };

  const prepareStartState = () => {
    leftScore = 0;
    rightScore = 0;
    keys.clear();
    manualRightUntil = 0;
    active = false;
    paused = false;
    updateScore();
    updateMode();
    resetPositions();
    setStatus("Ready");
    setOverlay("Press Start to play", true);
    setActionLabel("Start");
    setPauseLabel("Pause");
    stopLoop();
    setPauseEnabled(false);
    draw();
  };

  const startMatch = () => {
    leftScore = 0;
    rightScore = 0;
    keys.clear();
    manualRightUntil = 0;
    active = true;
    paused = false;
    updateScore();
    updateMode();
    resetPositions();
    setStatus("Playing");
    setOverlay("", false);
    setActionLabel("Restart");
    setPauseLabel("Pause");
    setPauseEnabled(true);
    stopLoop();
    frameId = window.requestAnimationFrame(loop);
    draw();
  };

  const scorePoint = side => {
    if (side === "left") {
      leftScore += 1;
      setStatus("Left scores");
      resetBall(1);
    } else {
      rightScore += 1;
      setStatus("Right scores");
      resetBall(-1);
    }

    updateScore();
    leftPaddle.y = clamp(leftPaddle.y, 0, canvasHeight - paddleHeight);
    rightPaddle.y = clamp(rightPaddle.y, 0, canvasHeight - paddleHeight);
  };

  const movePlayerPaddles = delta => {
    let leftMove = 0;
    if (keys.has("w") || keys.has("ArrowUp")) leftMove -= 1;
    if (keys.has("s") || keys.has("ArrowDown")) leftMove += 1;

    if (leftMove) {
      leftPaddle.y = clamp(leftPaddle.y + leftMove * paddleSpeed * delta, 0, canvasHeight - paddleHeight);
    }

    const hasRightInput = keys.has("i") || keys.has("k");
    if (hasRightInput) manualRightUntil = Date.now() + manualRightMs;
    const rightManual = Date.now() < manualRightUntil;
    let rightMove = 0;
    if (keys.has("i")) rightMove -= 1;
    if (keys.has("k")) rightMove += 1;

    if (rightManual && rightMove) {
      rightPaddle.y = clamp(rightPaddle.y + rightMove * paddleSpeed * delta, 0, canvasHeight - paddleHeight);
      return;
    }

    if (!rightManual) {
      const center = rightPaddle.y + paddleHeight / 2;
      const target = ball.y;
      const diff = target - center;
      const movement = clamp(diff, -aiSpeed * delta, aiSpeed * delta);
      rightPaddle.y = clamp(rightPaddle.y + movement, 0, canvasHeight - paddleHeight);
    }
  };

  const collidePaddle = (paddle, side) => {
    const paddleX = side === "left" ? paddleInset : canvasWidth - paddleInset - paddleWidth;
    const ballLeft = ball.x - ballSize / 2;
    const ballRight = ball.x + ballSize / 2;
    const ballTop = ball.y - ballSize / 2;
    const ballBottom = ball.y + ballSize / 2;
    const paddleRight = paddleX + paddleWidth;
    const movingToward = side === "left" ? ball.vx < 0 : ball.vx > 0;

    if (!movingToward) return;
    if (ballBottom < paddle.y || ballTop > paddle.y + paddleHeight) return;
    if (ballRight < paddleX || ballLeft > paddleRight) return;

    const hitOffset = ((ball.y - (paddle.y + paddleHeight / 2)) / (paddleHeight / 2));
    const nextSpeed = Math.min(Math.abs(ball.vx) + 18, 420);
    ball.vx = side === "left" ? nextSpeed : -nextSpeed;
    ball.vy = clamp(hitOffset, -1, 1) * 260;
    ball.x = side === "left" ? paddleRight + ballSize / 2 : paddleX - ballSize / 2;
  };

  const update = delta => {
    movePlayerPaddles(delta);
    updateMode();

    ball.x += ball.vx * delta;
    ball.y += ball.vy * delta;

    if (ball.y - ballSize / 2 <= 0) {
      ball.y = ballSize / 2;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.y + ballSize / 2 >= canvasHeight) {
      ball.y = canvasHeight - ballSize / 2;
      ball.vy = -Math.abs(ball.vy);
    }

    collidePaddle(leftPaddle, "left");
    collidePaddle(rightPaddle, "right");

    if (ball.x + ballSize / 2 < 0) {
      scorePoint("right");
    } else if (ball.x - ballSize / 2 > canvasWidth) {
      scorePoint("left");
    } else if (statusEl?.textContent !== "Playing") {
      setStatus("Playing");
    }
  };

  const loop = timestamp => {
    if (!active || paused) return;
    const delta = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.034) : 0;
    lastFrameTime = timestamp;

    update(delta);
    draw();
    frameId = window.requestAnimationFrame(loop);
  };

  const togglePause = () => {
    if (!active) return;

    paused = !paused;
    if (paused) {
      stopLoop();
      setStatus("Paused");
      setOverlay("Paused", true);
      setPauseLabel("Resume");
    } else {
      setStatus("Playing");
      setOverlay("", false);
      setPauseLabel("Pause");
      frameId = window.requestAnimationFrame(loop);
    }
  };

  const isTypingTarget = target => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  };

  const isFocusedPong = () => {
    const pongWindow = document.getElementById("app-pong");
    return Boolean(pongWindow && pongWindow.dataset.state === "open" && pongWindow.dataset.focused === "true");
  };

  const normalizeKey = key => key.length === 1 ? key.toLowerCase() : key;

  const handleKeydown = event => {
    if (!isFocusedPong()) return;
    if (isTypingTarget(event.target)) return;

    const key = normalizeKey(event.key);

    if (key === " ") {
      event.preventDefault();
      if (active) togglePause();
      else startMatch();
      return;
    }

    if (key === "p") {
      if (!active) return;
      event.preventDefault();
      togglePause();
      return;
    }

    if (key === "Enter") {
      event.preventDefault();
      startMatch();
      return;
    }

    if (["w", "s", "i", "k", "ArrowUp", "ArrowDown"].includes(key)) {
      event.preventDefault();
      keys.add(key);
      if (key === "i" || key === "k") {
        manualRightUntil = Date.now() + manualRightMs;
        updateMode();
      }
    }
  };

  const handleKeyup = event => {
    const key = normalizeKey(event.key);
    if (keys.has(key)) keys.delete(key);
  };

  const handleWindowOpen = event => {
    if (event.detail?.appId !== "pong") return;
    prepareStartState();
  };

  const handleWindowClose = event => {
    if (event.detail?.appId !== "pong") return;
    active = false;
    paused = false;
    keys.clear();
    setActionLabel("Start");
    setPauseLabel("Pause");
    setPauseEnabled(false);
    stopLoop();
  };

  const init = () => {
    canvas = document.getElementById("pongCanvas");
    leftScoreEl = document.getElementById("pongLeftScore");
    rightScoreEl = document.getElementById("pongRightScore");
    modeEl = document.getElementById("pongMode");
    statusEl = document.getElementById("pongStatus");
    overlayEl = document.getElementById("pongOverlay");
    restartBtn = document.getElementById("pongRestart");
    restartLabelEl = restartBtn?.querySelector("span");
    pauseBtn = document.getElementById("pongPause");
    pauseLabelEl = pauseBtn?.querySelector("span");

    if (!canvas) return;

    ctx = canvas.getContext("2d");
    prepareStartState();

    restartBtn?.addEventListener("click", startMatch);
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
