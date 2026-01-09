window.onload = () => {
alert("JS is working!");
// gamr prepping.

  const GATE_SPEED = 3;
  const ENEMY_ADVANCE_SPEED = 3;
  const CLASH_DELAY = 130;
  const GATES_PER_CRATE = 5;

  let level = 1;
  let ballCount = 1;

  let playerX = 0;
  let dragging = false;

  let gatesPassed = 0;
  let cratesSpawned = 0;

  let gates = [];
  let crates = [];

  let gameState = "RUN"; 
  let clashCooldown = false;

  let initialPlayerCount = 0;
  let initialEnemyCount = 0;

// getting the DOM
  const game = document.getElementById("game");
  const playerArea = document.getElementById("player-area");
  const enemyArea = document.getElementById("enemy-area");
  const counter = document.getElementById("counter");
  const levelText = document.getElementById("level");
  const message = document.getElementById("message");

// plyer

  function spawnPlayerBalls() {
    playerArea.innerHTML = "";

    const maxX = game.clientWidth - 80;
    playerX = Math.max(0, Math.min(playerX, maxX));

    playerArea.style.left = playerX + "px";
    playerArea.style.bottom = "80px";

    for (let i = 0; i < ballCount; i++) {
      const ball = document.createElement("div");
      ball.className = "ball " + (i === 0 ? "main" : "extra");
      ball.style.left = i * 22 + "px";
      playerArea.appendChild(ball);
    }

    counter.textContent = "Balls: " + ballCount;
  }

// mouse and touch
  function setPlayerX(clientX) {
    const rect = game.getBoundingClientRect();
    playerX = clientX - rect.left - 40;
    spawnPlayerBalls();
  }

  game.addEventListener("touchstart", e => {
    if (gameState !== "RUN") return;
    dragging = true;
    setPlayerX(e.touches[0].clientX);
  }, { passive: false });

  game.addEventListener("touchmove", e => {
    if (!dragging || gameState !== "RUN") return;
    setPlayerX(e.touches[0].clientX);
  }, { passive: false });

  game.addEventListener("touchend", () => dragging = false);

  game.addEventListener("mousedown", e => {
    if (gameState !== "RUN") return;
    dragging = true;
    setPlayerX(e.clientX);
  });

  window.addEventListener("mousemove", e => {
    if (!dragging || gameState !== "RUN") return;
    setPlayerX(e.clientX);
  });

  window.addEventListener("mouseup", () => dragging = false);

// gates

  const operations = ["*2", "/2", "*3"];

  function spawnGate() {
    if (gameState !== "RUN") return;

    const gate = document.createElement("div");
    gate.className = "gate";

    const op = operations[Math.floor(Math.random() * operations.length)];
    gate.dataset.op = op;
    gate.dataset.used = "false";
    gate.dataset.counted = "false";

    gate.textContent = op.replace("*", "×").replace("/", "÷");
    gate.style.top = "-80px";
    gate.style.left = Math.random() * (game.clientWidth - 80) + "px";

    game.appendChild(gate);
    gates.push(gate);
  }

  setInterval(spawnGate, 1000);

// collision

  function anyBallCollides(el) {
    const elRect = el.getBoundingClientRect();
    const balls = document.querySelectorAll(".ball");

    for (let ball of balls) {
      const r = ball.getBoundingClientRect();
      if (
        r.left < elRect.right &&
        r.right > elRect.left &&
        r.top < elRect.bottom &&
        r.bottom > elRect.top
      ) return true;
    }
    return false;
  }

  function applyOperation(op) {
    const value = parseInt(op.slice(1));
    if (op.startsWith("*")) ballCount *= value;
    else ballCount = Math.max(1, Math.floor(ballCount / value));
    spawnPlayerBalls();
  }

// crate or box emoji (if u need clarity.this will end da game upon touching the player)

  function spawnCrate() {
    const crate = document.createElement("div");
    crate.className = "gate";
    crate.textContent = "📦";
    crate.style.background = "#555";
    crate.style.top = "-100px";
    crate.style.left = Math.random() * (game.clientWidth - 80) + "px";
    game.appendChild(crate);
    crates.push(crate);
  }

// enemies (redballs)

  function spawnEnemyArmy() {
    enemyArea.innerHTML = "";
    enemyArea.style.top = "60px";
    enemyArea.style.left = "50%";
    enemyArea.style.transform = "translateX(-50%)";

    initialEnemyCount = Math.floor(Math.random() * 5) + 5 + level * 2;
    initialPlayerCount = playerArea.children.length;

    for (let i = 0; i < initialEnemyCount; i++) {
      const ball = document.createElement("div");
      ball.className = "ball enemy";
      ball.style.left = i * 22 + "px";
      enemyArea.appendChild(ball);
    }
  }

  function startBattle() {
    gameState = "BATTLE";
    spawnEnemyArmy();
  }

// battle logic
  function handleBattle() {
    const pBalls = playerArea.children;
    const eBalls = enemyArea.children;

    if (pBalls.length === 0 || eBalls.length === 0) {
      endBattle();
      return;
    }

    enemyArea.style.top =
      enemyArea.offsetTop + ENEMY_ADVANCE_SPEED + "px";

    if (clashCooldown) return;

    const pRect = pBalls[0].getBoundingClientRect();
    const eRect = eBalls[0].getBoundingClientRect();

    if (eRect.bottom >= pRect.top) {
      clashCooldown = true;

      setTimeout(() => {
        if (pBalls.length > eBalls.length) {
          eBalls[0]?.remove();
          enemyArea.style.top =
            enemyArea.offsetTop + 6 + "px";
        } else if (eBalls.length > pBalls.length) {
          pBalls[0]?.remove();
        } else {
          pBalls[0]?.remove();
          eBalls[0]?.remove();
        }
        clashCooldown = false;
      }, CLASH_DELAY);
    }
  }

// end
  function endBattle() {
    gameState = "END";

    let comparison = "=";
    let result = "NO WINNER";

    if (initialPlayerCount > initialEnemyCount) {
      comparison = ">";
      result = "YOU WIN";
      level++;
    } else if (initialPlayerCount < initialEnemyCount) {
      comparison = "<";
      result = "YOU LOSE";
      level = 1;
    }

    message.innerHTML = `
      ${initialPlayerCount} ${comparison} ${initialEnemyCount}<br>${result}
    `;

    message.style.position = "fixed";
    message.style.left = "50%";
    message.style.top = "50%";
    message.style.transform = "translate(-50%, -50%)";
    message.style.fontSize = "clamp(24px, 6vw, 40px)";
    message.style.textAlign = "center";
    message.style.zIndex = "999";

    setTimeout(resetGame, 2800);
  }

  function resetGame() {
    gates.forEach(g => g.remove());
    crates.forEach(c => c.remove());

    gates = [];
    crates = [];
    gatesPassed = 0;
    cratesSpawned = 0;

    ballCount = 1;
    playerX = game.clientWidth / 2 - 40;

    enemyArea.innerHTML = "";
    message.innerHTML = "";

    gameState = "RUN";
    levelText.textContent = "Level " + level;
    spawnPlayerBalls();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// -------------------- GAME STATE --------------------
let ballCount = 1;

const ball = {
  x: canvas.width / 2,
  y: canvas.height - 100,
  radius: 10,
  speed: 4
};

const gates = [
  { text: "×2", value: 2, x: canvas.width / 2 - 80, y: 300, hit: false },
  { text: "×3", value: 3, x: canvas.width / 2 + 80, y: 500, hit: false },
  { text: "÷2", value: 0.5, x: canvas.width / 2 - 80, y: 700, hit: false }
];

// -------------------- INPUT --------------------
let touchX = ball.x;

window.addEventListener("mousemove", e => {
  touchX = e.clientX;
});

window.addEventListener("touchmove", e => {
  touchX = e.touches[0].clientX;
});

// -------------------- DRAW --------------------
function drawBall() {
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawGates() {
  ctx.font = "26px Arial";
  ctx.textAlign = "center";

  gates.forEach(gate => {
    ctx.fillStyle = "cyan";
    ctx.fillText(gate.text, gate.x, gate.y);
  });
}

function drawUI() {
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Level 1`, 20, 30);
  ctx.fillText(`Balls: ${ballCount}`, 20, 55);
}

// -------------------- UPDATE --------------------
function update() {
  ball.y -= ball.speed;
  ball.x += (touchX - ball.x) * 0.1;

  gates.forEach(gate => {
    if (
      !gate.hit &&
