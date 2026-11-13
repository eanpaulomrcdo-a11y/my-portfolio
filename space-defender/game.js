
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

const PENDING_TOP_SCORE_KEY = "spaceDefenderPendingTopScore";

let currentRunId = null;

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

function recordTopScore(playerName, newScore, recordId = null) {
    if (!Number.isFinite(newScore) || newScore < 0) {
        return;
    }

    // Prevent the same pending score from being registered twice.
    if (
        recordId &&
        topScores.some(record => record.id === recordId)
    ) {
        return;
    }

    const newRecord = {
        name: playerName,
        score: newScore,
        timestamp: Date.now()
    };

    if (recordId) {
        newRecord.id = recordId;
    }

    topScores.push(newRecord);

    topScores.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }

        return (b.timestamp || 0) - (a.timestamp || 0);
    });

    topScores = topScores.slice(0, 5);

    localStorage.setItem(TOP_SCORES_KEY, JSON.stringify(topScores));
}

function isTopFiveEligible(candidateScore) {
    return (
        candidateScore > 0 &&
        (
            candidateScore > runStartingHighScore ||
            topScores.length < 5 ||
            candidateScore >= topScores[4].score
        )
    );
}


function updatePendingTopScore() {
    if (!currentRunId || !isTopFiveEligible(score)) {
        return;
    }

    const pendingRecord = {
        id: currentRunId,
        score: score
    };

    localStorage.setItem(
        PENDING_TOP_SCORE_KEY,
        JSON.stringify(pendingRecord)
    );
}


function clearPendingTopScore(recordId) {
    try {
        const pending = JSON.parse(
            localStorage.getItem(PENDING_TOP_SCORE_KEY)
        );

        if (!recordId || (pending && pending.id === recordId)) {
            localStorage.removeItem(PENDING_TOP_SCORE_KEY);
        }
    } catch (error) {
        localStorage.removeItem(PENDING_TOP_SCORE_KEY);
    }
}


function recoverPendingTopScore() {
    try {
        const pending = JSON.parse(
            localStorage.getItem(PENDING_TOP_SCORE_KEY)
        );

        if (!pending) {
            return;
        }

        if (
            typeof pending.id === "string" &&
            Number.isFinite(pending.score) &&
            pending.score > 0
        ) {
            recordTopScore(
                "ANONYMOUS",
                pending.score,
                pending.id
            );
        }

        clearPendingTopScore();

    } catch (error) {
        localStorage.removeItem(PENDING_TOP_SCORE_KEY);
    }
}


function beginNewRun() {
    // Recover any unfinished qualifying score before starting another run.
    recoverPendingTopScore();

    currentRunId =
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2);
}
recoverPendingTopScore();

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

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("spaceDefenderHighScore", highScore);
    }

    // Keep a backup of the latest qualifying Top 5 score.
    updatePendingTopScore();
}


// =============================================
// 3. GAME STATES AND SCREEN ELEMENTS
// =============================================

let isPaused = true;
let hasStarted = false;
let isGameOver = false;
let isPlayerDying = false;
let finalScore = 0;

const pauseButton = document.getElementById("pauseButton");
const quitGameButton = document.getElementById("quitGameButton");


const pauseOverlay = document.getElementById("pauseOverlay");
const pauseOverlayButtons = document.getElementById("pauseOverlayButtons");
const gameButtonHome = document.getElementById("gameButtonHome");

// Keep the same buttons in the correct location for each device.
function positionPauseButtons() {
    const isDesktop = window.matchMedia("(min-width: 601px)").matches;

    const showInOverlay =
        isDesktop &&
        hasStarted &&
        isPaused &&
        !isGameOver &&
        !isPlayerDying;

    const destination = showInOverlay
        ? pauseOverlayButtons
        : gameButtonHome;

    destination.appendChild(pauseButton);
    destination.appendChild(quitGameButton);
}

function updatePauseOverlay() {
    const isDesktop = window.matchMedia("(min-width: 601px)").matches;

    positionPauseButtons();

    const shouldShow =
        isDesktop &&
        currentScreen === gameScreen &&
        hasStarted &&
        isPaused &&
        !isGameOver &&
        !isPlayerDying;

    pauseOverlay.style.display = shouldShow ? "flex" : "none";

    gameButtonHome.style.display =
        isDesktop && hasStarted && !isPaused && !isGameOver && !isPlayerDying
            ? "none"
            : "";
}

// Set the correct button location and overlay state when the page loads.
window.addEventListener("load", function () {
    updatePauseOverlay();
});

// Reposition the buttons if the browser crosses the desktop/mobile breakpoint.
window.addEventListener("resize", function () {
    updatePauseOverlay();
});

