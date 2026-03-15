const gridSize = 4;
let score = 0;

// Logical board: 2D array of tile objects or null
// tile: { id, value, el }
let board = [];
let tileIdCounter = 0;
let isAnimating = false;

const gridEl = document.getElementById("grid");

// ─── Setup empty cells (visual background only) ───────────────────────────────
function createGrid() {
    for (let i = 0; i < gridSize * gridSize; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        gridEl.appendChild(cell);
    }
    // initialise empty board
    for (let y = 0; y < gridSize; y++) {
        board[y] = [];
        for (let x = 0; x < gridSize; x++) {
            board[y][x] = null;
        }
    }
}

// ─── Tile geometry helpers ─────────────────────────────────────────────────────

// Returns the computed inner width of the grid (excluding padding)
function getGridInnerSize() {
    const style = getComputedStyle(gridEl);
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    return gridEl.clientWidth - padding;
}

function getCellSize() {
    const gap = parseFloat(getComputedStyle(gridEl).gap) || 10;
    return (getGridInnerSize() - gap * (gridSize - 1)) / gridSize;
}

function getCellOffset(pos) {
    const gap = parseFloat(getComputedStyle(gridEl).gap) || 10;
    const padding = parseFloat(getComputedStyle(gridEl).paddingLeft) || 10;
    return padding + pos * (getCellSize() + gap);
}

// ─── Tile DOM helpers ──────────────────────────────────────────────────────────

function createTileEl(value, x, y) {
    const el = document.createElement("div");
    el.className = "tile";
    setTileStyle(el, value);
    positionTileEl(el, x, y);
    gridEl.appendChild(el);
    return el;
}

function setTileStyle(el, value) {
    const imgIndex = Math.log2(value);
    if (imgIndex >= 1 && imgIndex <= 11) {
        el.style.backgroundImage = `url('./img/${imgIndex}.png')`;
    } else {
        el.style.backgroundImage = '';
    }
    // size
    const size = getCellSize();
    el.style.width = size + "px";
    el.style.height = size + "px";
}

function positionTileEl(el, x, y) {
    el.style.left = getCellOffset(x) + "px";
    el.style.top  = getCellOffset(y) + "px";
}

// ─── Tile generation ───────────────────────────────────────────────────────────

function generateTile() {
    const empty = [];
    for (let y = 0; y < gridSize; y++)
        for (let x = 0; x < gridSize; x++)
            if (!board[y][x]) empty.push({ x, y });

    if (empty.length === 0) return;
    const { x, y } = empty[Math.floor(Math.random() * empty.length)];
    const value = Math.random() < 0.75 ? 2 : 4;

    const el = createTileEl(value, x, y);
    el.classList.add("appear");
    el.addEventListener("animationend", () => el.classList.remove("appear"), { once: true });

    board[y][x] = { id: tileIdCounter++, value, el };
}

// ─── Version label ─────────────────────────────────────────────────────────────

function updateVersion() {
    let max = 0;
    for (let y = 0; y < gridSize; y++)
        for (let x = 0; x < gridSize; x++)
            if (board[y][x]) max = Math.max(max, board[y][x].value);

    let label = "Bebe";
    if      (max >= 2048) label = "Adulta (legal) 🧑‍🦳";
    else if (max >= 1024) label = "Madre Tierra 🌍";
    else if (max >=  512) label = "Alaska 🐻";
    else if (max >=  256) label = "Estudiante 📕";
    else if (max >=  128) label = "Adicta 📱";
    else if (max >=   64) label = "Playa 🏖️";
    else if (max >=   32) label = "Furry 🐾";
    else if (max >=   16) label = "Pasto 🌱";
    else if (max >=    8) label = "Halloween 👻";
    else if (max >=    4) label = "Chiquita 🥹";

    document.getElementById("version").textContent = label;
}

// ─── Slide logic (operates on a 1-D row of tile objects or null) ───────────────

// Returns { newRow, mergedIds, scoreGained }
function slideRow(row) {
    // filter out nulls
    let filtered = row.filter(t => t !== null);
    const mergedIds = new Set();
    let scoreGained = 0;

    for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i].value === filtered[i + 1].value &&
            !mergedIds.has(filtered[i].id) &&
            !mergedIds.has(filtered[i + 1].id)) {

            filtered[i].value *= 2;
            scoreGained += filtered[i].value;
            mergedIds.add(filtered[i + 1].id); // mark the eaten tile
            filtered[i + 1] = null;
        }
    }

    filtered = filtered.filter(t => t !== null);
    while (filtered.length < gridSize) filtered.push(null);

    return { newRow: filtered, mergedIds, scoreGained };
}

// ─── Move ──────────────────────────────────────────────────────────────────────

