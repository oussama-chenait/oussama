let tiles = [];
let score = 0;
let bestScore = localStorage.getItem("bestScore") || 0;
let previousStates = [];
let tileIdCounter = 0;
let isGameOver = false;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("best-score").innerText = bestScore;
    initGame();
    setupInputs();
    
    document.getElementById("new-game-btn").addEventListener("click", initGame);
    document.getElementById("retry-btn").addEventListener("click", initGame);
    document.getElementById("undo-btn").addEventListener("click", undo);
    document.getElementById("keep-playing-btn").addEventListener("click", () => {
        document.getElementById("game-message").className = "game-message";
    });
});

function initGame() {
    tiles.forEach(t => t.element.remove());
    tiles = [];
    score = 0;
    isGameOver = false;
    previousStates = [];
    updateScoreUI();
    document.getElementById("game-message").className = "game-message";
    addRandomTile();
    addRandomTile();
}

function saveState() {
    previousStates.push({
        score: score,
        tiles: tiles.map(t => ({ id: t.id, r: t.r, c: t.c, val: t.val }))
    });
    if (previousStates.length > 20) previousStates.shift();
}

function undo() {
    if (previousStates.length === 0 || document.getElementById("game-message").className.includes("game-won")) return;
    
    let state = previousStates.pop();
    score = state.score;
    updateScoreUI();
    isGameOver = false;
    document.getElementById("game-message").className = "game-message";
    
    tiles.forEach(t => t.element.remove());
    tiles = state.tiles.map(t => {
        let tile = { id: t.id, r: t.r, c: t.c, val: t.val, isNew: false, merged: false, toBeDeleted: false };
        createTileElement(tile);
        return tile;
    });
    renderTiles();
}

function addRandomTile() {
    let emptySpots = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (!tiles.find(t => t.r === r && t.c === c && !t.toBeDeleted)) {
                emptySpots.push({ r, c });
            }
        }
    }
    if (emptySpots.length > 0) {
        let spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
        let val = Math.random() < 0.9 ? 2 : 4;
        let tile = { id: ++tileIdCounter, r: spot.r, c: spot.c, val: val, isNew: true, merged: false, toBeDeleted: false };
        tiles.push(tile);
        createTileElement(tile);
    }
}

const getPosCSS = (pos) => `calc(${pos} * var(--cell-size) + (${pos} + 1) * var(--cell-gap))`;

function createTileElement(tile) {
    let el = document.createElement("div");
    el.className = "tile";
    if (tile.isNew) el.classList.add("tile-new");
    el.setAttribute("data-val", tile.val);
    
    let inner = document.createElement("div");
    inner.className = "tile-inner";
    inner.innerText = tile.val;
    el.appendChild(inner);

    document.getElementById("tile-container").appendChild(el);
    tile.element = el;
    
    el.style.transform = `translate(${getPosCSS(tile.c)}, ${getPosCSS(tile.r)})`;
}

function renderTiles() {
    tiles.forEach(t => {
        t.element.setAttribute("data-val", t.val);
        t.element.querySelector('.tile-inner').innerText = t.val;
        t.element.style.transform = `translate(${getPosCSS(t.c)}, ${getPosCSS(t.r)})`;
        t.element.classList.remove("tile-new");
        
        if (t.merged) {
            t.element.classList.add("tile-merged");
            setTimeout(() => {
                if (t.element) t.element.classList.remove("tile-merged");
            }, 300);
        }
        
        if (t.toBeDeleted) {
            t.element.style.zIndex = 1;
        } else {
            t.element.style.zIndex = Math.max(10, Math.log2(t.val) * 10);
        }
    });

    let deletedTiles = tiles.filter(t => t.toBeDeleted);
    deletedTiles.forEach(t => {
        setTimeout(() => {
            if (t.element && t.element.parentNode) {
                t.element.parentNode.removeChild(t.element);
            }
        }, 150);
    });
    
    tiles = tiles.filter(t => !t.toBeDeleted);
    tiles.forEach(t => { t.merged = false; t.isNew = false; });
}

function rotateCoordinates(times) {
    for (let i = 0; i < times; i++) {
        tiles.forEach(t => {
            let newR = t.c;
            let newC = 3 - t.r;
            t.r = newR;
            t.c = newC;
        });
    }
}

function moveLeft() {
    let hasMoved = false;
    let scoreIncrease = 0;

    for (let r = 0; r < 4; r++) {
        let rowTiles = tiles.filter(t => t.r === r && !t.toBeDeleted).sort((a, b) => a.c - b.c);
        let insertCol = 0;
        let previousTile = null;

        rowTiles.forEach((tile) => {
            if (previousTile && previousTile.val === tile.val && !previousTile.merged) {
                tile.c = previousTile.c;
                previousTile.val *= 2;
                previousTile.merged = true;
                tile.toBeDeleted = true;
                hasMoved = true;
                scoreIncrease += previousTile.val;
                previousTile = null;
            } else {
                if (tile.c !== insertCol) {
                    tile.c = insertCol;
                    hasMoved = true;
                }
                previousTile = tile;
                insertCol++;
            }
        });
    }
    return { hasMoved, scoreIncrease };
}

