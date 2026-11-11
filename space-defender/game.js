// =============================================
// IPM: SPACE DEFENDER
// =============================================


// =============================================
// 1. GAME CANVAS
// =============================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const highScoresList = document.getElementById("highScoresList");


// =============================================
// 2. SCORE SYSTEM AND TOP 5 LEADERBOARD
// =============================================

let score = 0;
let highScore = Number(localStorage.getItem("spaceDefenderHighScore")) || 0;
let runStartingHighScore = highScore;
let qualifiesForTopFive = false;
let achievedNewHighScore = false;

const TOP_SCORES_KEY = "spaceDefenderTopScores";
const TOP_SCORES_RESET_KEY = "spaceDefenderTopScoresFreshStart";

// Clear old records only once.
if (localStorage.getItem(TOP_SCORES_RESET_KEY) !== "done") {
    localStorage.removeItem(TOP_SCORES_KEY);
    localStorage.setItem(TOP_SCORES_RESET_KEY, "done");
}

function loadTopScores() {
    try {
        const savedScores = JSON.parse(localStorage.getItem(TOP_SCORES_KEY)) || [];

        if (!Array.isArray(savedScores)) {
            return [];
        }

        return savedScores
            .filter(record =>
                record &&
                typeof record.name === "string" &&
                Number.isFinite(record.score) &&
                record.score >= 0
            )
            .sort((a, b) => {
                // Highest score first; newest record first when tied.
                if (b.score !== a.score) {
                    return b.score - a.score;
                }

                return (b.timestamp || 0) - (a.timestamp || 0);
            })
            .slice(0, 5);
    } catch (error) {
        return [];
    }
}

let topScores = loadTopScores();

function recordTopScore(playerName, newScore) {
    if (!Number.isFinite(newScore) || newScore < 0) {
        return;
    }

    topScores.push({
        name: playerName,
        score: newScore,
        timestamp: Date.now()
    });

    // Keep the highest five scores, newest first when tied.
    topScores.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }

        return (b.timestamp || 0) - (a.timestamp || 0);
    });

    topScores = topScores.slice(0, 5);

    localStorage.setItem(TOP_SCORES_KEY, JSON.stringify(topScores));
}

function displayTopScores() {
    highScoresList.innerHTML = "";

    for (let i = 0; i < 5; i++) {
        const row = document.createElement("div");
        row.classList.add("score-row");

        const rank = document.createElement("span");
        rank.textContent = "RANK " + (i + 1);

        const scoreDisplay = document.createElement("span");
        if (topScores[i] !== undefined) {
            scoreDisplay.textContent =
                topScores[i].name + " — " + topScores[i].score;
        } else {
            scoreDisplay.textContent = "EMPTY";
        }

        row.appendChild(rank);
        row.appendChild(scoreDisplay);
        highScoresList.appendChild(row);
    }
}

// Keep personal high-score persistence in one place.
function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("spaceDefenderHighScore", highScore);
    }
}


// =============================================
// 3. GAME STATES, SCREEN ELEMENTS, AND NAVIGATION
// =============================================

let isPaused = true;
let hasStarted = false;
let isGameOver = false;
let isPlayerDying = false;
let finalScore = 0;

const pauseButton = document.getElementById("pauseButton");
const quitGameButton = document.getElementById("quitGameButton");

// Main menu and game screen elements.
const mainMenu = document.getElementById("mainMenu");
const menuBackground = document.getElementById("menuBackground");
const menuCanvas = document.getElementById("menuCanvas");
const menuCtx = menuCanvas.getContext("2d");
const gameScreen = document.getElementById("gameScreen");
const gameControls = document.querySelector(".game-controls");
const startGameButton = document.getElementById("startGameButton");

// Menu animation state.
const menuStars = [];
const menuAliens = [];
let menuAnimationId = null;
let menuAlienSpawnTimer = 0;

function createMenuStars() {
    menuStars.length = 0;

    for (let i = 0; i < 100; i++) {
        menuStars.push({
            x: Math.random() * menuCanvas.width,
            y: Math.random() * menuCanvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 0.8 + 0.2
        });
    }
}

function createMenuAlien() {
    menuAliens.push({
        x: menuCanvas.width + 40,
        y: Math.random() * (menuCanvas.height - 60) + 30,
        width: 35,
        height: 25,
        speed: Math.random() * 1 + 1
    });
}

createMenuStars();

function updateMenuStars() {
    menuStars.forEach(star => {
        star.x -= star.speed;

        if (star.x < 0) {
            star.x = menuCanvas.width;
            star.y = Math.random() * menuCanvas.height;
        }
    });
}

function updateMenuAliens() {
    menuAliens.forEach(alien => {
        alien.x -= alien.speed;
    });

    for (let i = menuAliens.length - 1; i >= 0; i--) {
        if (menuAliens[i].x + menuAliens[i].width < 0) {
            menuAliens.splice(i, 1);
        }
    }
}

function drawMenuStars() {
    menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
    menuCtx.fillStyle = "#ffffff";

    menuStars.forEach(star => {
        menuCtx.fillRect(star.x, star.y, star.size, star.size);
    });

    // Main menu high score.
    menuCtx.fillStyle = "#fde047";
    menuCtx.shadowColor = "#fde047";
    menuCtx.shadowBlur = 8;
    menuCtx.font = "bold 16px Verdana";
    menuCtx.textAlign = "right";
    menuCtx.fillText("HIGH SCORE: " + highScore, menuCanvas.width - 25, 30);
    menuCtx.shadowBlur = 0;
    menuCtx.textAlign = "left";
}