function move(direction) {
    if (isAnimating) return;

    let moved = false;
    const allMergedIds = new Set();
    let totalScore = 0;

    // We iterate over "lines" — for each direction, a line is a row or column
    for (let i = 0; i < gridSize; i++) {
        // Extract the line as an array of tiles in slide-direction order
        let line = [];
        for (let j = 0; j < gridSize; j++) {
            if (direction === "left")  line.push(board[i][j]);
            if (direction === "right") line.push(board[i][gridSize - 1 - j]);
            if (direction === "up")    line.push(board[j][i]);
            if (direction === "down")  line.push(board[gridSize - 1 - j][i]);
        }

        const { newRow, mergedIds, scoreGained } = slideRow(line);
        totalScore += scoreGained;
        mergedIds.forEach(id => allMergedIds.add(id));

        // Write the new line back to the board and update tile positions
        for (let j = 0; j < gridSize; j++) {
            let tx, ty;
            if (direction === "left")  { tx = j;               ty = i; }
            if (direction === "right") { tx = gridSize - 1 - j; ty = i; }
            if (direction === "up")    { tx = i;               ty = j; }
            if (direction === "down")  { tx = i;               ty = gridSize - 1 - j; }

            const tile = newRow[j];
            const prev = (direction === "left")  ? board[ty][tx] :
                         (direction === "right") ? board[ty][tx] :
                         (direction === "up")    ? board[ty][tx] :
                                                   board[ty][tx];

            if (tile !== prev) moved = true;
            board[ty][tx] = tile;

            if (tile) {
                positionTileEl(tile.el, tx, ty); // CSS transition slides it
            }
        }
    }

    if (!moved) return;

    score += totalScore;
    document.getElementById("score").textContent = score;
    isAnimating = true;

    // After the slide transition, clean up merged tiles and spawn a new one
    setTimeout(() => {
        // Remove the "eaten" tiles from the DOM
        allMergedIds.forEach(id => {
            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < gridSize; x++) {
                    const t = board[y][x];
                    // the eaten tile was already overwritten in board; find it by DOM
                }
            }
        });

        // Find tiles whose id is in allMergedIds — they're still in the DOM
        // but no longer in the board. Remove them.
        const allTilesInDOM = Array.from(gridEl.querySelectorAll(".tile"));
        const boardTileEls = new Set();
        for (let y = 0; y < gridSize; y++)
            for (let x = 0; x < gridSize; x++)
                if (board[y][x]) boardTileEls.add(board[y][x].el);

        allTilesInDOM.forEach(el => {
            if (!boardTileEls.has(el)) el.remove();
        });

        // Update images of merged survivors and add pop animation
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const t = board[y][x];
                if (t && allMergedIds.size > 0) {
                    // Any tile that survived a merge has an updated value
                    setTileStyle(t.el, t.value);
                    if (totalScore > 0) {
                        t.el.classList.add("merged");
                        t.el.addEventListener("animationend", () => t.el.classList.remove("merged"), { once: true });
                    }
                }
            }
        }

        generateTile();
        updateVersion();
        isAnimating = false;
        checkGameOver();
    }, 140); // matches CSS transition duration
}

// ─── Game over / win ───────────────────────────────────────────────────────────

function checkGameOver() {
    for (let y = 0; y < gridSize; y++)
        for (let x = 0; x < gridSize; x++)
            if (board[y][x] && board[y][x].value === 2048) {
                showEndScreen("Ganaste! 🎉");
                return;
            }

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if (!board[y][x]) return; // empty cell → not over
            const v = board[y][x].value;
            if (x < gridSize - 1 && board[y][x + 1] && board[y][x + 1].value === v) return;
            if (y < gridSize - 1 && board[y + 1][x] && board[y + 1][x].value === v) return;
        }
    }

    showEndScreen("Perdiste! 😢");
}

function showEndScreen(message) {
    document.getElementById("end-message").textContent = message;
    document.getElementById("end-screen").style.display = "flex";
}

// ─── Restart ───────────────────────────────────────────────────────────────────

function restartGame() {
    // Remove all tile elements
    gridEl.querySelectorAll(".tile").forEach(el => el.remove());

    // Reset board
    for (let y = 0; y < gridSize; y++)
        for (let x = 0; x < gridSize; x++)
            board[y][x] = null;

    score = 0;
    document.getElementById("score").textContent = 0;
    isAnimating = false;

    generateTile();
    generateTile();
    updateVersion();
    document.getElementById("end-screen").style.display = "none";
}

// ─── Resize: re-position all tiles when window resizes ────────────────────────
window.addEventListener("resize", () => {
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const t = board[y][x];
            if (t) {
                // disable transition momentarily so resize is instant
                t.el.style.transition = "none";
                setTileStyle(t.el, t.value);
                positionTileEl(t.el, x, y);
                // re-enable after paint
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        t.el.style.transition = "";
                    });
                });
            }
        }
    }
});

// ─── Input ─────────────────────────────────────────────────────────────────────

document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft")  { e.preventDefault(); move("left");  }
    else if (e.key === "ArrowRight") { e.preventDefault(); move("right"); }
    else if (e.key === "ArrowUp")    { e.preventDefault(); move("up");    }
    else if (e.key === "ArrowDown")  { e.preventDefault(); move("down");  }
});

let startX, startY;

document.addEventListener("touchstart", e => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
});

document.addEventListener("touchend", e => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX >  30) move("right");
        else if (deltaX < -30) move("left");
    } else {
        if (deltaY >  30) move("down");
        else if (deltaY < -30) move("up");
    }
});

document.addEventListener("touchmove", e => e.preventDefault(), { passive: false });

// ─── Boot ──────────────────────────────────────────────────────────────────────
createGrid();
generateTile();
generateTile();
updateVersion();
