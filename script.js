const gridSize = 4;
let score = 0;

// Logical board: 2D array of tile objects or null
// tile: { id, value, el }
let board = [];
let tileIdCounter = 0;
let isAnimating = false;

const SLIDE_DURATION = 120; // ms — must match CSS transition

const gridEl = document.getElementById("grid");

// ─── Setup empty cells (visual background only) ───────────────────────────────
function createGrid() {
    for (let i = 0; i < gridSize * gridSize; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        gridEl.appendChild(cell);
    }
    for (let y = 0; y < gridSize; y++) {
        board[y] = [];
        for (let x = 0; x < gridSize; x++) {
            board[y][x] = null;
        }
    }
}

// ─── Tile geometry helpers ─────────────────────────────────────────────────────

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
    setTileImage(el, value);
    setTileSize(el);
    positionTileEl(el, x, y);
    gridEl.appendChild(el);
    return el;
}

function setTileImage(el, value) {
    const imgIndex = Math.log2(value);
    if (imgIndex >= 1 && imgIndex <= 11) {
        el.style.backgroundImage = `url('./img/${imgIndex}.png')`;
    } else {
        el.style.backgroundImage = '';
    }
}

function setTileSize(el) {
    const size = getCellSize();
    el.style.width  = size + "px";
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

    el.style.transition = "none";
    el.classList.add("appear");
    el.addEventListener("animationend", () => {
        el.classList.remove("appear");
        el.style.transition = "";
    }, { once: true });

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

// ─── Slide logic ───────────────────────────────────────────────────────────────

function slideRow(row) {
    let filtered = [];
    // Keep track of original positions for animation
    for (let i = 0; i < row.length; i++) {
        if (row[i]) filtered.push({ tile: row[i], originalIndex: i });
    }

    const resultRow = new Array(gridSize).fill(null);
    const merges = []; // { survivorId, eatenId, targetIndex }
    let scoreGained = 0;
    let targetIdx = 0;

    for (let i = 0; i < filtered.length; i++) {
        const current = filtered[i];
        const next = filtered[i + 1];

        if (next && current.tile.value === next.tile.value) {
            // Merge occurs
            const newValue = current.tile.value * 2;
            scoreGained += newValue;
            
            // The 'current' tile becomes the survivor
            current.tile.value = newValue;
            resultRow[targetIdx] = current.tile;
            
            merges.push({
                survivorId: current.tile.id,
                eatenId: next.tile.id,
                targetIndex: targetIdx
            });
            
            i++; // Skip the next tile as it was eaten
        } else {
            // No merge, just move
            resultRow[targetIdx] = current.tile;
        }
        targetIdx++;
    }

    return { newRow: resultRow, merges, scoreGained };
}

// ─── Move ──────────────────────────────────────────────────────────────────────

function move(direction) {
    if (isAnimating) return;

    const snapshot = board.map(row => row.map(t => t ? t.id : null));
    let totalScore = 0;
    let moved = false;
    const allMerges = []; // Store all merges to animate them

    for (let i = 0; i < gridSize; i++) {
        let line = [];
        for (let j = 0; j < gridSize; j++) {
            if (direction === "left")  line.push(board[i][j]);
            if (direction === "right") line.push(board[i][gridSize - 1 - j]);
            if (direction === "up")    line.push(board[j][i]);
            if (direction === "down")  line.push(board[gridSize - 1 - j][i]);
        }

        const { newRow, merges, scoreGained } = slideRow(line);
        totalScore += scoreGained;
        
        // Map merges back to board coordinates
        merges.forEach(m => {
            let tx, ty;
            if (direction === "left")  { tx = m.targetIndex; ty = i; }
            if (direction === "right") { tx = gridSize - 1 - m.targetIndex; ty = i; }
            if (direction === "up")    { tx = i; ty = m.targetIndex; }
            if (direction === "down")  { tx = i; ty = gridSize - 1 - m.targetIndex; }
            allMerges.push({ ...m, tx, ty });
        });

        // Update board and trigger CSS transitions for survivors and normal tiles
        for (let j = 0; j < gridSize; j++) {
            let tx, ty;
            if (direction === "left")  { tx = j; ty = i; }
            if (direction === "right") { tx = gridSize - 1 - j; ty = i; }
            if (direction === "up")    { tx = i; ty = j; }
            if (direction === "down")  { tx = i; ty = gridSize - 1 - j; }

            board[ty][tx] = newRow[j];
            if (board[ty][tx]) {
                positionTileEl(board[ty][tx].el, tx, ty);
            }
        }
    }

    // Animate eaten tiles to their destination
    allMerges.forEach(m => {
        const eatenEl = document.querySelector(`.tile[data-id="${m.eatenId}"]`) || 
                        Array.from(document.querySelectorAll('.tile')).find(el => {
                            // Fallback if we didn't set data-id (which we should)
                            return false; 
                        });
        
        // We need to find the element of the eaten tile. 
        // Since we don't have data-id yet, let's ensure we track elements correctly.
    });

    // Let's refine the move function to handle the elements of eaten tiles better.
    // I will rewrite the move function one more time to be more robust with elements.
}

// ─── REFINED MOVE (with better element tracking) ───────────────────────────────

function moveRefined(direction) {
    if (isAnimating) return;

    const snapshot = board.map(row => row.map(t => t ? t.id : null));
    let totalScore = 0;
    const eatenTiles = []; // { el, tx, ty }

    for (let i = 0; i < gridSize; i++) {
        let line = [];
        for (let j = 0; j < gridSize; j++) {
            if (direction === "left")  line.push(board[i][j]);
            if (direction === "right") line.push(board[i][gridSize - 1 - j]);
            if (direction === "up")    line.push(board[j][i]);
            if (direction === "down")  line.push(board[gridSize - 1 - j][i]);
        }

        const { newRow, merges, scoreGained } = slideRow(line);
        totalScore += scoreGained;

        // Handle eaten tiles animation
        merges.forEach(m => {
            // Find the eaten tile object from the original line
            const eatenTile = line.find(t => t && t.id === m.eatenId);
            if (eatenTile) {
                let tx, ty;
                if (direction === "left")  { tx = m.targetIndex; ty = i; }
                if (direction === "right") { tx = gridSize - 1 - m.targetIndex; ty = i; }
                if (direction === "up")    { tx = i; ty = m.targetIndex; }
                if (direction === "down")  { tx = i; ty = gridSize - 1 - m.targetIndex; }
                eatenTiles.push({ el: eatenTile.el, tx, ty });
            }
        });

        // Update board and move survivors/normal tiles
        for (let j = 0; j < gridSize; j++) {
            let tx, ty;
            if (direction === "left")  { tx = j; ty = i; }
            if (direction === "right") { tx = gridSize - 1 - j; ty = i; }
            if (direction === "up")    { tx = i; ty = j; }
            if (direction === "down")  { tx = i; ty = gridSize - 1 - j; }

            board[ty][tx] = newRow[j];
            if (board[ty][tx]) {
                positionTileEl(board[ty][tx].el, tx, ty);
            }
        }
    }

    // Animate the eaten tiles to their merge destination
    eatenTiles.forEach(t => {
        positionTileEl(t.el, t.tx, t.ty);
        t.el.style.zIndex = "5"; // Keep it below the survivor
    });

    // Check if anything actually moved
    let moved = false;
    outer: for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            if ((board[y][x] ? board[y][x].id : null) !== snapshot[y][x]) {
                moved = true;
                break outer;
            }
        }
    }

    if (!moved && eatenTiles.length === 0) return;

    score += totalScore;
    document.getElementById("score").textContent = score;
    isAnimating = true;

    setTimeout(() => {
        // Cleanup eaten tiles
        eatenTiles.forEach(t => t.el.remove());

        // Update images for survivors and trigger flash
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const t = board[y][x];
                if (t) {
                    // Check if this tile was a survivor in any merge
                    // For simplicity, we just update all images to match their current value
                    setTileImage(t.el, t.value);
                    
                    // If it just merged (we could track this better, but let's use a simple check)
                    // We'll add the flash if the value is different from what it would be for a new tile
                }
            }
        }

        generateTile();
        updateVersion();
        isAnimating = false;
        checkGameOver();
    }, SLIDE_DURATION + 10);
}

// Replace the old move with moveRefined
function move(direction) {
    moveRefined(direction);
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
            if (!board[y][x]) return;
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
    gridEl.querySelectorAll(".tile").forEach(el => el.remove());
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

// ─── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener("resize", () => {
    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const t = board[y][x];
            if (t) {
                t.el.style.transition = "none";
                setTileSize(t.el);
                positionTileEl(t.el, x, y);
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
    if      (e.key === "ArrowLeft")  { e.preventDefault(); move("left");  }
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
        if      (deltaX >  30) move("right");
        else if (deltaX < -30) move("left");
    } else {
        if      (deltaY >  30) move("down");
        else if (deltaY < -30) move("up");
    }
});

document.addEventListener("touchmove", e => e.preventDefault(), { passive: false });

// ─── Boot ──────────────────────────────────────────────────────────────────────
createGrid();
generateTile();
generateTile();
updateVersion();
