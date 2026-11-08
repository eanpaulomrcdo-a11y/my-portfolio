
// =============================================
// IPM: SPACE DEFENDER
// =============================================


// =============================================
// 1. GAME CANVAS
// =============================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");


// =============================================
// 2. SCORE SYSTEM
// =============================================

let score = 0;

let highScore = Number(
    localStorage.getItem("spaceDefenderHighScore")
) || 0;


// =============================================
// 3. GAME STATES AND CONTROLS
// =============================================

let isPaused = true;
let hasStarted = false;

let isGameOver = false;
let isPlayerDying = false;

let finalScore = 0;

const pauseButton = document.getElementById("pauseButton");

pauseButton.addEventListener("click", function () {

    // Prevent pausing during player explosion
    if (isPlayerDying) {
        return;
    }

    // Restart after Game Over
    if (isGameOver) {
        restartGame();
        return;
    }

    // Start the game
    if (!hasStarted) {

        hasStarted = true;
        isPaused = false;

        pauseButton.textContent = "PAUSE GAME";

    }

    // Pause the game
    else if (!isPaused) {

        isPaused = true;

        pauseButton.textContent = "RESUME GAME";

    }

    // Resume the game
    else {

        isPaused = false;

        pauseButton.textContent = "PAUSE GAME";

    }

});


// =============================================
// 4. STARFIELD
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

        ctx.fillRect(
            star.x,
            star.y,
            star.size,
            star.size
        );

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
// 5. PLAYER SPACESHIP
// =============================================

const player = {
    x: 100,
    y: 220,
    width: 50,
    height: 35,
    speed: 4
};


// =============================================
// 6. ANIMATED ENGINE FLAME
// =============================================

function drawEngineFlame() {

    const flameLength = 10 + Math.random() * 10;

    ctx.save();

    // Outer orange flame
    ctx.fillStyle = "#f97316";

    ctx.beginPath();
    ctx.moveTo(player.x + 5, player.y + 11);
    ctx.lineTo(player.x - flameLength, player.y + 17.5);
    ctx.lineTo(player.x + 5, player.y + 24);
    ctx.closePath();
    ctx.fill();

    // Inner yellow flame
    ctx.fillStyle = "#fde047";

    ctx.beginPath();
    ctx.moveTo(player.x + 3, player.y + 14);
    ctx.lineTo(player.x - flameLength * 0.55, player.y + 17.5);
    ctx.lineTo(player.x + 3, player.y + 21);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

}


// =============================================
// 7. DRAW PLAYER
// =============================================

function drawPlayer() {

    drawEngineFlame();

    ctx.save();

    // Main spaceship body
    ctx.fillStyle = "#60a5fa";

    ctx.beginPath();

    ctx.moveTo(
        player.x + player.width,
        player.y + player.height / 2
    );

    ctx.lineTo(player.x + 10, player.y);
    ctx.lineTo(player.x, player.y + player.height / 2);
    ctx.lineTo(player.x + 10, player.y + player.height);

    ctx.closePath();
    ctx.fill();

    // Cockpit
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
// 8. KEYBOARD CONTROLS
// =============================================

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

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


// =============================================
// 9. PLAYER MOVEMENT
// =============================================

function updatePlayer() {

    if (keys.ArrowUp) {
        player.y -= player.speed;
    }

    if (keys.ArrowDown) {
        player.y += player.speed;
    }

    if (keys.ArrowLeft) {
        player.x -= player.speed;
    }

    if (keys.ArrowRight) {
        player.x += player.speed;
    }

    // Keep spaceship inside game area
    player.x = Math.max(
        0,
        Math.min(canvas.width - player.width, player.x)
    );

    player.y = Math.max(
        0,
        Math.min(canvas.height - player.height, player.y)
    );

}


// =============================================
// 10. AUTOMATIC PLAYER LASER SYSTEM
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

    // Automatically fire lasers
    if (laserCooldown <= 0) {

        createLaser();
        laserCooldown = 25;

    }

    laserCooldown--;

    // Move lasers forward
    lasers.forEach(laser => {

        laser.x += laser.speed;

    });

    // Remove lasers outside screen
    for (let i = lasers.length - 1; i >= 0; i--) {

        if (lasers[i].x > canvas.width) {
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

        ctx.fillRect(
            laser.x,
            laser.y,
            laser.width,
            laser.height
        );

        ctx.restore();

    });

}


// =============================================
// 11. ALIEN SHIP SYSTEM
// =============================================

const aliens = [];
const enemyLasers = [];

let alienSpawnTimer = 0;
let aliensSpawned = 0;

const ENEMY_FIRE_START = 15;

let aliensDestroyedAfterFire = 0;
let alienSpeed = 2;


