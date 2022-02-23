(() => {
  const rows = 9;
  const cols = 9;
  const mineTotal = 10;

  let boardEl;
  let mineCountEl;
  let timerEl;
  let statusEl;
  let restartBtn;
  let timerId = null;
  let elapsed = 0;
  let started = false;
  let gameOver = false;
  let revealedSafe = 0;
  let flaggedCount = 0;
  let cells = [];

  const formatTime = value => String(Math.min(value, 999)).padStart(3, "0");
  const cellIndex = (row, col) => row * cols + col;
  const inBounds = (row, col) => row >= 0 && row < rows && col >= 0 && col < cols;

  const setStatus = text => {
    if (statusEl) statusEl.textContent = text;
  };

  const updateMineCount = () => {
    if (mineCountEl) mineCountEl.textContent = String(Math.max(0, mineTotal - flaggedCount));
  };

  const updateTimer = () => {
    if (timerEl) timerEl.textContent = formatTime(elapsed);
  };

  const stopTimer = () => {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  };

  const startTimer = () => {
    if (timerId) return;
    timerId = window.setInterval(() => {
      elapsed += 1;
      updateTimer();
    }, 1000);
  };

  const neighborsOf = cell => {
    const neighbors = [];

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) continue;
        const row = cell.row + rowOffset;
        const col = cell.col + colOffset;
        if (inBounds(row, col)) neighbors.push(cells[cellIndex(row, col)]);
      }
    }

    return neighbors;
  };

  const countAdjacentMines = cell => neighborsOf(cell).filter(neighbor => neighbor.mine).length;

  const renderCell = cell => {
    if (!cell.button) return;

    cell.button.dataset.count = "";
    cell.button.textContent = "";

    if (cell.exploded) {
      cell.button.dataset.state = "exploded";
      cell.button.textContent = "*";
      return;
    }

    if (cell.revealed) {
      cell.button.dataset.state = cell.mine ? "mine" : "revealed";
      if (cell.mine) {
        cell.button.textContent = "*";
      } else if (cell.adjacent > 0) {
        cell.button.dataset.count = String(cell.adjacent);
        cell.button.textContent = String(cell.adjacent);
      }
      return;
    }

    if (cell.flagged) {
      cell.button.dataset.state = "flagged";
      cell.button.textContent = "F";
      return;
    }

    cell.button.dataset.state = "hidden";
  };

  const renderBoard = () => {
    cells.forEach(renderCell);
    updateMineCount();
    updateTimer();
  };

  const setCellsDisabled = disabled => {
    cells.forEach(cell => {
      cell.button.disabled = disabled;
    });
  };

  const placeMines = safeCell => {
    const candidates = cells.filter(cell => cell !== safeCell);

    for (let placed = 0; placed < mineTotal && candidates.length; placed += 1) {
      const index = Math.floor(Math.random() * candidates.length);
      const [cell] = candidates.splice(index, 1);
      cell.mine = true;
    }

    cells.forEach(cell => {
      cell.adjacent = countAdjacentMines(cell);
    });
  };

  const revealAllMines = explodedCell => {
    cells.forEach(cell => {
      if (!cell.mine) return;
      cell.revealed = true;
      cell.exploded = cell === explodedCell;
      renderCell(cell);
    });
  };

  const finishLoss = cell => {
    gameOver = true;
    stopTimer();
    revealAllMines(cell);
    setCellsDisabled(true);
    setStatus("Game over");
  };

  const finishWin = () => {
    gameOver = true;
    stopTimer();
    cells.forEach(cell => {
      if (cell.mine && !cell.flagged) {
        cell.flagged = true;
        flaggedCount += 1;
        renderCell(cell);
      }
    });
    updateMineCount();
    setCellsDisabled(true);
    setStatus("Minefield cleared");
  };

  const checkWin = () => {
    if (revealedSafe === rows * cols - mineTotal) finishWin();
  };

  const revealSafeCell = cell => {
    if (cell.revealed || cell.flagged) return;

    cell.revealed = true;
    revealedSafe += 1;
    renderCell(cell);

    if (cell.adjacent !== 0) return;

    neighborsOf(cell).forEach(neighbor => {
      if (!neighbor.mine) revealSafeCell(neighbor);
    });
  };

  const revealCell = cell => {
    if (gameOver || cell.revealed || cell.flagged) return;

    if (!started) {
      started = true;
      placeMines(cell);
      startTimer();
      setStatus("Clearing field");
    }

    if (cell.mine) {
      cell.revealed = true;
      finishLoss(cell);
      return;
    }

    revealSafeCell(cell);
    checkWin();
  };

  const toggleFlag = cell => {
    if (gameOver || cell.revealed) return;

    cell.flagged = !cell.flagged;
    flaggedCount += cell.flagged ? 1 : -1;
    renderCell(cell);
    updateMineCount();
    setStatus(cell.flagged ? "Flag placed" : "Flag removed");
  };

  const buildCells = () => {
    if (!boardEl) return;

    boardEl.innerHTML = "";
    cells = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "minesweeper-cell";
        button.disabled = false;
        button.dataset.state = "hidden";
        button.dataset.count = "";
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-label", `Hidden cell row ${row + 1}, column ${col + 1}`);

        const cell = {
          row,
          col,
          button,
          mine: false,
          adjacent: 0,
          revealed: false,
          flagged: false,
          exploded: false
        };

        button.addEventListener("click", () => revealCell(cell));
        button.addEventListener("contextmenu", event => {
          event.preventDefault();
          toggleFlag(cell);
        });

        cells.push(cell);
        boardEl.appendChild(button);
      }
    }
  };

  const resetGame = () => {
    stopTimer();
    elapsed = 0;
    started = false;
    gameOver = false;
    revealedSafe = 0;
    flaggedCount = 0;
    buildCells();
    renderBoard();
    setStatus("Ready");
  };

  const stopGame = () => {
    stopTimer();
    started = false;
    gameOver = true;
  };

  const handleWindowOpen = event => {
    if (event.detail?.appId !== "minesweeper") return;
    resetGame();
  };

  const handleWindowClose = event => {
    if (event.detail?.appId !== "minesweeper") return;
    stopGame();
  };

  const init = () => {
    boardEl = document.getElementById("minesweeperBoard");
    mineCountEl = document.getElementById("minesweeperMineCount");
    timerEl = document.getElementById("minesweeperTimer");
    statusEl = document.getElementById("minesweeperStatus");
    restartBtn = document.getElementById("minesweeperRestart");

    if (!boardEl) return;

    resetGame();
    restartBtn?.addEventListener("click", resetGame);
    window.addEventListener("kmx:window-open", handleWindowOpen);
    window.addEventListener("kmx:window-close", handleWindowClose);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