const mainMenu = document.getElementById("mainMenu");
const menuBackground = document.getElementById("menuBackground");
const menuCanvas = document.getElementById("menuCanvas");
const menuCtx = menuCanvas.getContext("2d");
const gameScreen = document.getElementById("gameScreen");
const gameControls = document.querySelector(".game-controls");
const startGameButton = document.getElementById("startGameButton");

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

let pendingReset = null;
let recordSubmissionHandled = false;


// =============================================
// 4. MENU BACKGROUND ANIMATION
// =============================================

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

        // Engine glow.
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


// =============================================
// 5. KEYBOARD AND MOUSE MENU NAVIGATION
// =============================================

let currentScreen = null;
let selectedMenuButtonIndex = -1;

const menuSelectionMemory = {};


// Get buttons available for keyboard navigation.
function getKeyboardButtons() {
    if (!currentScreen) {
        return [];
    }

    // Paused gameplay: Resume and Quit buttons.
    if (currentScreen === gameScreen) {

        if (
            !isPaused ||
            !hasStarted ||
            isGameOver ||
            isPlayerDying
        ) {
            return [];
        }

        return [pauseButton, quitGameButton].filter(button =>
            button &&
            !button.disabled &&
            getComputedStyle(button).display !== "none" &&
            getComputedStyle(button).visibility !== "hidden"
        );
    }

    // All other screens: their normal menu buttons.
    return Array.from(
        currentScreen.querySelectorAll("button:not(:disabled)")
    ).filter(button =>
        getComputedStyle(button).display !== "none" &&
        getComputedStyle(button).visibility !== "hidden"
    );
}


// Update the visible keyboard selection.
function updateKeyboardSelection(showHighlight = true) {
    const buttons = getKeyboardButtons();

    // Remove existing keyboard highlights from the available buttons.
    buttons.forEach(button => {
        button.classList.remove("keyboard-selected");
    });

    // A screen can remember its previous position without showing a highlight.
    if (!showHighlight || buttons.length === 0 || selectedMenuButtonIndex < 0) {
        return;
    }

    // Keep the selected index within the available buttons.
    selectedMenuButtonIndex = Math.min(
        selectedMenuButtonIndex,
        buttons.length - 1
    );

    const selectedButton = buttons[selectedMenuButtonIndex];

    selectedButton.classList.add("keyboard-selected");

    // Paused-game controls do not need menu scrolling.
    if (currentScreen === gameScreen) {
        return;
    }

    // Controls Guide has its own scrolling area.
    const scrollContainer =
        currentScreen === controlsGuideScreen
            ? selectedButton.closest(".controls-guide-list")
            : selectedButton.closest(".menu-overlay");

    if (!scrollContainer) {
        return;
    }

    // Return to the top when the first button is selected.
    if (selectedMenuButtonIndex === 0) {
        scrollContainer.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        return;
    }

    const containerRect = scrollContainer.getBoundingClientRect();
    const buttonRect = selectedButton.getBoundingClientRect();

    const buttonTop =
        buttonRect.top - containerRect.top + scrollContainer.scrollTop;

    const buttonBottom = buttonTop + selectedButton.offsetHeight;

    const visibleTop = scrollContainer.scrollTop;
    const visibleBottom = visibleTop + scrollContainer.clientHeight;

    if (buttonTop < visibleTop) {
        scrollContainer.scrollTo({
            top: Math.max(0, buttonTop - 15),
            behavior: "smooth"
        });
    } else if (buttonBottom > visibleBottom) {
        scrollContainer.scrollTo({
            top: buttonBottom - scrollContainer.clientHeight + 15,
            behavior: "smooth"
        });
    }
}


// Move keyboard selection up or down.
function moveKeyboardSelection(direction) {
    const buttons = getKeyboardButtons();

    if (buttons.length === 0) {
        return;
    }

    const previousIndex = selectedMenuButtonIndex;

    // With no current selection, Down starts at the first button
    // and Up starts at the last button.
    if (selectedMenuButtonIndex < 0 || selectedMenuButtonIndex >= buttons.length) {
        selectedMenuButtonIndex = direction > 0 ? 0 : buttons.length - 1;
    } else {
        selectedMenuButtonIndex =
            (selectedMenuButtonIndex + direction + buttons.length) % buttons.length;
    }

    // Keyboard navigation takes control away from mouse hover.
    document.body.classList.add("keyboard-navigation-active");
    updateKeyboardSelection();

    // Game controls do not need menu scrolling.
    if (currentScreen === gameScreen) {
        return;
    }

    // Preserve the existing menu auto-scroll behavior.
    const wrappedToTop =
        previousIndex >= 0 &&
        direction > 0 &&
        selectedMenuButtonIndex < previousIndex;

    const wrappedToBottom =
        previousIndex >= 0 &&
        direction < 0 &&
        selectedMenuButtonIndex > previousIndex;

    const selectedButton = buttons[selectedMenuButtonIndex];
    const scrollContainer = selectedButton.closest(".menu-overlay");

    if (!scrollContainer) {
        return;
    }

    if (wrappedToTop) {
        scrollContainer.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    } else if (wrappedToBottom) {
        scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: "smooth"
        });
    }
}