function drawMenuAliens() {
    menuAliens.forEach(alien => {
        const x = alien.x;
        const y = alien.y;

        menuCtx.save();

        // Engine glow at the rear.
        menuCtx.shadowColor = "#39ff14";
        menuCtx.shadowBlur = 10;
        menuCtx.fillStyle = "#ff8c00";
        menuCtx.fillRect(x + 29, y + 10, 6, 5);
        menuCtx.shadowBlur = 0;

        // Upper wing.
        menuCtx.fillStyle = "#168b20";
        menuCtx.beginPath();
        menuCtx.moveTo(x + 12, y + 10);
        menuCtx.lineTo(x + 23, y);
        menuCtx.lineTo(x + 31, y + 7);
        menuCtx.lineTo(x + 25, y + 14);
        menuCtx.closePath();
        menuCtx.fill();

        // Lower wing.
        menuCtx.beginPath();
        menuCtx.moveTo(x + 12, y + 15);
        menuCtx.lineTo(x + 23, y + 25);
        menuCtx.lineTo(x + 31, y + 18);
        menuCtx.lineTo(x + 25, y + 11);
        menuCtx.closePath();
        menuCtx.fill();

        // Main spacecraft body.
        menuCtx.fillStyle = "#39ff14";
        menuCtx.beginPath();
        menuCtx.moveTo(x, y + 12);
        menuCtx.lineTo(x + 11, y + 7);
        menuCtx.lineTo(x + 29, y + 9);
        menuCtx.lineTo(x + 35, y + 12);
        menuCtx.lineTo(x + 29, y + 16);
        menuCtx.lineTo(x + 11, y + 18);
        menuCtx.closePath();
        menuCtx.fill();

        // Cockpit.
        menuCtx.fillStyle = "#b6ff9c";
        menuCtx.beginPath();
        menuCtx.ellipse(x + 16, y + 12, 5, 3, 0, 0, Math.PI * 2);
        menuCtx.fill();

        menuCtx.restore();
    });
}

function menuAnimationLoop() {
    updateMenuStars();
    updateMenuAliens();

    menuAlienSpawnTimer++;
    if (menuAlienSpawnTimer >= 180) {
        createMenuAlien();
        menuAlienSpawnTimer = 0;
    }

    drawMenuStars();
    drawMenuAliens();
    menuAnimationId = requestAnimationFrame(menuAnimationLoop);
}

// Other screen elements.
const highScoresScreen = document.getElementById("highScoresScreen");
const optionsScreen = document.getElementById("optionsScreen");
const controlsGuideScreen = document.getElementById("controlsGuideScreen");
const resetRecordsScreen = document.getElementById("resetRecordsScreen");
const resetConfirmationScreen = document.getElementById("resetConfirmationScreen");

const highScoresButton = document.getElementById("highScoresButton");
const optionsButton = document.getElementById("optionsButton");
const highScoresBackButton = document.getElementById("highScoresBackButton");
const optionsBackButton = document.getElementById("optionsBackButton");
const controlsGuideButton = document.getElementById("controlsGuideButton");
const controlsGuideBackButton = document.getElementById("controlsGuideBackButton");
const resetRecordsButton = document.getElementById("resetRecordsButton");
const resetLeaderboardButton = document.getElementById("resetLeaderboardButton");
const resetHighScoreButton = document.getElementById("resetHighScoreButton");
const resetRecordsBackButton = document.getElementById("resetRecordsBackButton");
const resetConfirmationMessage = document.getElementById("resetConfirmationMessage");
const confirmResetButton = document.getElementById("confirmResetButton");
const cancelResetButton = document.getElementById("cancelResetButton");

let pendingReset = null;