function move(direction) {
    if (isGameOver) return;
    
    // Create a snapshot string to verify actually moves (since coords change)
    let tilesBefore = JSON.stringify(tiles.map(t => ({r: t.r, c: t.c, val: t.val})).sort((a,b) => a.r - b.r || a.c - b.c));
    
    // Only save state if a valid move happens, but we must temporarily copy state just in case
    let tempScore = score;
    let tempTilesState = tiles.map(t => ({ id: t.id, r: t.r, c: t.c, val: t.val }));

    let moveData = { hasMoved: false, scoreIncrease: 0 };
    
    if (direction === 'LEFT') {
        moveData = moveLeft();
    } else if (direction === 'RIGHT') {
        rotateCoordinates(2);
        moveData = moveLeft();
        rotateCoordinates(2);
    } else if (direction === 'UP') {
        rotateCoordinates(3);
        moveData = moveLeft();
        rotateCoordinates(1);
    } else if (direction === 'DOWN') {
        rotateCoordinates(1);
        moveData = moveLeft();
        rotateCoordinates(3);
    }

    if (moveData.hasMoved) {
        // Now save previous state safely
        previousStates.push({ score: tempScore, tiles: tempTilesState });
        if (previousStates.length > 20) previousStates.shift();

        addScore(moveData.scoreIncrease);
        addRandomTile();
        renderTiles();
        setTimeout(checkGameState, 150);
    }
}

function addScore(amount) {
    if (amount === 0) return;
    score += amount;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
    }
    updateScoreUI(amount);
}

function updateScoreUI(increase = 0) {
    document.getElementById("score").innerText = score;
    document.getElementById("best-score").innerText = bestScore;
    
    if (increase > 0) {
        let addition = document.getElementById("score-addition");
        addition.innerText = "+" + increase;
        addition.classList.remove("active");
        void addition.offsetWidth; // trigger reflow
        addition.classList.add("active");
    }
}

function checkGameState() {
    let won = tiles.some(t => t.val === 2048 && t.isNew === false && t.toBeDeleted === false);
    if (won && document.getElementById("game-message").className !== "game-message game-won") {
        let msg = document.getElementById("game-message");
        document.getElementById("game-message-text").innerText = "لقد فزت!";
        document.getElementById("keep-playing-btn").style.display = "inline-block";
        msg.className = "game-message game-won";
        return;
    }

    let activeTiles = tiles.filter(t => !t.toBeDeleted);
    if (activeTiles.length === 16) {
        let canMove = false;
        
        for (let r = 0; r < 4; r++) {
            let rowTiles = activeTiles.filter(t => t.r === r).sort((a, b) => a.c - b.c);
            for (let i = 0; i < 3; i++) {
                if (rowTiles[i].val === rowTiles[i + 1].val) { canMove = true; break; }
            }
        }
        
        for (let c = 0; c < 4; c++) {
            let colTiles = activeTiles.filter(t => t.c === c).sort((a, b) => a.r - b.r);
            for (let i = 0; i < 3; i++) {
                if (colTiles[i].val === colTiles[i + 1].val) { canMove = true; break; }
            }
        }

        if (!canMove) {
            isGameOver = true;
            document.getElementById("game-message-text").innerText = "لقد خسرت!";
            document.getElementById("keep-playing-btn").style.display = "none";
            document.getElementById("game-message").className = "game-message game-over";
        }
    }
}

function setupInputs() {
    document.addEventListener("keydown", (e) => {
        if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)){
            e.preventDefault();
            switch (e.key) {
                case "ArrowUp": move('UP'); break;
                case "ArrowDown": move('DOWN'); break;
                case "ArrowLeft": move('LEFT'); break;
                case "ArrowRight": move('RIGHT'); break;
            }
        }
    });

    let touchStartX = 0;
    let touchStartY = 0;
    const gameContainer = document.getElementById("game-container");

    gameContainer.addEventListener("touchstart", (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        if(e.target.tagName !== "BUTTON") e.preventDefault(); 
    }, {passive: false});

    gameContainer.addEventListener("touchend", (e) => {
        if(!touchStartX || !touchStartY) return;
        
        let touchEndX = e.changedTouches[0].clientX;
        let touchEndY = e.changedTouches[0].clientY;
        
        let dx = touchEndX - touchStartX;
        let dy = touchEndY - touchStartY;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) > 30) {
                if (dx > 0) move('RIGHT');
                else move('LEFT');
            }
        } else {
            if (Math.abs(dy) > 30) {
                if (dy > 0) move('DOWN');
                else move('UP');
            }
        }
        touchStartX = 0;
        touchStartY = 0;
    }, {passive: false});
}