// Activate the currently selected button with Enter.
function activateKeyboardSelection() {
    const buttons = getKeyboardButtons();
    const selectedButton = buttons[selectedMenuButtonIndex];

    if (selectedButton) {
        selectedButton.click();
    }
}


// =============================================
// MOUSE HOVER MENU NAVIGATION
// =============================================

document.addEventListener("pointermove", function (event) {

    if (event.pointerType !== "mouse") {
        return;
    }

    const hoveredElement = document.elementFromPoint(
        event.clientX,
        event.clientY
    );

    const hoveredButton = hoveredElement?.closest(
        "button:not(:disabled)"
    );

    if (!hoveredButton || !currentScreen) {
        return;
    }

    // Normal menu buttons.
    let belongsToCurrentScreen =
        currentScreen.contains(hoveredButton);

    // Paused-game buttons are in the separate game-controls container.
    if (
        currentScreen === gameScreen &&
        gameControls.contains(hoveredButton)
    ) {
        belongsToCurrentScreen = true;
    }

    if (!belongsToCurrentScreen) {
        return;
    }

    const buttons = getKeyboardButtons();
    const hoveredIndex = buttons.indexOf(hoveredButton);

    if (hoveredIndex === -1) {
        return;
    }

    // Only an actual button hover takes control away from the keyboard.
    // Moving the pointer through empty space leaves keyboard selection alone.
    document.body.classList.remove("keyboard-navigation-active");

    // Mouse hover uses the browser's :hover styling, not a persistent
    // keyboard-selected class.
    buttons.forEach(button => {
        button.classList.remove("keyboard-selected");
    });

    selectedMenuButtonIndex = hoveredIndex;
});


// =============================================
// ESCAPE KEY MENU NAVIGATION
// =============================================

function handleMenuEscape() {

    const escapeButtons = {
        highScoresScreen: "highScoresBackButton",
        optionsScreen: "optionsBackButton",
        controlsGuideScreen: "controlsGuideBackButton",
        resetRecordsScreen: "resetRecordsBackButton",
        resetConfirmationScreen: "cancelResetButton",
        gameOverScreen: "gameOverMenuButton"
    };

    const buttonId = escapeButtons[currentScreen?.id];

    if (buttonId) {
        const button = document.getElementById(buttonId);

        if (button && !button.disabled) {
            button.click();
        }
    }
}


function resetScreenScroll(screen) {
    if (!screen) return;

    screen.scrollTop = 0;

    screen.querySelectorAll("*").forEach(element => {
        element.scrollTop = 0;
    });
}


// =============================================
// 6. SCREEN MANAGEMENT
// =============================================

function showScreen(screen) {

    // Reset the screen we are leaving.
    resetScreenScroll(currentScreen);

    // Remember the previous screen.
    const previousScreen = currentScreen;

    if (currentScreen) {
        menuSelectionMemory[currentScreen.id] = selectedMenuButtonIndex;
    }

    // Set the new current screen.
    currentScreen = screen;

    // Preserve the previous Main Menu navigation position when returning
    // from Options, but do not display a highlight until the user navigates.
    if (
        screen === mainMenu &&
        previousScreen === optionsScreen
    ) {
        selectedMenuButtonIndex =
            menuSelectionMemory[mainMenu.id] ?? -1;
    } else {
        selectedMenuButtonIndex = -1;
        menuSelectionMemory[currentScreen.id] = -1;
    }

    // A screen change always clears visible selection highlights.
    document.querySelectorAll("button.keyboard-selected, button.mouse-selected")
        .forEach(button => {
            button.classList.remove("keyboard-selected", "mouse-selected");
        });

    // Reset the screen we are opening.
    resetScreenScroll(screen);

    // Hide all screens.
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

    // Display the selected screen.
    screen.style.display = "block";

    const menuOverlay = screen.querySelector(".menu-overlay");

    if (menuOverlay) {
        menuOverlay.scrollTop = 0;
    }

    // Menu screens.
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
        screen.style.display = "flex";
    }

    // Keep the battlefield visible behind result screens.
    if (
        screen === congratulationsScreen ||
        screen === nameEntryScreen ||
        screen === gameOverScreen
    ) {
        gameScreen.style.display = "block";
        screen.style.display = "flex";
    }

    // Show game controls during gameplay.
    if (screen === gameScreen) {
        gameControls.style.display = "block";
    }

    // Start or stop the menu background animation.
    if (menuScreens.includes(screen)) {
        if (menuAnimationId === null) {
            menuAnimationLoop();
        }
    } else if (menuAnimationId !== null) {
        cancelAnimationFrame(menuAnimationId);
        menuAnimationId = null;
    }

    // Clear selection visuals on the newly opened screen.
    updateKeyboardSelection(false);
    requestAnimationFrame(function () {
    updatePauseOverlay();
});
}