// Game-over and high-score screens.
const congratulationsScreen = document.getElementById("congratulationsScreen");
const nameEntryScreen = document.getElementById("nameEntryScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const congratulationsFinalScoreDisplay = document.getElementById("finalScoreDisplay");
const gameOverFinalScoreDisplay = document.getElementById("gameOverFinalScoreDisplay");
const continueToNameEntryButton = document.getElementById("continueToNameEntryButton");
const playerNameInput = document.getElementById("playerNameInput");
const saveRecordButton = document.getElementById("saveRecordButton");
const skipRecordButton = document.getElementById("skipRecordButton");
const playAgainButton = document.getElementById("playAgainButton");
const gameOverMenuButton = document.getElementById("gameOverMenuButton");

let recordSubmissionHandled = false;

// Show one screen at a time and manage the background animation.
function showScreen(screen) {
    // Hide all screens first.
    mainMenu.style.display = "none";
    menuBackground.style.display = "none";
    highScoresScreen.style.display = "none";
    optionsScreen.style.display = "none";
    controlsGuideScreen.style.display = "none";
    congratulationsScreen.style.display = "none";
    nameEntryScreen.style.display = "none";
    gameOverScreen.style.display = "none";
    gameScreen.style.display = "none";
    gameControls.style.display = "none";
    resetRecordsScreen.style.display = "none";
    resetConfirmationScreen.style.display = "none";

    // Show the selected screen and reset its scroll position.
    screen.style.display = "block";
    screen.scrollTop = 0;

    const menuOverlay = screen.querySelector(".menu-overlay");
    if (menuOverlay) {
        menuOverlay.scrollTop = 0;
    }

    // Screens that use the animated menu background.
    const menuScreens = [
        mainMenu,
        highScoresScreen,
        optionsScreen,
        controlsGuideScreen,
        resetRecordsScreen,
        resetConfirmationScreen
    ];

    if (menuScreens.includes(screen)) {
        menuBackground.style.display = "block";
    }

    // Restore the correct display layout for the selected screen.
    if (menuScreens.includes(screen)) {
        screen.style.display = "flex";
    }

    // Keep the battlefield visible behind the result screens.
    if (
        screen === congratulationsScreen ||
        screen === nameEntryScreen ||
        screen === gameOverScreen
    ) {
        gameScreen.style.display = "block";
        screen.style.display = "flex";
    }

    // Show controls only during gameplay.
    if (screen === gameScreen) {
        gameControls.style.display = "block";
    }

    // Start or stop the menu background animation as appropriate.
    if (menuScreens.includes(screen)) {
        if (menuAnimationId === null) {
            menuAnimationLoop();
        }
    } else if (menuAnimationId !== null) {
        cancelAnimationFrame(menuAnimationId);
        menuAnimationId = null;
    }
}

// Show the main menu when the game first loads.
requestAnimationFrame(() => {
    showScreen(mainMenu);
});


// =============================================
// 4. MENU AND SCREEN BUTTON EVENTS
// =============================================

startGameButton.addEventListener("click", function () {
    runStartingHighScore = highScore;
    achievedNewHighScore = false;
    qualifiesForTopFive = false;
    recordSubmissionHandled = false;

    showScreen(gameScreen);
    hasStarted = true;
    isPaused = false;
    pauseButton.textContent = "PAUSE GAME";
});

highScoresButton.addEventListener("click", () => {
    displayTopScores();
    showScreen(highScoresScreen);
});

highScoresBackButton.addEventListener("click", function () {
    showScreen(mainMenu);
});

optionsButton.addEventListener("click", function () {
    showScreen(optionsScreen);
});

resetRecordsButton.addEventListener("click", function () {
    showScreen(resetRecordsScreen);
});

resetRecordsBackButton.addEventListener("click", function () {
    showScreen(optionsScreen);
});

resetLeaderboardButton.addEventListener("click", function () {
    pendingReset = "leaderboard";
    resetConfirmationMessage.textContent =
        "ARE YOU SURE YOU WANT TO RESET THE TOP 5 LEADERBOARD?";
    showScreen(resetConfirmationScreen);
});

resetHighScoreButton.addEventListener("click", function () {
    pendingReset = "highScore";
    resetConfirmationMessage.textContent =
        "ARE YOU SURE YOU WANT TO RESET YOUR PERSONAL HIGH SCORE?";
    showScreen(resetConfirmationScreen);
});

confirmResetButton.addEventListener("click", function () {
    if (pendingReset === "leaderboard") {
        topScores = [];
        localStorage.removeItem(TOP_SCORES_KEY);
    } else if (pendingReset === "highScore") {
        highScore = 0;
        localStorage.removeItem("spaceDefenderHighScore");
    }

    pendingReset = null;
    showScreen(resetRecordsScreen);
});

cancelResetButton.addEventListener("click", function () {
    pendingReset = null;
    showScreen(resetRecordsScreen);
});

optionsBackButton.addEventListener("click", function () {
    showScreen(mainMenu);
});

controlsGuideButton.addEventListener("click", function () {
    showScreen(controlsGuideScreen);
});

controlsGuideBackButton.addEventListener("click", function () {
    showScreen(optionsScreen);
});

playAgainButton.addEventListener("click", function () {
    restartGame();
    showScreen(gameScreen);
});

gameOverMenuButton.addEventListener("click", function () {
    restartGame();
    isPaused = true;
    hasStarted = false;
    showScreen(mainMenu);
});

pauseButton.addEventListener("click", function () {
    // Prevent pausing during the player explosion.
    if (isPlayerDying) {
        return;
    }

    // Restart after Game Over.
    if (isGameOver) {
        restartGame();
        quitGameButton.style.display = "none";
        return;
    }

    // Start the game.
    if (!hasStarted) {
        runStartingHighScore = highScore;
        achievedNewHighScore = false;
        qualifiesForTopFive = false;
        recordSubmissionHandled = false;

        hasStarted = true;
        isPaused = false;
        pauseButton.textContent = "PAUSE GAME";
        quitGameButton.style.display = "none";
    }
    // Pause the game.
    else if (!isPaused) {
        isPaused = true;
        pauseButton.textContent = "RESUME GAME";
        quitGameButton.style.display = "inline-block";
    }
    // Resume the game.
    else {
        isPaused = false;
        pauseButton.textContent = "PAUSE GAME";
        quitGameButton.style.display = "none";
    }
});

quitGameButton.addEventListener("click", function () {
    restartGame();
    isPaused = true;
    hasStarted = false;
    quitGameButton.style.display = "none";
    showScreen(mainMenu);
});

continueToNameEntryButton.addEventListener("click", function () {
    if (qualifiesForTopFive && !recordSubmissionHandled) {
        showScreen(nameEntryScreen);
        playerNameInput.focus();
    }
});

function submitTopScore(playerName) {
    if (recordSubmissionHandled || !qualifiesForTopFive) {
        return;
    }

    recordTopScore(playerName, finalScore);
    recordSubmissionHandled = true;
    displayTopScores();
    showScreen(gameOverScreen);
}

saveRecordButton.addEventListener("click", function () {
    const playerName = playerNameInput.value.trim();

    if (playerName === "") {
        alert("PLEASE ENTER YOUR PILOT NAME!");
        playerNameInput.focus();
        return;
    }

    submitTopScore(playerName);
});

skipRecordButton.addEventListener("click", function () {
    submitTopScore("ANONYMOUS");
});


// =============================================
// 5. STARFIELD
// =============================================

const stars = [];

for (let i = 0; i < 7; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.7 + 0.2
    });
}

