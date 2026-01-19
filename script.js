document.addEventListener("DOMContentLoaded", () => {
  // ALL your JS code here

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// ================= UI =================
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const pauseBtn = document.getElementById("pauseBtn");
const homeBtn = document.getElementById("homeBtn");
const muteBtn = document.getElementById("muteBtn");
const ballsEl = document.getElementById("balls");

// ================= CONFIG =================
const GATE_SPEED = 2.5;
const ENEMY_SPEED = 2;
const CLASH_DELAY = 150;
const GATES_PER_CRATE = 5;

// ================= STORAGE =================
let bestScore = Number(localStorage.getItem("bestScore")) || 0;
bestEl.textContent = "Best: " + bestScore;

// ================= SOUND =================
const sounds = {
  multiply: new Audio("sounds/multiply.wav"),
  divide: new Audio("sounds/divide.wav"),
  battle: new Audio("sounds/battle.wav"),
  win: new Audio("sounds/win.wav"),
  lose: new Audio("sounds/lose.wav"),
  bgm: new Audio("sounds/bgm.mp3")
};

sounds.bgm.loop = true;
sounds.bgm.volume = 0.4;

let muted = false;

function playSound(s) {
  if (!s || muted) return;
  s.currentTime = 0;
  s.play().catch(()=>{});
}

// Mobile unlock
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  Object.values(sounds).forEach(s=>{
    s.play().then(()=>{
      s.pause();
      s.currentTime = 0;
    }).catch(()=>{});
  });
  sounds.bgm.play().catch(()=>{});
}

canvas.addEventListener("touchstart", unlockAudio, { once:true });
canvas.addEventListener("mousedown", unlockAudio, { once:true });

// ================= GAME STATE =================
let level = 1;
let ballCount = 1;
let score = 0;
let gatesPassed = 0;
let cratesSpawned = 0;
let gameState = "RUN";
let paused = false;

// ================= PLAYER =================
let touchX = canvas.width / 2;
const player = { x: canvas.width / 2, y: canvas.height - 120, r: 10 };

// ================= OBJECTS =================
let gates = [];
let crates = [];
let enemies = [];

// ================= INPUT =================
function move(x) { touchX = x; }
canvas.addEventListener("mousemove", e => move(e.clientX));
canvas.addEventListener("touchmove", e => move(e.touches[0].clientX), { passive:true });

// ================= HELPERS =================
function circleRect(cx, cy, r, o) {
  const x = Math.max(o.x, Math.min(cx, o.x + o.w));
  const y = Math.max(o.y, Math.min(cy, o.y + o.h));
  return (cx-x)**2 + (cy-y)**2 < r*r;
}

// ================= SPAWN =================
function spawnGate() {
  const ops = ["*2", "/2", "*3"];
  gates.push({
    x: Math.random() * (canvas.width - 100),
    y: -80,
    w: 90,
    h: 60,
    op: ops[Math.floor(Math.random()*ops.length)],
    used:false,
    counted:false
  });
}

setInterval(()=>{ if(gameState==="RUN" && !paused) spawnGate(); },1000);

function spawnCrate() {
  crates.push({ x:Math.random()*(canvas.width-90), y:-100, w:90, h:60 });
}

let initialEnemyCount=0, initialPlayerCount=0;

function spawnEnemies() {
  enemies=[];
  initialEnemyCount = Math.floor(Math.random()*5)+5+level*2;
  initialPlayerCount = ballCount;
  for(let i=0;i<initialEnemyCount;i++){
    enemies.push({ x:canvas.width/2-initialEnemyCount*12+i*24, y:-40, r:10 });
  }
}

// ================= LOGIC =================
function applyOperation(op){
  const v = parseInt(op.slice(1));
  if(op.startsWith("*")){
    ballCount *= v;
    playSound(sounds.multiply);
  } else {
    ballCount = Math.max(1, Math.floor(ballCount/v));
    playSound(sounds.divide);
  }
  score += 10;
}

function updatePlayer(){
  player.x += (touchX - player.x) * 0.18;
}

function updateRun(){
  updatePlayer();

  gates.forEach((g,i)=>{
    g.y += GATE_SPEED;

    for(let b=0;b<ballCount;b++){
      if(!g.used && circleRect(player.x+b*22, player.y, player.r, g)){
        g.used=true;
        applyOperation(g.op);
      }
    }

    if(!g.counted && g.y>player.y){
      g.counted=true;
      gatesPassed++;
      if(Math.floor(gatesPassed/GATES_PER_CRATE)>cratesSpawned){
        cratesSpawned++;
        spawnCrate();
      }
    }

    if(g.y>canvas.height+100) gates.splice(i,1);
  });

  crates.forEach((c,i)=>{
    c.y+=GATE_SPEED;
    for(let b=0;b<ballCount;b++){
      if(circleRect(player.x+b*22, player.y, player.r, c)){
        playSound(sounds.battle);
        gameState="BATTLE";
        spawnEnemies();
        crates=[];
        return;
      }
    }
    if(c.y>canvas.height+100) crates.splice(i,1);
  });
}

let endText="";

function updateBattle(){
  enemies.forEach(e=>e.y+=ENEMY_SPEED);

  if(enemies.length===0||ballCount===0){
    endBattle(); return;
  }

  if(enemies[0].y+enemies[0].r>=player.y){
    setTimeout(()=>{
      if(ballCount>enemies.length) enemies.shift();
      else if(enemies.length>ballCount) ballCount--;
      else { enemies.shift(); ballCount--; }
    },CLASH_DELAY);
  }
}

function endBattle(){
  gameState="END";

  if(initialPlayerCount>initialEnemyCount){
    endText=`${initialPlayerCount} > ${initialEnemyCount}\nYOU WIN`;
    playSound(sounds.win);
    level++;
  } else if(initialPlayerCount<initialEnemyCount){
    endText=`${initialPlayerCount} < ${initialEnemyCount}\nYOU LOSE`;
    playSound(sounds.lose);
    level=1;
  } else endText=`${initialPlayerCount} = ${initialEnemyCount}\nNO WINNER`;

  bestScore = Math.max(bestScore, score);
  localStorage.setItem("bestScore", bestScore);
  bestEl.textContent = "Best: " + bestScore;

  setTimeout(resetGame,2800);
}

function resetGame(){
  gates=[]; crates=[]; enemies=[];
  ballCount=1; gatesPassed=0; cratesSpawned=0;
score=0;
  gameState="RUN";
}

// ================= DRAW =================
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  for(let i=0;i<ballCount;i++){
    ctx.fillStyle=i===0?"cyan":"lightgreen";
    ctx.beginPath();
    ctx.arc(player.x+i*22, player.y, player.r, 0, Math.PI*2);
    ctx.fill();
  }

  gates.forEach(g=>{
    ctx.fillStyle=g.used?"#555":"orange";
    ctx.fillRect(g.x,g.y,g.w,g.h);
    ctx.fillStyle="black";
    ctx.font="20px Arial";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText(g.op.replace("*","×").replace("/","÷"), g.x+g.w/2, g.y+g.h/2);
  });

  crates.forEach(c=>{
    ctx.fillStyle="#555";
    ctx.fillRect(c.x,c.y,c.w,c.h);
    ctx.fillText("📦", c.x+c.w/2, c.y+c.h/2);
  });

  enemies.forEach(e=>{
    ctx.fillStyle="red";
    ctx.beginPath();
    ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
    ctx.fill();
  });

  if(gameState==="END"){
    ctx.fillStyle="white";
    ctx.font="32px Arial";
    ctx.textAlign="center";
    ctx.fillText(endText, canvas.width/2, canvas.height/2);
  }

  scoreEl.textContent="Score: "+score;
  ballsEl.textContent = "Balls: " + ballCount;
}

// ================= LOOP =================
function loop(){
  if(!paused){
    if(gameState==="RUN") updateRun();
    if(gameState==="BATTLE") updateBattle();
  }
  draw();
  requestAnimationFrame(loop);
}
loop();

// ================= BUTTONS =================
pauseBtn.onclick=()=>{
  paused=!paused;
  pauseBtn.textContent = paused?"▶":"⏸";
};

homeBtn.onclick=()=>{
  level=1; score=0;
  resetGame();
};

muteBtn.onclick=()=>{
  muted=!muted;
  muteBtn.textContent = muted?"🔇":"🔊";
};
});