// Open the main menu when the page loads.
requestAnimationFrame(() => {
    showScreen(mainMenu);
});




// =============================================
// 7. MENU AND SCREEN BUTTON EVENTS
// =============================================

startGameButton.addEventListener("click", function () {
    runStartingHighScore = highScore;
    achievedNewHighScore = false;
    qualifiesForTopFive = false;
    recordSubmissionHandled = false;
    beginNewRun();

    showScreen(gameScreen);

    hasStarted = true;
    isPaused = false;

    pauseButton.textContent = "PAUSE GAME";
    updatePauseOverlay();
});

highScoresButton.addEventListener("click", function () {
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

    if (isPlayerDying) {
        return;
    }

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
        beginNewRun();

        hasStarted = true;
        isPaused = false;

        pauseButton.textContent = "PAUSE GAME";
        quitGameButton.style.display = "none";

        pauseButton.classList.remove("keyboard-selected");
        quitGameButton.classList.remove("keyboard-selected");
    }

    // Pause the game.
    else if (!isPaused) {
        isPaused = true;

        pauseButton.textContent = "RESUME GAME";
        quitGameButton.style.display = "inline-block";

        // Do not automatically highlight Resume Game when the game pauses.
        selectedMenuButtonIndex = -1;
        pauseButton.classList.remove("keyboard-selected", "mouse-selected");
        quitGameButton.classList.remove("keyboard-selected", "mouse-selected");
    }

    // Resume the game.
    else {
        isPaused = false;

        pauseButton.textContent = "PAUSE GAME";
        quitGameButton.style.display = "none";

        // Clear paused-game selection highlighting.
        selectedMenuButtonIndex = -1;
        pauseButton.classList.remove("keyboard-selected", "mouse-selected");
        quitGameButton.classList.remove("keyboard-selected", "mouse-selected");
    }
    updatePauseOverlay();
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

    recordTopScore(playerName, finalScore, currentRunId);

    // Remove the backup only after the leaderboard has been saved.
    clearPendingTopScore(currentRunId);

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
// 8. STARFIELD
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
// 9. PLAYER SPACESHIP AND ENGINE FLAME
// =============================================

const player = {
    x: 100,
    y: 220,
    width: 60,
    height: 42,
    speed: 4
};

function drawEngineFlame() {
    const flameLength = 10 + Math.random() * 10;

    ctx.save();

    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(player.x + 5, player.y + 11);
    ctx.lineTo(player.x - flameLength, player.y + 17.5);
    ctx.lineTo(player.x + 5, player.y + 24);
    ctx.closePath();
    ctx.fill();

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

    const x = player.x;
    const y = player.y;
    const w = player.width;
    const h = player.height;

    // Main blue body gradient.
    const bodyGradient = ctx.createLinearGradient(
        x, y, x + w, y
    );

    bodyGradient.addColorStop(0, "#123b9a");
    bodyGradient.addColorStop(0.45, "#0875e8");
    bodyGradient.addColorStop(0.75, "#27baff");
    bodyGradient.addColorStop(1, "#0875e8");

    // Upper swept wing.
    ctx.beginPath();
    ctx.moveTo(x + w * 0.30, y + h * 0.38);
    ctx.lineTo(x + w * 0.27, y + h * 0.03);
    ctx.lineTo(x + w * 0.48, y + h * 0.12);
    ctx.lineTo(x + w * 0.76, y + h * 0.39);
    ctx.lineTo(x + w * 0.57, y + h * 0.44);
    ctx.closePath();

    ctx.fillStyle = "#0875e8";
    ctx.strokeStyle = "#061329";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Lower swept wing.
    ctx.beginPath();
    ctx.moveTo(x + w * 0.30, y + h * 0.62);
    ctx.lineTo(x + w * 0.27, y + h * 0.97);
    ctx.lineTo(x + w * 0.48, y + h * 0.88);
    ctx.lineTo(x + w * 0.76, y + h * 0.61);
    ctx.lineTo(x + w * 0.57, y + h * 0.56);
    ctx.closePath();

    ctx.fillStyle = "#0875e8";
    ctx.strokeStyle = "#061329";
    ctx.fill();
    ctx.stroke();

    // Central fuselage.
    ctx.beginPath();
    ctx.moveTo(x + w * 0.12, y + h * 0.38);
    ctx.lineTo(x + w * 0.34, y + h * 0.29);
    ctx.lineTo(x + w * 0.69, y + h * 0.32);
    ctx.lineTo(x + w * 0.98, y + h * 0.50);
    ctx.lineTo(x + w * 0.69, y + h * 0.68);
    ctx.lineTo(x + w * 0.34, y + h * 0.71);
    ctx.lineTo(x + w * 0.12, y + h * 0.62);
    ctx.closePath();

    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = "#061329";
    ctx.lineWidth = 2.5;
    ctx.fill();
    ctx.stroke();

    // Bright upper body highlight.
    ctx.beginPath();
    ctx.moveTo(x + w * 0.22, y + h * 0.40);
    ctx.lineTo(x + w * 0.67, y + h * 0.35);
    ctx.lineTo(x + w * 0.85, y + h * 0.48);
    ctx.lineTo(x + w * 0.38, y + h * 0.45);
    ctx.closePath();

    ctx.fillStyle = "rgba(130, 235, 255, 0.55)";
    ctx.fill();

    // Large cyan cockpit.
    ctx.beginPath();
    ctx.ellipse(
        x + w * 0.67,
        y + h * 0.43,
        w * 0.105,
        h * 0.115,
        0,
        0,
        Math.PI * 2
    );

    const cockpitGradient = ctx.createLinearGradient(
        x + w * 0.60,
        y + h * 0.32,
        x + w * 0.72,
        y + h * 0.55
    );

    cockpitGradient.addColorStop(0, "#ffffff");
    cockpitGradient.addColorStop(0.35, "#8bf5ff");
    cockpitGradient.addColorStop(1, "#1685e8");

    ctx.fillStyle = cockpitGradient;
    ctx.strokeStyle = "#061329";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Small cockpit reflection.
    ctx.beginPath();
    ctx.ellipse(
        x + w * 0.65,
        y + h * 0.39,
        w * 0.035,
        h * 0.025,
        -0.3,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Rear engine nozzle.
    ctx.fillStyle = "#142b55";
    ctx.strokeStyle = "#050d20";
    ctx.lineWidth = 1.5;
    ctx.fillRect(
        x + w * 0.10,
        y + h * 0.39,
        w * 0.12,
        h * 0.22
    );
    ctx.strokeRect(
        x + w * 0.10,
        y + h * 0.39,
        w * 0.12,
        h * 0.22
    );

    // Cyan wing highlights.
    ctx.strokeStyle = "#8beaff";
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.moveTo(x + w * 0.32, y + h * 0.09);
    ctx.lineTo(x + w * 0.54, y + h * 0.27);

    ctx.moveTo(x + w * 0.32, y + h * 0.91);
    ctx.lineTo(x + w * 0.54, y + h * 0.73);
    ctx.stroke();

    ctx.restore();
}


// =============================================
// 10. KEYBOARD, TOUCH, AND MOUSE CONTROLS
// =============================================

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Touch controls.
let touchControlActive = false;
let touchPointerId = null;
let touchTargetX = 0;
let touchTargetY = 0;
let touchOffsetX = 0;
let touchOffsetY = 0;

// Mouse controls.
let mouseControlActive = false;
let mousePointerId = null;
let mouseTargetX = 0;
let mouseTargetY = 0;
let mouseOffsetX = 0;
let mouseOffsetY = 0;




// =============================================
// KEYBOARD EVENT LISTENERS
// =============================================


document.addEventListener("keydown", function (event) {

    const isArrowKey = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight"
    ].includes(event.key);

    // Keyboard navigation takes priority over mouse hover.
    if (isArrowKey) {
        document.body.classList.add("keyboard-navigation-active");
    }

    // Detect text input.
    const typing =
        event.target.matches("input, textarea, select") ||
        event.target.isContentEditable;

    // Preserve normal text editing.
    if (typing) {

        // Enter activates the selected button on the name-entry screen.
        if (
            event.key === "Enter" &&
            currentScreen === nameEntryScreen
        ) {
            event.preventDefault();
            activateKeyboardSelection();
        }

        // Left and Right arrows remain available for text cursor movement.
        if (
            currentScreen === nameEntryScreen &&
            (event.key === "ArrowLeft" || event.key === "ArrowRight")
        ) {
            return;
        }

        // Allow Up and Down arrows to navigate buttons on name entry.
        if (
            currentScreen === nameEntryScreen &&
            (event.key === "ArrowUp" || event.key === "ArrowDown")
        ) {
            event.preventDefault();

            if (!event.repeat) {
                moveKeyboardSelection(
                    event.key === "ArrowUp" ? -1 : 1
                );
            }

            return;
        }

        // Preserve normal typing behavior on other screens.
        if (currentScreen !== nameEntryScreen) {
            return;
        }

        // Do not let other input keys interfere with the game.
        return;
    }

    // P: Pause or resume the game.
    if (
        event.key.toLowerCase() === "p" &&
        currentScreen === gameScreen &&
        hasStarted &&
        !isGameOver &&
        !isPlayerDying &&
        !event.repeat
    ) {
        event.preventDefault();
        pauseButton.click();
        return;
    }

    if (isArrowKey) {
        event.preventDefault();

        // Controls Guide: use Up/Down to scroll the guide, then
        // allow keyboard selection of BACK TO OPTIONS at the bottom.
        if (
            currentScreen === controlsGuideScreen &&
            (
                event.key === "ArrowUp" ||
                event.key === "ArrowDown"
            )
        ) {
            if (event.repeat) {
                return;
            }

            const scrollContainer =
                currentScreen.querySelector(".controls-guide-list");

            if (!scrollContainer) {
                return;
            }

            const maxScroll = Math.max(
                0,
                scrollContainer.scrollHeight - scrollContainer.clientHeight
            );
            const atBottom =
                scrollContainer.scrollTop >= maxScroll - 2;

            // Only treat the Back button as selected when it has the
            // keyboard highlight. A mouse hover alone must not stop scrolling.
            const backButton = getKeyboardButtons()[0];
            const backButtonKeyboardSelected =
                backButton?.classList.contains("keyboard-selected");

            if (backButtonKeyboardSelected) {
                // Down keeps BACK TO OPTIONS selected.
                if (event.key === "ArrowDown") {
                    return;
                }

                // Up clears the selection and returns to guide scrolling.
                selectedMenuButtonIndex = -1;
                updateKeyboardSelection(false);
            } else {
                selectedMenuButtonIndex = -1;
            }

            // At the bottom, one more Down selects BACK TO OPTIONS.
            if (event.key === "ArrowDown" && atBottom) {
                selectedMenuButtonIndex = 0;
                updateKeyboardSelection();
                return;
            }

            // Otherwise, keep scrolling the guide in the requested direction.
            const nextScrollTop = Math.max(
                0,
                Math.min(
                    maxScroll,
                    scrollContainer.scrollTop +
                        (event.key === "ArrowDown" ? 60 : -60)
                )
            );

            scrollContainer.scrollTo({
                top: nextScrollTop,
                behavior: "smooth"
            });

            return;
        }

        // Gameplay.
        if (currentScreen === gameScreen) {

            // Paused gameplay: navigate Resume and Quit.
            if (
                isPaused &&
                hasStarted &&
                !isGameOver &&
                !isPlayerDying
            ) {
                if (!event.repeat) {
                    if (
                        event.key === "ArrowUp" ||
                        event.key === "ArrowLeft"
                    ) {
                        moveKeyboardSelection(-1);
                    } else {
                        moveKeyboardSelection(1);
                    }
                }

            } else if (!isPaused && !isGameOver && !isPlayerDying) {

                // Active gameplay: move the spaceship.
                mouseControlActive = false;
                mousePointerId = null;

                keys[event.key] = true;
            }

            return;
        }

        // Other screens: normal menu navigation.
        if (!event.repeat) {
            if (
                event.key === "ArrowUp" ||
                event.key === "ArrowLeft"
            ) {
                moveKeyboardSelection(-1);
            } else {
                moveKeyboardSelection(1);
            }
        }

        return;
    }

    // Enter: activate the selected button.
    if (event.key === "Enter") {

        if (
            currentScreen === gameScreen &&
            isPaused &&
            hasStarted &&
            !isGameOver &&
            !isPlayerDying
        ) {
            event.preventDefault();
            activateKeyboardSelection();
            return;
        }

        if (currentScreen !== gameScreen) {
            event.preventDefault();
            activateKeyboardSelection();
            return;
        }
    }

    // Escape: preserve existing menu behavior.
    if (event.key === "Escape") {

        if (currentScreen === gameScreen) {
            return;
        }

        event.preventDefault();
        handleMenuEscape();
    }
});


// Release spaceship movement keys.
document.addEventListener("keyup", function (event) {

    if (event.key in keys) {
        event.preventDefault();
        keys[event.key] = false;
    }
});



// =============================================
// TOUCH POINTER CONTROLS
// =============================================

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

    updateTouchTarget(event);

    // Start dragging only when the player touches the spaceship.
    if (
        touchTargetX < player.x ||
        touchTargetX > player.x + player.width ||
        touchTargetY < player.y ||
        touchTargetY > player.y + player.height
    ) {
        return;
    }

    event.preventDefault();

    touchControlActive = true;
    touchPointerId = event.pointerId;

    // Preserve the exact point where the spaceship was grabbed.
    touchOffsetX = touchTargetX - player.x;
    touchOffsetY = touchTargetY - player.y;

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
// DESKTOP MOUSE DRAG CONTROLS
// =============================================

function updateMouseTarget(event) {
    const rect = canvas.getBoundingClientRect();

    mouseTargetX =
        (event.clientX - rect.left) * (canvas.width / rect.width);

    mouseTargetY =
        (event.clientY - rect.top) * (canvas.height / rect.height);
}

canvas.addEventListener("pointerdown", function (event) {
    if (event.pointerType !== "mouse" || event.button !== 0) {
        return;
    }

    if (!hasStarted || isPaused || isPlayerDying || isGameOver) {
        return;
    }

    updateMouseTarget(event);

    // Only grab the spaceship when clicking directly on it.
    if (
        mouseTargetX < player.x ||
        mouseTargetX > player.x + player.width ||
        mouseTargetY < player.y ||
        mouseTargetY > player.y + player.height
    ) {
        return;
    }

    event.preventDefault();

    mouseControlActive = true;
    mousePointerId = event.pointerId;

    mouseOffsetX = mouseTargetX - player.x;
    mouseOffsetY = mouseTargetY - player.y;

    canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", function (event) {
    if (!mouseControlActive || event.pointerId !== mousePointerId) {
        return;
    }

    event.preventDefault();
    updateMouseTarget(event);
});

function stopMouseControl(event) {
    if (event.pointerId !== mousePointerId) {
        return;
    }

    mouseControlActive = false;
    mousePointerId = null;
}

canvas.addEventListener("pointerup", stopMouseControl);
canvas.addEventListener("pointercancel", stopMouseControl);
canvas.addEventListener("lostpointercapture", stopMouseControl);


// =============================================
// MOBILE BUTTON TAP RIPPLE
// =============================================

// Show a short ripple exactly where the player touches a button.
// This is visual-only: the button's normal click action is unchanged.
const touchButtonRippleTimers = new WeakMap();

function showTouchButtonRipple(event) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") {
        return;
    }

    const button = event.target.closest("button");

    if (!button || button.disabled) {
        return;
    }

    const existingTimer = touchButtonRippleTimers.get(button);

    if (existingTimer) {
        clearTimeout(existingTimer);
    }

    // Replace an unfinished ripple if the same button is tapped again.
    const oldLayer = button.querySelector(":scope > .tap-ripple-layer");

    if (oldLayer) {
        oldLayer.remove();
    }

    const buttonRect = button.getBoundingClientRect();
    const rippleLayer = document.createElement("span");
    const ripple = document.createElement("span");

    rippleLayer.className = "tap-ripple-layer";
    ripple.className = "tap-ripple";

    ripple.style.left = `${event.clientX - buttonRect.left}px`;
    ripple.style.top = `${event.clientY - buttonRect.top}px`;

    if (button.id === "quitGameButton") {
        ripple.classList.add("tap-ripple--danger");
    } else if (button.id === "continueToNameEntryButton") {
        ripple.classList.add("tap-ripple--gold");
    }

    rippleLayer.appendChild(ripple);
    button.appendChild(rippleLayer);

    const timer = setTimeout(function () {
        rippleLayer.remove();
        touchButtonRippleTimers.delete(button);
    }, 650);

    touchButtonRippleTimers.set(button, timer);
}