function drawStars(move = true) {
    ctx.fillStyle = "#050b18";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";

    stars.forEach(star => {
        ctx.fillRect(star.x, star.y, star.size, star.size);

        if (move) {
            star.x -= star.speed;

            if (star.x < 0) {
                star.x = canvas.width;
                star.y = Math.random() * canvas.height;
            }
        }
    });
}


// =============================================
// 6. PLAYER SPACESHIP AND ENGINE FLAME
// =============================================

const player = {
    x: 100,
    y: 220,
    width: 50,
    height: 35,
    speed: 4
};

function drawEngineFlame() {
    const flameLength = 10 + Math.random() * 10;

    ctx.save();

    // Outer orange flame.
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(player.x + 5, player.y + 11);
    ctx.lineTo(player.x - flameLength, player.y + 17.5);
    ctx.lineTo(player.x + 5, player.y + 24);
    ctx.closePath();
    ctx.fill();

    // Inner yellow flame.
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.moveTo(player.x + 3, player.y + 14);
    ctx.lineTo(player.x - flameLength * 0.55, player.y + 17.5);
    ctx.lineTo(player.x + 3, player.y + 21);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawPlayer() {
    drawEngineFlame();
    ctx.save();

    // Main spaceship body.
    ctx.fillStyle = "#60a5fa";
    ctx.beginPath();
    ctx.moveTo(player.x + player.width, player.y + player.height / 2);
    ctx.lineTo(player.x + 10, player.y);
    ctx.lineTo(player.x, player.y + player.height / 2);
    ctx.lineTo(player.x + 10, player.y + player.height);
    ctx.closePath();
    ctx.fill();

    // Cockpit.
    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.ellipse(
        player.x + 28,
        player.y + player.height / 2,
        8,
        5,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
}


// =============================================
// 7. KEYBOARD AND MOBILE TOUCH CONTROLS
// =============================================

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

let touchControlActive = false;
let touchPointerId = null;
let touchTargetX = 0;
let touchTargetY = 0;

// Keyboard controls (one listener pair only).
document.addEventListener("keydown", function (event) {
    if (event.key in keys) {
        event.preventDefault();
        keys[event.key] = true;
    }
});

document.addEventListener("keyup", function (event) {
    if (event.key in keys) {
        event.preventDefault();
        keys[event.key] = false;
    }
});

function updateTouchTarget(event) {
    const rect = canvas.getBoundingClientRect();

    touchTargetX =
        (event.clientX - rect.left) * (canvas.width / rect.width);
    touchTargetY =
        (event.clientY - rect.top) * (canvas.height / rect.height);
}

canvas.addEventListener("pointerdown", function (event) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") {
        return;
    }

    if (!hasStarted || isPaused || isPlayerDying || isGameOver) {
        return;
    }

    event.preventDefault();
    touchControlActive = true;
    touchPointerId = event.pointerId;
    updateTouchTarget(event);
    canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", function (event) {
    if (!touchControlActive || event.pointerId !== touchPointerId) {
        return;
    }

    event.preventDefault();
    updateTouchTarget(event);
});

function stopTouchControl(event) {
    if (event.pointerId !== touchPointerId) {
        return;
    }

    touchControlActive = false;
    touchPointerId = null;
}

canvas.addEventListener("pointerup", stopTouchControl);
canvas.addEventListener("pointercancel", stopTouchControl);
canvas.addEventListener("lostpointercapture", stopTouchControl);


// =============================================
// 8. PLAYER MOVEMENT
// =============================================

function updatePlayer() {
    // Mobile touch movement.
    if (touchControlActive) {
        player.x = touchTargetX - player.width / 2;
        player.y = touchTargetY - player.height / 2;
    }
    // Desktop keyboard movement.
    else {
        if (keys.ArrowUp) player.y -= player.speed;
        if (keys.ArrowDown) player.y += player.speed;
        if (keys.ArrowLeft) player.x -= player.speed;
        if (keys.ArrowRight) player.x += player.speed;
    }

    // Keep the spaceship inside the game area.
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}


// =============================================
// 9. AUTOMATIC PLAYER LASER SYSTEM
// =============================================

const lasers = [];
let laserCooldown = 0;

