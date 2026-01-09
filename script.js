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
      Math.abs(ball.x - gate.x) < 30 &&
      Math.abs(ball.y - gate.y) < 20
    ) {
      ballCount = Math.max(1, Math.floor(ballCount * gate.value));
      gate.hit = true;
    }
  });

  if (ball.y < -50) {
    ball.y = canvas.height + 50;
    gates.forEach(g => g.hit = false);
  }
}

// -------------------- LOOP --------------------
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  update();
  drawGates();
  drawBall();
  drawUI();

  requestAnimationFrame(gameLoop);
}

gameLoop();