document.addEventListener("pointerdown", showTouchButtonRipple, true);

// =============================================
// 11. PLAYER MOVEMENT
// =============================================

function updatePlayer() {

    if (touchControlActive) {
        const targetX = touchTargetX - touchOffsetX;
        const targetY = touchTargetY - touchOffsetY;

        // Smoothly follow the finger instead of instantly jumping to it.
        player.x += (targetX - player.x) * 0.35;
        player.y += (targetY - player.y) * 0.35;
    } else if (mouseControlActive) {
        player.x = mouseTargetX - mouseOffsetX;
        player.y = mouseTargetY - mouseOffsetY;
    } else {
        if (keys.ArrowUp) player.y -= player.speed;
        if (keys.ArrowDown) player.y += player.speed;
        if (keys.ArrowLeft) player.x -= player.speed;
        if (keys.ArrowRight) player.x += player.speed;
    }

    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}


// =============================================
// 12. AUTOMATIC PLAYER LASER SYSTEM
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
    if (laserCooldown <= 0) {
        createLaser();
        laserCooldown = 25;
    }

    laserCooldown--;

    lasers.forEach(laser => {
        laser.x += laser.speed;
    });

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
// 13. ALIEN SHIP AND BOSS SYSTEM
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

    if (!boss && aliensSpawnedAfterSpeedIncrease >= 20) {
        createBoss();
        alienSpawnTimer = 0;
    }

    if (boss && boss.x > boss.targetX) {
        boss.x -= boss.speed;
    }

    alienSpawnTimer++;

    if (alienSpawnTimer >= 90 && !boss) {
        createAlien();
        alienSpawnTimer = 0;
    }

    aliens.forEach(alien => {
        alien.x -= alien.speed;
    });

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

        ctx.fillStyle = "#a3e635";
        ctx.fillRect(alien.x + 5, alien.y + 12, 25, 12);

        ctx.fillStyle = "#4ade80";
        ctx.fillRect(alien.x + 11, alien.y + 5, 13, 9);

        ctx.fillStyle = "#65a30d";
        ctx.fillRect(alien.x, alien.y + 17, 35, 5);

        ctx.fillStyle = "#ecfccb";
        ctx.fillRect(alien.x + 9, alien.y + 16, 4, 3);
        ctx.fillRect(alien.x + 22, alien.y + 16, 4, 3);

        ctx.restore();
    });
}