function createLaser() {
    lasers.push({
        x: player.x + player.width,
        y: player.y + player.height / 2 - 2,
        width: 20,
        height: 4,
        speed: 9
    });
}

function updateLasers() {
    // Automatically fire lasers.
    if (laserCooldown <= 0) {
        createLaser();
        laserCooldown = 25;
    }

    laserCooldown--;

    // Move lasers forward.
    lasers.forEach(laser => {
        laser.x += laser.speed;
    });

    // Remove lasers that have left the screen.
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];

        if (
            laser.x > canvas.width ||
            laser.y + laser.height < 0 ||
            laser.y > canvas.height
        ) {
            lasers.splice(i, 1);
        }
    }
}

function drawLasers() {
    lasers.forEach(laser => {
        ctx.save();
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
        ctx.restore();
    });
}


// =============================================
// 10. ALIEN SHIP AND BOSS SYSTEM
// =============================================

const aliens = [];
const enemyLasers = [];
let alienSpawnTimer = 0;
let aliensSpawned = 0;
const ENEMY_FIRE_START = 15;
let aliensDestroyedAfterFire = 0;
let alienSpeed = 2;
let aliensSpawnedAfterSpeedIncrease = 0;

let boss = null;
let bossesDefeated = 0;
const BOSS_HEALTH = 12;

function createAlien() {
    aliensSpawned++;

    if (alienSpeed > 2) {
        aliensSpawnedAfterSpeedIncrease++;
    }

    const size = 35;

    aliens.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - size),
        width: size,
        height: size,
        speed: alienSpeed,
        fireCooldown: Math.random() * 100 + 100
    });
}

function updateAliens() {
    // Spawn a boss after the required number of aliens has appeared.
    if (!boss && aliensSpawnedAfterSpeedIncrease >= 20) {
        createBoss();
        alienSpawnTimer = 0;
    }

    // Move the boss into position.
    if (boss && boss.x > boss.targetX) {
        boss.x -= boss.speed;
    }

    alienSpawnTimer++;

    // Spawn an alien every 90 frames while no boss is active.
    if (alienSpawnTimer >= 90 && !boss) {
        createAlien();
        alienSpawnTimer = 0;
    }

    // Move aliens toward the left.
    aliens.forEach(alien => {
        alien.x -= alien.speed;
    });

    // Remove aliens that have left the screen.
    for (let i = aliens.length - 1; i >= 0; i--) {
        if (aliens[i].x + aliens[i].width < 0) {
            aliens.splice(i, 1);
        }
    }
}

function createBoss() {
    boss = {
        x: canvas.width,
        y: canvas.height / 2 - 45,
        width: 120,
        height: 90,
        targetX: canvas.width - 170,
        speed: 1.2,
        health: BOSS_HEALTH,
        maxHealth: BOSS_HEALTH,
        fireCooldown: 90,
        heavyFireCooldown: 240,
        phase: 0
    };
}

function drawAliens() {
    aliens.forEach(alien => {
        ctx.save();

        // Alien ship body.
        ctx.fillStyle = "#a3e635";
        ctx.fillRect(alien.x + 5, alien.y + 12, 25, 12);

        // Upper cockpit.
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(alien.x + 11, alien.y + 5, 13, 9);

        // Lower wings.
        ctx.fillStyle = "#65a30d";
        ctx.fillRect(alien.x, alien.y + 17, 35, 5);

        // Alien lights.
        ctx.fillStyle = "#ecfccb";
        ctx.fillRect(alien.x + 9, alien.y + 16, 4, 3);
        ctx.fillRect(alien.x + 22, alien.y + 16, 4, 3);

        ctx.restore();
    });
}

function drawBoss() {
    if (!boss) return;

    ctx.save();

    // Hovering animation.
    const hover = Math.sin(Date.now() / 300) * 5;
    const bossY = boss.y + hover;

    // Main boss body.
    ctx.fillStyle = "#8b1e3f";
    ctx.shadowColor = "#ff1744";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(boss.x + boss.width, bossY + boss.height / 2);
    ctx.lineTo(boss.x + boss.width * 0.7, bossY);
    ctx.lineTo(boss.x + boss.width * 0.3, bossY + 8);
    ctx.lineTo(boss.x, bossY + boss.height / 2);
    ctx.lineTo(boss.x + boss.width * 0.3, bossY + boss.height - 8);
    ctx.lineTo(boss.x + boss.width * 0.7, bossY + boss.height);
    ctx.closePath();
    ctx.fill();

    // Glowing cockpit.
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(boss.x + 38, bossY + 30, 35, 30);

    // Side armor.
    ctx.fillStyle = "#ff1744";
    ctx.fillRect(boss.x + 15, bossY + 10, 20, 12);
    ctx.fillRect(boss.x + 15, bossY + boss.height - 22, 20, 12);

    // Health bar background.
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#333";
    ctx.fillRect(boss.x, bossY - 18, boss.width, 8);

    // Remaining health.
    ctx.fillStyle = "#ff1744";
    ctx.fillRect(
        boss.x,
        bossY - 18,
        boss.width * (boss.health / boss.maxHealth),
        8
    );

    ctx.restore();
}


// =============================================
// 11. ENEMY LASER SYSTEM
// =============================================