function createAlien() {

    aliensSpawned++;

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

    alienSpawnTimer++;

    // Spawn an alien every 90 frames
    if (alienSpawnTimer >= 90) {

        createAlien();
        alienSpawnTimer = 0;

    }

    // Move aliens toward the left
    aliens.forEach(alien => {

        alien.x -= alien.speed;

    });

    // Remove aliens outside screen
    for (let i = aliens.length - 1; i >= 0; i--) {

        if (aliens[i].x + aliens[i].width < 0) {
            aliens.splice(i, 1);
        }

    }

}

function drawAliens() {

    aliens.forEach(alien => {

        ctx.save();

        // Alien ship body
        ctx.fillStyle = "#a3e635";

        ctx.fillRect(
            alien.x + 5,
            alien.y + 12,
            25,
            12
        );

        // Upper cockpit
        ctx.fillStyle = "#4ade80";

        ctx.fillRect(
            alien.x + 11,
            alien.y + 5,
            13,
            9
        );

        // Lower wings
        ctx.fillStyle = "#65a30d";

        ctx.fillRect(
            alien.x,
            alien.y + 17,
            35,
            5
        );

        // Alien lights
        ctx.fillStyle = "#ecfccb";

        ctx.fillRect(
            alien.x + 9,
            alien.y + 16,
            4,
            3
        );

        ctx.fillRect(
            alien.x + 22,
            alien.y + 16,
            4,
            3
        );

        ctx.restore();

    });

}


// =============================================
// 12. ENEMY LASER SYSTEM
// =============================================

function updateEnemyLasers() {

    // Activate enemy firing only after 15 aliens have spawned
    if (aliensSpawned <= ENEMY_FIRE_START) {
        return;
    }

    aliens.forEach(alien => {

        alien.fireCooldown--;

        if (alien.fireCooldown <= 0) {

            // 35% chance that this alien fires
            if (Math.random() < 0.35) {

                enemyLasers.push({

                    x: alien.x,
                    y: alien.y + alien.height / 2 - 2,
                    width: 15,
                    height: 4,
                    speed: 5

                });

            }

            // Reset cooldown whether it fires or not
            alien.fireCooldown = Math.random() * 100 + 100;

        }

    });

    // Move enemy lasers toward the left
    enemyLasers.forEach(laser => {

        laser.x -= laser.speed;

    });

    // Remove lasers outside the screen
    for (let i = enemyLasers.length - 1; i >= 0; i--) {

        if (enemyLasers[i].x + enemyLasers[i].width < 0) {
            enemyLasers.splice(i, 1);
        }

    }

}

function drawEnemyLasers() {

    enemyLasers.forEach(laser => {

        ctx.save();

        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 12;

        ctx.fillStyle = "#ef4444";

        ctx.fillRect(
            laser.x,
            laser.y,
            laser.width,
            laser.height
        );

        ctx.restore();

    });

}


// =============================================
// 13. SPACE DEBRIS AND ASTEROID SYSTEM
// =============================================

const spaceDebris = [];

let debrisSpawnTimer = 0;

const DEBRIS_SPAWN_INTERVAL = 180;
const DEBRIS_SPEED = 1.5;


// CREATE ASTEROID
function createDebris() {

    // Choose asteroid type
    const isLarge = Math.random() < 0.35;

    // Set size and durability
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

        // Asteroid properties
        type: isLarge ? "large" : "small",
        health: health,
        maxHealth: health

    });

}


// SPLIT LARGE ASTEROID
function splitAsteroid(debris) {

    const newSize = debris.width / 2;

    // Create two smaller asteroids
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

            // Temporary splitting movement
            splitVelocityX: 1.5,
            splitVelocityY: i === 0 ? -3.5 : 3.5,
            splitFrames: 35

        });

    }

}


// UPDATE SPACE DEBRIS
function updateSpaceDebris() {

    // Activate debris after the speed increase
    if (aliensDestroyedAfterFire < 20) {
        return;
    }

    // Spawn debris periodically
    debrisSpawnTimer++;

    if (debrisSpawnTimer >= DEBRIS_SPAWN_INTERVAL) {

        createDebris();

        debrisSpawnTimer = 0;

    }

    // Move and rotate debris
    spaceDebris.forEach(debris => {

        // Special movement during asteroid splitting
        if (debris.splitFrames > 0) {

            debris.x += debris.splitVelocityX - debris.speed;
            debris.y += debris.splitVelocityY;

            // Gradually reduce separation movement
            debris.splitVelocityX *= 0.88;
            debris.splitVelocityY *= 0.88;

            debris.splitFrames--;

        } else {

            // Normal asteroid movement
            debris.x -= debris.speed;

        }

        debris.rotation += debris.rotationSpeed;

    });

    // Remove debris outside the screen
    for (let i = spaceDebris.length - 1; i >= 0; i--) {

        if (spaceDebris[i].x + spaceDebris[i].width < 0) {
            spaceDebris.splice(i, 1);
        }

    }

}