function drawBoss() {
    if (!boss) {
        return;
    }

    ctx.save();

    const hover = Math.sin(Date.now() / 300) * 5;
    const bossY = boss.y + hover;

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

    ctx.shadowBlur = 12;
    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(boss.x + 38, bossY + 30, 35, 30);

    ctx.fillStyle = "#ff1744";
    ctx.fillRect(boss.x + 15, bossY + 10, 20, 12);
    ctx.fillRect(boss.x + 15, bossY + boss.height - 22, 20, 12);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#333";
    ctx.fillRect(boss.x, bossY - 18, boss.width, 8);

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
// 14. ENEMY LASER SYSTEM
// =============================================

function updateEnemyLasers() {

    // Boss special attacks.
    if (boss && boss.x <= boss.targetX) {
        boss.fireCooldown--;

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

    // Alien firing begins after the configured spawn threshold.
    if (aliensSpawned <= ENEMY_FIRE_START) {
        return;
    }

    aliens.forEach(alien => {
        alien.fireCooldown--;

        if (alien.fireCooldown <= 0) {
            if (Math.random() < 0.35) {
                enemyLasers.push({
                    x: alien.x,
                    y: alien.y + alien.height / 2 - 2,
                    width: 15,
                    height: 4,
                    speed: 5
                });
            }

            alien.fireCooldown = Math.random() * 100 + 100;
        }
    });

    enemyLasers.forEach(laser => {
        laser.x -= laser.speed;

        if (laser.verticalSpeed !== undefined) {
            laser.y += laser.verticalSpeed;
        }
    });

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
// 15. SPACE DEBRIS AND ASTEROID SYSTEM
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

    if (aliensDestroyedAfterFire < 20) {
        return;
    }

    debrisSpawnTimer++;

    if (debrisSpawnTimer >= DEBRIS_SPAWN_INTERVAL) {
        createDebris();
        debrisSpawnTimer = 0;
    }

    spaceDebris.forEach(debris => {

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
// 16. EXPLOSION SYSTEM
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
    const colors = [
        "#64748b",
        "#94a3b8",
        "#78716c",
        "#a8a29e",
        "#57534e"
    ];

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
// 17. COLLISION DETECTION
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
// 18. SCORE DISPLAY
// =============================================

function drawScore() {
    ctx.save();

    ctx.font = "bold 16px Verdana";
    ctx.textAlign = "right";

    ctx.fillStyle = "#fde047";
    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 8;
    ctx.fillText("HIGH SCORE: " + highScore, canvas.width - 25, 30);

    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;
    ctx.fillText("Current Score: " + score, canvas.width - 25, 55);

    ctx.restore();
}


// =============================================
// 19. RESTART GAME
// =============================================

function restartGame() {

    // Reset scores.
    score = 0;
    finalScore = 0;

    runStartingHighScore = highScore;
    beginNewRun();
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

    // Reset timers and counters.
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

// Reset mouse controls.
mouseControlActive = false;
mousePointerId = null;
mouseTargetX = 0;
mouseTargetY = 0;
mouseOffsetX = 0;
mouseOffsetY = 0;

// Reset touch controls.
touchControlActive = false;
touchPointerId = null;
touchTargetX = 0;
touchTargetY = 0;

}


// =============================================
// 20. MAIN GAME LOOP
// =============================================

function gameLoop() {
    const gameIsActive =
        hasStarted &&
        !isPaused &&
        !isPlayerDying &&
        !isGameOver;

    drawStars(gameIsActive);

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

        if (explosions.length === 0) {
            isPlayerDying = false;
            isGameOver = true;
            isPaused = true;

            finalScore = score;

            achievedNewHighScore = finalScore > runStartingHighScore;

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

            congratulationsFinalScoreDisplay.textContent =
                "YOUR SCORE: " + finalScore;

            gameOverFinalScoreDisplay.textContent =
                "FINAL SCORE: " + finalScore;

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
// 21. START GAME LOOP
// =============================================

gameLoop();