function updateEnemyLasers() {
    // Boss special attacks.
    if (boss && boss.x <= boss.targetX) {
        boss.fireCooldown--;

        // Triple energy shot.
        if (boss.fireCooldown <= 0) {
            const centerY = boss.y + boss.height / 2;

            enemyLasers.push(
                {
                    x: boss.x,
                    y: centerY - 10,
                    width: 15,
                    height: 7,
                    speed: 4.5,
                    verticalSpeed: -2.5,
                    type: "boss-spread"
                },
                {
                    x: boss.x,
                    y: centerY,
                    width: 15,
                    height: 7,
                    speed: 4.5,
                    verticalSpeed: 0,
                    type: "boss-spread"
                },
                {
                    x: boss.x,
                    y: centerY + 10,
                    width: 15,
                    height: 7,
                    speed: 4.5,
                    verticalSpeed: 2.5,
                    type: "boss-spread"
                }
            );

            boss.fireCooldown = 90;
        }

        // Heavy plasma shot.
        boss.heavyFireCooldown--;

        if (boss.heavyFireCooldown <= 0) {
            enemyLasers.push({
                x: boss.x,
                y: boss.y + boss.height / 2 - 8,
                width: 24,
                height: 16,
                speed: 3,
                verticalSpeed: 0,
                type: "boss-heavy"
            });

            boss.heavyFireCooldown = 240;
        }
    }

    // Activate alien firing only after 15 aliens have spawned.
    if (aliensSpawned <= ENEMY_FIRE_START) {
        return;
    }

    aliens.forEach(alien => {
        alien.fireCooldown--;

        if (alien.fireCooldown <= 0) {
            // 35% chance that this alien fires.
            if (Math.random() < 0.35) {
                enemyLasers.push({
                    x: alien.x,
                    y: alien.y + alien.height / 2 - 2,
                    width: 15,
                    height: 4,
                    speed: 5
                });
            }

            // Reset cooldown whether it fires or not.
            alien.fireCooldown = Math.random() * 100 + 100;
        }
    });

    // Move enemy lasers toward the left.
    enemyLasers.forEach(laser => {
        laser.x -= laser.speed;

        if (laser.verticalSpeed !== undefined) {
            laser.y += laser.verticalSpeed;
        }
    });

    // Remove lasers outside the screen.
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
        if (enemyLasers[i].x + enemyLasers[i].width < 0) {
            enemyLasers.splice(i, 1);
        }
    }
}

function drawEnemyLasers() {
    enemyLasers.forEach(laser => {
        ctx.save();

        if (laser.type === "boss-heavy") {
            ctx.shadowColor = "#a855f7";
            ctx.fillStyle = "#a855f7";
            ctx.shadowBlur = 20;
        } else if (laser.type === "boss-spread") {
            ctx.shadowColor = "#22d3ee";
            ctx.fillStyle = "#22d3ee";
            ctx.shadowBlur = 15;
        } else {
            ctx.shadowColor = "#ef4444";
            ctx.fillStyle = "#ef4444";
            ctx.shadowBlur = 12;
        }

        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
        ctx.restore();
    });
}


// =============================================
// 12. SPACE DEBRIS AND ASTEROID SYSTEM
// =============================================

const spaceDebris = [];
let debrisSpawnTimer = 0;
const DEBRIS_SPAWN_INTERVAL = 180;
const DEBRIS_SPEED = 1.5;

function createDebris() {
    const isLarge = Math.random() < 0.35;
    const size = isLarge
        ? Math.random() * 10 + 40
        : Math.random() * 10 + 20;
    const health = isLarge ? 5 : 3;

    spaceDebris.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - size),
        width: size,
        height: size,
        speed: DEBRIS_SPEED,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        type: isLarge ? "large" : "small",
        health: health,
        maxHealth: health
    });
}

function splitAsteroid(debris) {
    const newSize = debris.width / 2;

    for (let i = 0; i < 2; i++) {
        spaceDebris.push({
            x: debris.x,
            y: debris.y + (i === 0 ? -newSize / 2 : newSize / 2),
            width: newSize,
            height: newSize,
            speed: DEBRIS_SPEED,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.05,
            type: "small",
            health: 3,
            maxHealth: 3,
            splitVelocityX: 1.5,
            splitVelocityY: i === 0 ? -3.5 : 3.5,
            splitFrames: 35
        });
    }
}

function updateSpaceDebris() {
    // Activate debris after the difficulty increase.
    if (aliensDestroyedAfterFire < 20) {
        return;
    }

    debrisSpawnTimer++;

    if (debrisSpawnTimer >= DEBRIS_SPAWN_INTERVAL) {
        createDebris();
        debrisSpawnTimer = 0;
    }

    spaceDebris.forEach(debris => {
        // Temporary movement while split asteroids separate.
        if (debris.splitFrames > 0) {
            debris.x += debris.splitVelocityX - debris.speed;
            debris.y += debris.splitVelocityY;
            debris.splitVelocityX *= 0.88;
            debris.splitVelocityY *= 0.88;
            debris.splitFrames--;
        } else {
            debris.x -= debris.speed;
        }

        debris.rotation += debris.rotationSpeed;
    });

    for (let i = spaceDebris.length - 1; i >= 0; i--) {
        if (spaceDebris[i].x + spaceDebris[i].width < 0) {
            spaceDebris.splice(i, 1);
        }
    }
}

