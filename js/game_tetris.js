(() => {
  const cols = 10;
  const rows = 20;
  const cellSize = 24;
  const nextCellSize = 18;
  const lineScores = [0, 100, 300, 500, 800];
  const colors = {
    I: "#67dfff",
    O: "#ffd17d",
    T: "#c39bff",
    S: "#53f5c0",
    Z: "#ff7a87",
    J: "#6e8fff",
    L: "#ffb86b"
  };
  const shapes = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    O: [
      [1, 1],
      [1, 1]
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ]
  };

  let canvas;
  let ctx;
  let nextCanvas;
  let nextCtx;
  let scoreEl;
  let linesEl;
  let levelEl;
  let statusEl;
  let overlayEl;
  let restartBtn;
  let restartLabelEl;
  let pauseBtn;
  let pauseLabelEl;
  let timerId = null;
  let board = [];
  let currentPiece = null;
  let nextPiece = null;
  let score = 0;
  let clearedLines = 0;
  let level = 1;
  let active = false;
  let paused = false;
  let gameOver = false;

  const emptyBoard = () => Array.from({ length: rows }, () => Array(cols).fill(""));
  const randomType = () => Object.keys(shapes)[Math.floor(Math.random() * Object.keys(shapes).length)];
  const cloneMatrix = matrix => matrix.map(row => [...row]);
  const dropInterval = () => Math.max(120, 760 - (level - 1) * 62);

  const setStatus = text => {
    if (statusEl) statusEl.textContent = text;
  };

  const setOverlay = (text = "", visible = false) => {
    if (!overlayEl) return;
    overlayEl.textContent = text;
    overlayEl.dataset.visible = String(visible);
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

  const updateHud = () => {
    if (scoreEl) scoreEl.textContent = String(score);
    if (linesEl) linesEl.textContent = String(clearedLines);
    if (levelEl) levelEl.textContent = String(level);
  };

  const stopLoop = () => {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  };

  const startLoop = () => {
    stopLoop();
    timerId = window.setInterval(dropPiece, dropInterval());
  };

  const createPiece = (type = randomType()) => ({
    type,
    matrix: cloneMatrix(shapes[type]),
    row: type === "I" ? -1 : 0,
    col: Math.floor((cols - shapes[type][0].length) / 2)
  });

  const eachBlock = (piece, callback) => {
    piece.matrix.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if (!value) return;
        callback(piece.row + rowIndex, piece.col + colIndex);
      });
    });
  };

  const collides = piece => {
    let hit = false;
    eachBlock(piece, (row, col) => {
      if (col < 0 || col >= cols || row >= rows) {
        hit = true;
        return;
      }
      if (row >= 0 && board[row][col]) hit = true;
    });
    return hit;
  };

  const rotateMatrix = matrix => {
    const size = matrix.length;
    const rotated = Array.from({ length: size }, () => Array(size).fill(0));

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        rotated[col][size - 1 - row] = matrix[row][col];
      }
    }

    return rotated;
  };

  const drawBlock = (context, x, y, size, color) => {
    context.fillStyle = color;
    context.fillRect(x + 1, y + 1, size - 2, size - 2);
    context.fillStyle = "rgba(255, 255, 255, 0.25)";
    context.fillRect(x + 3, y + 3, size - 6, 3);
    context.strokeStyle = "rgba(3, 7, 12, 0.42)";
    context.lineWidth = 1;
    context.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
  };

  const drawGrid = () => {
    ctx.strokeStyle = "rgba(103, 223, 255, 0.055)";
    ctx.lineWidth = 1;

    for (let col = 1; col < cols; col += 1) {
      const x = Math.round(col * cellSize) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rows * cellSize);
      ctx.stroke();
    }

    for (let row = 1; row < rows; row += 1) {
      const y = Math.round(row * cellSize) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cols * cellSize, y);
      ctx.stroke();
    }
  };

  const drawBoard = () => {
    board.forEach((row, rowIndex) => {
      row.forEach((type, colIndex) => {
        if (!type) return;
        drawBlock(ctx, colIndex * cellSize, rowIndex * cellSize, cellSize, colors[type]);
      });
    });
  };

  const drawPiece = piece => {
    if (!piece) return;
    eachBlock(piece, (row, col) => {
      if (row < 0) return;
      drawBlock(ctx, col * cellSize, row * cellSize, cellSize, colors[piece.type]);
    });
  };

  const drawNext = () => {
    if (!nextCtx || !nextCanvas) return;

    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.fillStyle = "#05090f";
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPiece) return;

    const matrix = nextPiece.matrix;
    const blockRows = matrix.filter(row => row.some(Boolean));
    const firstCol = Math.min(...matrix.flatMap(row => row.map((value, index) => value ? index : Infinity)).filter(Number.isFinite));
    const lastCol = Math.max(...matrix.flatMap(row => row.map((value, index) => value ? index : -Infinity)).filter(Number.isFinite));
    const width = lastCol - firstCol + 1;
    const height = blockRows.length;
    const offsetX = Math.floor((nextCanvas.width - width * nextCellSize) / 2);
    const offsetY = Math.floor((nextCanvas.height - height * nextCellSize) / 2);
    let visibleRow = 0;

    matrix.forEach(row => {
      if (!row.some(Boolean)) return;
      row.forEach((value, colIndex) => {
        if (!value) return;
        drawBlock(
          nextCtx,
          offsetX + (colIndex - firstCol) * nextCellSize,
          offsetY + visibleRow * nextCellSize,
          nextCellSize,
          colors[nextPiece.type]
        );
      });
      visibleRow += 1;
    });
  };

  const draw = () => {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#05090f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawBoard();
    drawPiece(currentPiece);
    ctx.strokeStyle = "rgba(83, 245, 192, 0.95)";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    ctx.strokeStyle = "rgba(103, 223, 255, 0.62)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
    drawNext();
  };

  const mergePiece = () => {
    eachBlock(currentPiece, (row, col) => {
      if (row >= 0) board[row][col] = currentPiece.type;
    });
  };

  const clearLines = () => {
    let count = 0;

    for (let row = rows - 1; row >= 0; row -= 1) {
      if (!board[row].every(Boolean)) continue;
      board.splice(row, 1);
      board.unshift(Array(cols).fill(""));
      count += 1;
      row += 1;
    }

    if (!count) return;

    clearedLines += count;
    level = Math.floor(clearedLines / 10) + 1;
    score += lineScores[count] * level;
    updateHud();
    setStatus(`${count} line${count === 1 ? "" : "s"} cleared`);
    startLoop();
  };

  const spawnPiece = () => {
    currentPiece = nextPiece || createPiece();
    nextPiece = createPiece();

    if (collides(currentPiece)) {
      gameOver = true;
      active = false;
      paused = false;
      stopLoop();
      setStatus("Game over");
      setOverlay("Game over - press Restart", true);
      setActionLabel("Restart");
      setPauseLabel("Pause");
      setPauseEnabled(false);
    }
  };

  function dropPiece() {
    if (!active || paused || gameOver || !currentPiece) return;

    const next = { ...currentPiece, row: currentPiece.row + 1 };
    if (!collides(next)) {
      currentPiece = next;
      draw();
      return;
    }

    mergePiece();
    clearLines();
    spawnPiece();
    draw();
  }

  const movePiece = direction => {
    if (!active || paused || gameOver || !currentPiece) return;

    const next = { ...currentPiece, col: currentPiece.col + direction };
    if (collides(next)) return;
    currentPiece = next;
    setStatus("Playing");
    draw();
  };

  const rotatePiece = () => {
    if (!active || paused || gameOver || !currentPiece) return;
    if (currentPiece.type === "O") return;

    const rotated = { ...currentPiece, matrix: rotateMatrix(currentPiece.matrix) };
    const kicks = [0, -1, 1, -2, 2];
    const kicked = kicks
      .map(offset => ({ ...rotated, col: rotated.col + offset }))
      .find(candidate => !collides(candidate));

    if (!kicked) return;
    currentPiece = kicked;
    setStatus("Rotated");
    draw();
  };

  const softDrop = () => {
    if (!active || paused || gameOver || !currentPiece) return;

    const next = { ...currentPiece, row: currentPiece.row + 1 };
    if (collides(next)) {
      dropPiece();
      return;
    }

    currentPiece = next;
    score += 1;
    updateHud();
    draw();
  };

  const hardDrop = () => {
    if (!active || paused || gameOver || !currentPiece) return;

    let distance = 0;
    let next = { ...currentPiece, row: currentPiece.row + 1 };

    while (!collides(next)) {
      currentPiece = next;
      distance += 1;
      next = { ...currentPiece, row: currentPiece.row + 1 };
    }

    score += distance * 2;
    updateHud();
    dropPiece();
    setStatus("Hard drop");
  };

  const prepareGame = () => {
    board = emptyBoard();
    score = 0;
    clearedLines = 0;
    level = 1;
    active = false;
    paused = false;
    gameOver = false;
    currentPiece = null;
    nextPiece = createPiece();
    updateHud();
    setStatus("Ready");
    setOverlay("Press Start or Enter", true);
    setActionLabel("Start");
    setPauseLabel("Pause");
    setPauseEnabled(false);
    stopLoop();
    spawnPiece();
    draw();
  };

  const startGame = () => {
    board = emptyBoard();
    score = 0;
    clearedLines = 0;
    level = 1;
    active = true;
    paused = false;
    gameOver = false;
    nextPiece = createPiece();
    spawnPiece();
    updateHud();
    setStatus("Playing");
    setOverlay("", false);
    setActionLabel("Restart");
    setPauseLabel("Pause");
    setPauseEnabled(true);
    startLoop();
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
      setStatus("Playing");
      setOverlay("", false);
      setPauseLabel("Pause");
      startLoop();
    }
  };

  const isTypingTarget = target => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  };

  const isFocusedTetris = () => {
    const tetrisWindow = document.getElementById("app-tetris");
    return Boolean(tetrisWindow && tetrisWindow.dataset.state === "open" && tetrisWindow.dataset.focused === "true");
  };

  const normalizeKey = key => key.length === 1 ? key.toLowerCase() : key;

  const handleKeydown = event => {
    if (!isFocusedTetris()) return;
    if (isTypingTarget(event.target)) return;

    const key = normalizeKey(event.key);

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

    if (key === " ") {
      event.preventDefault();
      hardDrop();
      return;
    }

    if (key === "ArrowLeft" || key === "a") {
      event.preventDefault();
      movePiece(-1);
      return;
    }

    if (key === "ArrowRight" || key === "d") {
      event.preventDefault();
      movePiece(1);
      return;
    }

    if (key === "ArrowDown" || key === "s") {
      event.preventDefault();
      softDrop();
      return;
    }

    if (key === "ArrowUp" || key === "w") {
      event.preventDefault();
      rotatePiece();
    }
  };

  const handleWindowOpen = event => {
    if (event.detail?.appId !== "tetris") return;
    startGame();
  };

  const handleWindowClose = event => {
    if (event.detail?.appId !== "tetris") return;
    active = false;
    paused = false;
    stopLoop();
  };

  const init = () => {
    canvas = document.getElementById("tetrisCanvas");
    nextCanvas = document.getElementById("tetrisNextCanvas");
    scoreEl = document.getElementById("tetrisScore");
    linesEl = document.getElementById("tetrisLines");
    levelEl = document.getElementById("tetrisLevel");
    statusEl = document.getElementById("tetrisStatus");
    overlayEl = document.getElementById("tetrisOverlay");
    restartBtn = document.getElementById("tetrisRestart");
    restartLabelEl = restartBtn?.querySelector("span");
    pauseBtn = document.getElementById("tetrisPause");
    pauseLabelEl = pauseBtn?.querySelector("span");

    if (!canvas) return;

    ctx = canvas.getContext("2d");
    nextCtx = nextCanvas?.getContext("2d");
    prepareGame();

    restartBtn?.addEventListener("click", startGame);
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