// DRAW SPACE DEBRIS
function drawSpaceDebris() {

    spaceDebris.forEach(debris => {

        ctx.save();

        // Move drawing origin to debris center
        ctx.translate(
            debris.x + debris.width / 2,
            debris.y + debris.height / 2
        );

        // Rotate debris
        ctx.rotate(debris.rotation);

        // Draw rocky debris
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
// 14. EXPLOSION SYSTEM
// =============================================

const explosions = [];


// PLAYER AND ALIEN EXPLOSION
function createExplosion(x, y) {

    const colors = [
        "#f97316",
        "#fde047",
        "#ef4444",
        "#ffffff"
    ];

    for (let i = 0; i < 12; i++) {

        explosions.push({

            x: x,
            y: y,
            size: Math.random() * 5 + 3,
            speedX: (Math.random() - 0.5) * 7,
            speedY: (Math.random() - 0.5) * 7,
            life: 25,
            color: colors[
                Math.floor(Math.random() * colors.length)
            ]

        });

    }

}


// ASTEROID DESTRUCTION EFFECT
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
            color: colors[
                Math.floor(Math.random() * colors.length)
            ]

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

        ctx.fillRect(
            particle.x,
            particle.y,
            particle.size,
            particle.size
        );

    });

}


// =============================================
// 15. COLLISION DETECTION
// =============================================