function drawSpaceDebris() {
    spaceDebris.forEach(debris => {
        ctx.save();
        ctx.translate(
            debris.x + debris.width / 2,
            debris.y + debris.height / 2
        );
        ctx.rotate(debris.rotation);

        ctx.fillStyle = "#64748b";
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-debris.width / 2, -debris.height / 3);
        ctx.lineTo(-debris.width / 4, -debris.height / 2);
        ctx.lineTo(debris.width / 3, -debris.height / 2.5);
        ctx.lineTo(debris.width / 2, -debris.height / 6);
        ctx.lineTo(debris.width / 3, debris.height / 2);
        ctx.lineTo(-debris.width / 3, debris.height / 2);
        ctx.lineTo(-debris.width / 2, debris.height / 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    });
}


// =============================================
// 13. EXPLOSION SYSTEM
// =============================================

const explosions = [];

function createExplosion(x, y) {
    const colors = ["#f97316", "#fde047", "#ef4444", "#ffffff"];

    for (let i = 0; i < 12; i++) {
        explosions.push({
            x: x,
            y: y,
            size: Math.random() * 5 + 3,
            speedX: (Math.random() - 0.5) * 7,
            speedY: (Math.random() - 0.5) * 7,
            life: 25,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
}

function createAsteroidExplosion(x, y) {
    const colors = ["#64748b", "#94a3b8", "#78716c", "#a8a29e", "#57534e"];

    for (let i = 0; i < 16; i++) {
        explosions.push({
            x: x,
            y: y,
            size: Math.random() * 5 + 3,
            speedX: (Math.random() - 0.5) * 8,
            speedY: (Math.random() - 0.5) * 8,
            life: 30,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
}

function updateExplosions() {
    explosions.forEach(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.life--;
    });

    for (let i = explosions.length - 1; i >= 0; i--) {
        if (explosions[i].life <= 0) {
            explosions.splice(i, 1);
        }
    }
}

function drawExplosions() {
    explosions.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
}


// =============================================
// 14. COLLISION DETECTION
// =============================================

function checkCollisions() {
    // Player laser to alien.
    for (let i = lasers.length - 1; i >= 0; i--) {
        for (let j = aliens.length - 1; j >= 0; j--) {
            const laser = lasers[i];
            const alien = aliens[j];

            if (
                laser.x < alien.x + alien.width &&
                laser.x + laser.width > alien.x &&
                laser.y < alien.y + alien.height &&
                laser.y + laser.height > alien.y
            ) {
                createExplosion(
                    alien.x + alien.width / 2,
                    alien.y + alien.height / 2
                );

                score += 10;

                if (aliensSpawned > ENEMY_FIRE_START) {
                    aliensDestroyedAfterFire++;

                    if (aliensDestroyedAfterFire === 20) {
                        alienSpeed = 2.3;
                    }
                }

                updateHighScore();
                lasers.splice(i, 1);
                aliens.splice(j, 1);
                break;
            }
        }
    }

    // Player laser to boss.
    for (let i = lasers.length - 1; i >= 0 && boss; i--) {
        const laser = lasers[i];

        if (
            laser.x < boss.x + boss.width &&
            laser.x + laser.width > boss.x &&
            laser.y < boss.y + boss.height &&
            laser.y + laser.height > boss.y
        ) {
            boss.health--;
            score += 2;
            updateHighScore();
            lasers.splice(i, 1);

            if (boss.health <= 0) {
                for (let j = 0; j < 3; j++) {
                    createExplosion(
                        boss.x + boss.width / 2,
                        boss.y + boss.height / 2
                    );
                }

                score += 50;
                updateHighScore();
                bossesDefeated++;
                aliensSpawnedAfterSpeedIncrease = 0;
                boss = null;
            }
        }
    }

    // Player laser to asteroid.
    for (let i = lasers.length - 1; i >= 0; i--) {
        for (let j = spaceDebris.length - 1; j >= 0; j--) {
            const laser = lasers[i];
            const debris = spaceDebris[j];

            if (
                laser.x < debris.x + debris.width &&
                laser.x + laser.width > debris.x &&
                laser.y < debris.y + debris.height &&
                laser.y + laser.height > debris.y
            ) {
                score += 1;
                debris.health--;
                lasers.splice(i, 1);

                if (debris.health <= 0) {
                    if (debris.type === "large") {
                        splitAsteroid(debris);
                    } else {
                        score += 2;
                        createAsteroidExplosion(
                            debris.x + debris.width / 2,
                            debris.y + debris.height / 2
                        );
                    }

                    spaceDebris.splice(j, 1);
                }

                updateHighScore();
                break;
            }
        }
    }

    // Enemy laser to player.
    if (!isPlayerDying && !isGameOver) {
        for (let i = enemyLasers.length - 1; i >= 0; i--) {
            const laser = enemyLasers[i];

            if (
                player.x < laser.x + laser.width &&
                player.x + player.width > laser.x &&
                player.y < laser.y + laser.height &&
                player.y + player.height > laser.y
            ) {
                enemyLasers.splice(i, 1);
                finalScore = score;
                isPlayerDying = true;
                createExplosion(
                    player.x + player.width / 2,
                    player.y + player.height / 2
                );
                break;
            }
        }
    }

    // Space debris to player.
    if (!isPlayerDying && !isGameOver) {
        for (let i = spaceDebris.length - 1; i >= 0; i--) {
            const debris = spaceDebris[i];

            if (
                player.x < debris.x + debris.width &&
                player.x + player.width > debris.x &&
                player.y < debris.y + debris.height &&
                player.y + player.height > debris.y
            ) {
                finalScore = score;
                isPlayerDying = true;
                createExplosion(
                    player.x + player.width / 2,
                    player.y + player.height / 2
                );
                break;
            }
        }
    }

    // Player to alien.
    if (!isPlayerDying && !isGameOver) {
        for (let i = aliens.length - 1; i >= 0; i--) {
            const alien = aliens[i];

            if (
                player.x < alien.x + alien.width &&
                player.x + player.width > alien.x &&
                player.y < alien.y + alien.height &&
                player.y + player.height > alien.y
            ) {
                score += 10;
                updateHighScore();
                aliens.splice(i, 1);
                finalScore = score;
                isPlayerDying = true;
                createExplosion(
                    player.x + player.width / 2,
                    player.y + player.height / 2
                );
                break;
            }
        }
    }
}


// =============================================
// 15. SCORE DISPLAY
// =============================================

function drawScore() {
    ctx.save();
    ctx.font = "bold 16px Verdana";
    ctx.textAlign = "right";

    // High score.
    ctx.fillStyle = "#fde047";
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 8;
    ctx.fillText("HIGH SCORE: " + highScore, canvas.width - 25, 30);

    // Current score.
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;
    ctx.fillText("SCORE: " + score, canvas.width - 25, 55);

    ctx.restore();
}


// =============================================
// 16. RESTART GAME
// =============================================

function restartGame() {
    // Reset scores.
    score = 0;
    finalScore = 0;

    // Reset personal record tracking.
    runStartingHighScore = highScore;
    achievedNewHighScore = false;
    qualifiesForTopFive = false;
    recordSubmissionHandled = false;
    playerNameInput.value = "";

    // Reset game states.
    isGameOver = false;
    isPlayerDying = false;
    isPaused = false;
    hasStarted = true;

    // Reset spaceship position.
    player.x = 100;
    player.y = 220;

    // Clear game objects.
    lasers.length = 0;
    enemyLasers.length = 0;
    aliens.length = 0;
    boss = null;
    explosions.length = 0;
    spaceDebris.length = 0;

    // Reset timers and alien counters.
    debrisSpawnTimer = 0;
    laserCooldown = 0;
    alienSpawnTimer = 0;
    aliensSpawned = 0;

    // Reset difficulty progression.
    aliensDestroyedAfterFire = 0;
    alienSpeed = 2;
    aliensSpawnedAfterSpeedIncrease = 0;
    bossesDefeated = 0;

    // Reset keyboard controls.
    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });

    pauseButton.textContent = "PAUSE GAME";
}


// =============================================
// 17. MAIN GAME LOOP
// =============================================

function gameLoop() {
    const gameIsActive =
        hasStarted &&
        !isPaused &&
        !isPlayerDying &&
        !isGameOver;

    drawStars(gameIsActive);

    // Normal gameplay updates.
    if (gameIsActive) {
        updatePlayer();
        updateLasers();
        updateAliens();
        updateEnemyLasers();
        updateSpaceDebris();
        checkCollisions();
    }

    // Continue the explosion animation after a collision.
    if (isPlayerDying) {
        updateExplosions();

        // Trigger Game Over when the explosion finishes.
        if (explosions.length === 0) {
            isPlayerDying = false;
            isGameOver = true;
            isPaused = true;
            finalScore = score;

            achievedNewHighScore = finalScore > runStartingHighScore;

            // A new personal record always gets the name-entry opportunity.
            qualifiesForTopFive =
                finalScore > 0 &&
                (
                    achievedNewHighScore ||
                    topScores.length < 5 ||
                    finalScore >= topScores[4].score
                );

            recordSubmissionHandled = false;
            playerNameInput.value = "";

            console.log("Final Score:", finalScore);
            console.log("Top Scores:", topScores);
            console.log("Qualifies for Top 5:", qualifiesForTopFive);
            console.log("New Personal Record:", achievedNewHighScore);

            congratulationsFinalScoreDisplay.textContent = "YOUR SCORE: " + finalScore;
            gameOverFinalScoreDisplay.textContent = "FINAL SCORE: " + finalScore;

            if (achievedNewHighScore) {
                showScreen(congratulationsScreen);
            } else if (qualifiesForTopFive) {
                showScreen(nameEntryScreen);
                playerNameInput.focus();
            } else {
                showScreen(gameOverScreen);
            }
        }
    } else if (gameIsActive) {
        updateExplosions();
    }

    // Draw game objects.
    drawLasers();
    drawEnemyLasers();
    drawAliens();
    drawBoss();
    drawSpaceDebris();
    drawExplosions();

    if (!isPlayerDying && !isGameOver) {
        drawPlayer();
    }

    drawScore();
    requestAnimationFrame(gameLoop);
}


// =============================================
// 18. START GAME LOOP
// =============================================

gameLoop();
