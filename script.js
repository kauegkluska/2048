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
function updateVersion() {
    const max = Math.max(...grid.map(cell => Number(cell.dataset.value)));
    const versionEl = document.getElementById("version");

    let label = "Bebe";
    if (max >= 2048) label = "Adulta (legal) 🧑‍🦳";
    else if (max >= 1024) label = "Madre Tierra 🌍";
    else if (max >= 512) label = "Alaska 🐻";
    else if (max >= 256) label = "Estudiante 📕";
    else if (max >= 128) label = "Adicta 📱";
    else if (max >= 64) label = "Playa 🏖️";
    else if (max >= 32) label = "Furry 🐾";
    else if (max >= 16) label = "Pasto 🌱";
    else if (max >= 8) label = "Halloween 👻";
    else if (max >= 4) label = "Chiquita 🥹";

    versionEl.textContent = label;
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

    random.classList.add('appear');
    random.addEventListener('animationend', () => {
        random.classList.remove('appear');
    }, { once: true });
}

function updateCellStyle(cell) {
    const val = Number(cell.dataset.value);
    if (val === 0) {
        cell.style.backgroundImage = '';
        cell.style.opacity = '1';
    } else {
        const imgIndex = Math.log2(val);
        if (imgIndex >= 1 && imgIndex <= 11) {
            cell.style.backgroundImage = `url('./img/${imgIndex}.png')`;
        } else {
            cell.style.backgroundImage = '';
        }
        cell.style.opacity = '1';
    }
}

function updateGrid() {
    grid.forEach(updateCellStyle);
    document.getElementById("score").textContent = score;
    updateVersion();
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

function animateBounce(cell) {
    cell.classList.add('bounce');
    setTimeout(() => {
        cell.classList.remove('bounce');
    }, 400);
}

function move(direction) {
    let moved = false;

    for (let y = 0; y < gridSize; y++) {
        let row = [];
        let oldValues = [];

        for (let x = 0; x < gridSize; x++) {
            const cell = direction === "left" ? getCell(x, y) :
                direction === "right" ? getCell(gridSize - 1 - x, y) :
                    direction === "up" ? getCell(y, x) :
                        getCell(y, gridSize - 1 - x);
            row.push(Number(cell.dataset.value));
            oldValues.push(Number(cell.dataset.value));
        }

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

            if (val > 0 && val > oldValues[x]) {
                animateBounce(cell);
            }

            cell.dataset.value = val;
            updateCellStyle(cell);
        }
    }

    if (moved) {
        generateTile();
        updateGrid();
        checkGameOver();
    }

}
function checkGameOver() {

    for (const cell of grid) {
        if (Number(cell.dataset.value) === 2048) {
            showEndScreen("Ganaste! 🎉");
            return;
        }
    }

    for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
            const current = Number(getCell(x, y).dataset.value);
            if (current === 0) return;


            const right = x < gridSize - 1 ? Number(getCell(x + 1, y).dataset.value) : null;
            const down = y < gridSize - 1 ? Number(getCell(x, y + 1).dataset.value) : null;

            if (current === right || current === down) return;
        }
    }


    showEndScreen("Perdiste! 😢");
}

function showEndScreen(message) {
    const endScreen = document.getElementById("end-screen");
    document.getElementById("end-message").textContent = message;
    endScreen.style.display = "flex";
}
function restartGame() {
    for (const cell of grid) {
        cell.dataset.value = 0;
    }
    score = 0;
    updateGrid();
    generateTile();
    generateTile();
    document.getElementById("end-screen").style.display = "none";
}



document.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") move("left");
    else if (e.key === "ArrowRight") move("right");
    else if (e.key === "ArrowUp") move("up");
    else if (e.key === "ArrowDown") move("down");
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
        if (deltaX > 30) move("right");
        else if (deltaX < -30) move("left");
    } else {
        if (deltaY > 30) move("down");
        else if (deltaY < -30) move("up");
    }
});
document.addEventListener('touchmove', function (e) {
    e.preventDefault();
}, { passive: false });
createGrid();
generateTile();
generateTile();
updateGrid();