function checkCollisions() {

    // -----------------------------------------
    // LASER-TO-ALIEN COLLISION
    // -----------------------------------------

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

                // Create alien explosion
                createExplosion(
                    alien.x + alien.width / 2,
                    alien.y + alien.height / 2
                );

                // Award points
                score += 10;

                // Count alien kills after enemy firing begins
                if (aliensSpawned > ENEMY_FIRE_START) {

                    aliensDestroyedAfterFire++;

                    // Increase difficulty after 20 additional kills
                    if (aliensDestroyedAfterFire === 20) {

                        alienSpeed = 2.3;

                    }

                }

                // Update high score
                if (score > highScore) {

                    highScore = score;

                    localStorage.setItem(
                        "spaceDefenderHighScore",
                        highScore
                    );

                }

                // Remove laser and alien
                lasers.splice(i, 1);
                aliens.splice(j, 1);

                break;

            }

        }

    }


    // -----------------------------------------
    // PLAYER LASER-TO-ASTEROID COLLISION
    // -----------------------------------------

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

                // Award 1 point for every asteroid hit
                score += 1;

                // Reduce asteroid health
                debris.health--;

                // Remove the laser
                lasers.splice(i, 1);

                // Check if asteroid is destroyed
                if (debris.health <= 0) {

                    // Split large asteroids
                    if (debris.type === "large") {

                        splitAsteroid(debris);

                    } else {

                        // Award 2 bonus points for destroying a small asteroid
                        score += 2;

                        // Create rocky explosion
                        createAsteroidExplosion(
                            debris.x + debris.width / 2,
                            debris.y + debris.height / 2
                        );

                    }

                    // Remove destroyed asteroid
                    spaceDebris.splice(j, 1);

                }

                // Update high score
                if (score > highScore) {

                    highScore = score;

                    localStorage.setItem(
                        "spaceDefenderHighScore",
                        highScore
                    );

                }

                break;

            }

        }

    }


    // -----------------------------------------
    // ENEMY LASER-TO-PLAYER COLLISION
    // -----------------------------------------

    if (!isPlayerDying && !isGameOver) {

        for (let i = enemyLasers.length - 1; i >= 0; i--) {

            const laser = enemyLasers[i];

            if (

                player.x < laser.x + laser.width &&
                player.x + player.width > laser.x &&
                player.y < laser.y + laser.height &&
                player.y + player.height > laser.y

            ) {

                // Remove the enemy laser
                enemyLasers.splice(i, 1);

                // Save final score
                finalScore = score;

                // Trigger player destruction
                isPlayerDying = true;

                // Create player explosion
                createExplosion(
                    player.x + player.width / 2,
                    player.y + player.height / 2
                );

                break;

            }

        }

    }


    // -----------------------------------------
    // SPACE DEBRIS-TO-PLAYER COLLISION
    // -----------------------------------------

    if (!isPlayerDying && !isGameOver) {

        for (let i = spaceDebris.length - 1; i >= 0; i--) {

            const debris = spaceDebris[i];

            if (

                player.x < debris.x + debris.width &&
                player.x + player.width > debris.x &&
                player.y < debris.y + debris.height &&
                player.y + player.height > debris.y

            ) {

                // Save final score
                finalScore = score;

                // Trigger player destruction
                isPlayerDying = true;

                // Create player explosion
                createExplosion(
                    player.x + player.width / 2,
                    player.y + player.height / 2
                );

                break;

            }

        }

    }


    // -----------------------------------------
    // PLAYER-TO-ALIEN COLLISION
    // -----------------------------------------

    if (!isPlayerDying && !isGameOver) {

        for (let i = aliens.length - 1; i >= 0; i--) {

            const alien = aliens[i];

            if (

                player.x < alien.x + alien.width &&
                player.x + player.width > alien.x &&
                player.y < alien.y + alien.height &&
                player.y + player.height > alien.y

            ) {

                // Remove the alien that hit the player
                aliens.splice(i, 1);

                // Save final score
                finalScore = score;

                // Trigger player destruction
                isPlayerDying = true;

                // Create player explosion
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
// 16. SCORE DISPLAY
// =============================================

function drawScore() {

    ctx.save();

    ctx.font = "bold 16px Verdana";
    ctx.textAlign = "right";

    // Current score
    ctx.fillStyle = "#ffffff";

    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;

    ctx.fillText(
        "SCORE: " + score,
        canvas.width - 25,
        30
    );

    // High score
    ctx.fillStyle = "#fde047";

    ctx.shadowColor = "#fde047";
    ctx.shadowBlur = 8;

    ctx.fillText(
        "HIGH SCORE: " + highScore,
        canvas.width - 25,
        55
    );

    ctx.restore();

}


// =============================================
// 17. GAME OVER SCREEN
// =============================================

function drawGameOver() {

    // Dark overlay
    ctx.fillStyle = "rgba(5, 11, 24, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    ctx.textAlign = "center";

    // GAME OVER
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 20;

    ctx.fillStyle = "#f87171";
    ctx.font = "bold 48px Verdana";

    ctx.fillText(
        "GAME OVER",
        canvas.width / 2,
        190
    );

    // Final score
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Verdana";

    ctx.fillText(
        "FINAL SCORE: " + finalScore,
        canvas.width / 2,
        260
    );

    // High score
    ctx.fillStyle = "#fde047";

    ctx.fillText(
        "HIGH SCORE: " + highScore,
        canvas.width / 2,
        300
    );

    ctx.fillStyle = "#93c5fd";
    ctx.font = "14px Verdana";

    ctx.fillText(
        "CLICK PLAY AGAIN BELOW",
        canvas.width / 2,
        365
    );

    ctx.restore();

}


// =============================================
// 18. RESTART GAME
// =============================================

function restartGame() {

    // Reset scores
    score = 0;
    finalScore = 0;

    // Reset game states
    isGameOver = false;
    isPlayerDying = false;
    isPaused = false;
    hasStarted = true;

    // Reset spaceship position
    player.x = 100;
    player.y = 220;

    // Clear game objects
    lasers.length = 0;
    enemyLasers.length = 0;
    aliens.length = 0;
    explosions.length = 0;
    spaceDebris.length = 0;

    // Reset debris timer
    debrisSpawnTimer = 0;

    // Reset game timers and alien counters
    laserCooldown = 0;
    alienSpawnTimer = 0;
    aliensSpawned = 0;

    // Reset difficulty progression
    aliensDestroyedAfterFire = 0;
    alienSpeed = 2;

    // Reset keyboard controls
    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });

    // Update button
    pauseButton.textContent = "PAUSE GAME";

}


// =============================================
// 19. MAIN GAME LOOP
// =============================================

function gameLoop() {

    const gameIsActive =
        hasStarted &&
        !isPaused &&
        !isPlayerDying &&
        !isGameOver;

    // Draw background and stars
    drawStars(gameIsActive);

    // Normal gameplay
    if (gameIsActive) {

        updatePlayer();
        updateLasers();
        updateAliens();
        updateEnemyLasers();
        updateSpaceDebris();
        checkCollisions();

    }

    // Continue explosion animation after collision
    if (isPlayerDying) {

        updateExplosions();

        // Trigger Game Over when explosion finishes
        if (explosions.length === 0) {

            isPlayerDying = false;
            isGameOver = true;
            isPaused = true;

            finalScore = score;

            pauseButton.textContent = "PLAY AGAIN";

        }

    } else if (gameIsActive) {

        updateExplosions();

    }

    // Draw game objects
    drawLasers();
    drawEnemyLasers();
    drawAliens();
    drawSpaceDebris();
    drawExplosions();

    // Hide player after destruction
    if (!isPlayerDying && !isGameOver) {
        drawPlayer();
    }

    drawScore();

    // Display Game Over screen
    if (isGameOver) {
        drawGameOver();
    }

    requestAnimationFrame(gameLoop);

}


// =============================================
// 20. START GAME LOOP
// =============================================

gameLoop();
