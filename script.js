const gridSize = 4;
const grid = [];
let score = 0;

function createGrid() {
    const gridEl = document.getElementById("grid");
    for (let i = 0; i < gridSize * gridSize; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.value = 0;
        gridEl.appendChild(cell);
        grid.push(cell);
    }
}

function getCell(x, y) {
    return grid[y * gridSize + x];
}

function generateTile() {
    const empty = grid.filter(c => c.dataset.value == 0);
    if (empty.length === 0) return;
    const random = empty[Math.floor(Math.random() * empty.length)];
    random.dataset.value = 2;
    updateCellStyle(random);
}

function updateCellStyle(cell) {
    const val = Number(cell.dataset.value);
    if (val === 0) {
        cell.style.backgroundImage = '';
    } else {
        const imgIndex = Math.log2(val); // 2 -> 1.png, 4 -> 2.png, etc.
        if (imgIndex >= 1 && imgIndex <= 11) {
            cell.style.backgroundImage = `url('./img/${imgIndex}.png')`;

        } else {
            cell.style.backgroundImage = '';
        }
    }
}

function updateGrid() {
    grid.forEach(updateCellStyle);
    document.getElementById("score").textContent = score;
}

function slide(row) {
    row = row.filter(val => val !== 0);
    for (let i = 0; i < row.length - 1; i++) {
        if (row[i] === row[i + 1]) {
            row[i] *= 2;
            score += row[i];
            row[i + 1] = 0;
        }
    }
    row = row.filter(val => val !== 0);
    while (row.length < gridSize) {
        row.push(0);
    }
    return row;
}

function move(direction) {
    let moved = false;

    for (let y = 0; y < gridSize; y++) {
        let row = [];
        for (let x = 0; x < gridSize; x++) {
            const cell = direction === "left" ? getCell(x, y) :
                direction === "right" ? getCell(gridSize - 1 - x, y) :
                    direction === "up" ? getCell(y, x) :
                        getCell(y, gridSize - 1 - x);
            row.push(Number(cell.dataset.value));
        }

        const original = [...row];
        row = slide(row);

        for (let x = 0; x < gridSize; x++) {
            const val = row[x];
            const cell = direction === "left" ? getCell(x, y) :
                direction === "right" ? getCell(gridSize - 1 - x, y) :
                    direction === "up" ? getCell(y, x) :
                        getCell(y, gridSize - 1 - x);
            if (Number(cell.dataset.value) !== val) {
                moved = true;
            }
            cell.dataset.value = val;
        }
    }

    if (moved) {
        generateTile();
        updateGrid();
    }
}

document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") move("left");
    else if (e.key === "ArrowRight") move("right");
    else if (e.key === "ArrowUp") move("up");
    else if (e.key === "ArrowDown") move("down");
});

createGrid();
generateTile();
generateTile();
updateGrid();