const tabs = document.querySelectorAll(".tab");
const pages = document.querySelectorAll(".page");
const jumpButtons = document.querySelectorAll("[data-page-jump]");

function showPage(pageId) {
  pages.forEach((page) => page.classList.toggle("active", page.id === pageId));
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.page === pageId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => showPage(tab.dataset.page));
});

jumpButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.pageJump));
});

const bag = document.querySelector("#punchingBag");
const arena = document.querySelector("#bagArena");
const rope = document.querySelector(".bag-rope");
const hitScore = document.querySelector("#hitScore");
let bagDragging = false;
let bagOffsetX = 0;
let bagOffsetY = 0;
let hits = 0;
let bagAngle = 0;
let bagVelocity = 0;
let bagSquash = 1;

function moveBag(clientX, clientY) {
  const arenaRect = arena.getBoundingClientRect();
  const bagRect = bag.getBoundingClientRect();
  const nextX = clientX - arenaRect.left - bagOffsetX;
  const nextY = clientY - arenaRect.top - bagOffsetY;
  const maxX = arenaRect.width - bagRect.width;
  const maxY = arenaRect.height - bagRect.height;
  bag.style.left = `${Math.max(0, Math.min(maxX, nextX))}px`;
  bag.style.top = `${Math.max(52, Math.min(maxY, nextY))}px`;
}

function updateRope() {
  const bagLeft = bag.offsetLeft;
  const bagTop = bag.offsetTop;
  const bagCenter = bagLeft + bag.offsetWidth / 2;
  rope.style.setProperty("--rope-left", `${bagCenter}px`);
  rope.style.setProperty("--rope-height", `${Math.max(36, bagTop - 12)}px`);
  rope.style.setProperty("--rope-angle", `${bagAngle * 0.22}deg`);
}

function scoreHit() {
  hits += 1;
  hitScore.textContent = hits;
  const direction = hits % 2 === 0 ? -1 : 1;
  bagVelocity += direction * (10 + Math.random() * 5);
  bagSquash = 0.9;
  bag.classList.remove("hit");
  window.requestAnimationFrame(() => bag.classList.add("hit"));
}

bag.addEventListener("pointerdown", (event) => {
  bagDragging = true;
  const rect = bag.getBoundingClientRect();
  bagOffsetX = event.clientX - rect.left;
  bagOffsetY = event.clientY - rect.top;
  bag.setPointerCapture(event.pointerId);
});

bag.addEventListener("pointermove", (event) => {
  if (bagDragging) {
    moveBag(event.clientX, event.clientY);
    bagVelocity += event.movementX * 0.08;
  }
});

bag.addEventListener("pointerup", (event) => {
  bagDragging = false;
  bag.releasePointerCapture(event.pointerId);
});

bag.addEventListener("click", scoreHit);

function animateBag() {
  if (!bagDragging) {
    bagVelocity += -bagAngle * 0.08;
    bagVelocity *= 0.9;
    bagAngle += bagVelocity;
  }

  bagSquash += (1 - bagSquash) * 0.18;
  bag.style.setProperty("--bag-angle", `${bagAngle}deg`);
  bag.style.setProperty("--bag-squash", bagSquash);
  updateRope();
  window.requestAnimationFrame(animateBag);
}

const canvas = document.querySelector("#beltGame");
const ctx = canvas.getContext("2d");
const startButton = document.querySelector("#startGame");
const scoreLabel = document.querySelector("#gameScore");
const bestLabel = document.querySelector("#bestScore");
const stateLabel = document.querySelector("#gameState");

const groundY = 335;
const player = { x: 92, y: groundY - 62, w: 44, h: 62, vy: 0, grounded: true, runFrame: 0 };
let obstacles = [];
let stars = [];
let dust = [];
let score = 0;
let best = Number(localStorage.getItem("kaanBestScore") || 0);
let speed = 4;
let running = false;
let lastTime = 0;
let spawnTimer = 0;
let checkpointDistance = 2200;
let distance = 0;
let nextCheckpoint = checkpointDistance;
let level = 1;

bestLabel.textContent = best;

function resetGame() {
  player.y = groundY - player.h;
  player.vy = 0;
  player.grounded = true;
  player.runFrame = 0;
  obstacles = [];
  stars = [];
  dust = [];
  score = 0;
  speed = 4;
  spawnTimer = 0;
  distance = 0;
  nextCheckpoint = checkpointDistance;
  level = 1;
  running = true;
  stateLabel.textContent = "Koşuyor";
  startButton.textContent = "Yeniden Başlat";
  scoreLabel.textContent = score;
}

function jump() {
  if (!running) resetGame();
  if (player.grounded) {
    player.vy = -13.5;
    player.grounded = false;
  }
}

function addObstacle() {
  const tall = Math.random() > 0.58;
  obstacles.push({
    x: canvas.width + 20,
    y: groundY - (tall ? 58 : 42),
    w: tall ? 30 : 42,
    h: tall ? 58 : 42,
    type: tall ? "cone" : "pad",
  });

  stars.push({
    x: canvas.width + 130,
    y: groundY - 118 - Math.random() * 70,
    size: 18,
    collected: false,
  });
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function collectStar(star) {
  const starBox = { x: star.x - star.size, y: star.y - star.size, w: star.size * 2, h: star.size * 2 };
  if (!star.collected && intersects(player, starBox)) {
    star.collected = true;
    score += 25;
    scoreLabel.textContent = Math.floor(score);
  }
}

function endGame(text) {
  running = false;
  scoreLabel.textContent = Math.floor(score);
  stateLabel.textContent = text;
  best = Math.max(best, Math.floor(score));
  localStorage.setItem("kaanBestScore", String(best));
  bestLabel.textContent = best;
}

function drawStar(x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((distance + x) * 0.025);
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? size : size * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  const stride = player.grounded ? Math.sin(player.runFrame) : 0.55;
  const bounce = player.grounded ? Math.abs(Math.sin(player.runFrame)) * 3 : 0;
  const px = player.x;
  const py = player.y - bounce;

  ctx.save();
  ctx.fillStyle = "rgba(23, 32, 51, 0.18)";
  ctx.beginPath();
  ctx.ellipse(px + 24, groundY + 5, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.fillRect(px + 8, py + 18, 28, 34);
  ctx.fillStyle = "#e8eef7";
  ctx.fillRect(px + 10, py + 22, 24, 9);
  ctx.fillStyle = "#111827";
  ctx.fillRect(px + 7, py + 45, 30, 8);
  ctx.fillStyle = "#f3b27a";
  ctx.beginPath();
  ctx.arc(px + 22, py + 10, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#063b79";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(px + 8, py + 28);
  ctx.lineTo(px - 8, py + 18 + stride * 10);
  ctx.moveTo(px + 36, py + 28);
  ctx.lineTo(px + 54, py + 18 - stride * 10);
  ctx.moveTo(px + 14, py + 52);
  ctx.lineTo(px + 4 + stride * 14, py + 70);
  ctx.moveTo(px + 31, py + 52);
  ctx.lineTo(px + 45 - stride * 14, py + 70);
  ctx.stroke();

  ctx.fillStyle = "#172033";
  ctx.beginPath();
  ctx.arc(px + 18, py + 9, 2.5, 0, Math.PI * 2);
  ctx.arc(px + 27, py + 9, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, "#a9dcff");
  sky.addColorStop(1, "#eaf7ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, groundY);

  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  for (let i = 0; i < 4; i += 1) {
    const cloudX = canvas.width - ((distance * (0.18 + i * 0.04)) % (canvas.width + 180)) + i * 120 - 160;
    ctx.beginPath();
    ctx.ellipse(cloudX, 76 + i * 28, 58, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(cloudX + 38, 68 + i * 28, 34, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ffd338";
  ctx.beginPath();
  ctx.arc(760, 74, 38, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d7ede0";
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  ctx.fillStyle = "#f2d99f";
  ctx.fillRect(0, groundY - 13, canvas.width, 13);

  for (let x = -80; x < canvas.width + 120; x += 90) {
    ctx.strokeStyle = "rgba(6, 59, 121, 0.16)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - (distance % 90), groundY);
    ctx.lineTo(x + 80 - (distance % 90), canvas.height);
    ctx.stroke();
  }

  obstacles.forEach((obstacle) => {
    ctx.save();
    ctx.translate(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2);
    ctx.rotate(Math.sin((distance + obstacle.x) * 0.05) * 0.035);
    ctx.fillStyle = obstacle.type === "cone" ? "#fb923c" : "#d94032";
    ctx.fillRect(-obstacle.w / 2, -obstacle.h / 2, obstacle.w, obstacle.h);
    ctx.fillStyle = obstacle.type === "cone" ? "#ffffff" : "#8e1f18";
    ctx.fillRect(-obstacle.w / 2 + 7, -obstacle.h / 2 + 9, obstacle.w - 14, 7);
    ctx.restore();
  });

  stars.forEach((star) => {
    if (!star.collected) drawStar(star.x, star.y, star.size, "#ffd338");
  });

  dust.forEach((dot) => {
    ctx.fillStyle = `rgba(95, 70, 50, ${dot.life})`;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
    ctx.fill();
  });

  drawPlayer();

  const finishDistance = Math.max(0, nextCheckpoint - distance);
  const finishX = canvas.width - 86 - finishDistance * 0.35;
  ctx.fillStyle = "#111827";
  ctx.fillRect(finishX, groundY - 92, 16, 92);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(finishX + 16, groundY - 92, 58, 34);
  ctx.fillStyle = "#111827";
  ctx.font = "700 16px Arial";
  ctx.fillText(`Tur ${level}`, finishX + 22, groundY - 70);
}

function updateGame(time) {
  const delta = Math.min(32, time - lastTime || 16);
  lastTime = time;

  if (running) {
    player.vy += 0.62;
    player.y += player.vy;
    if (player.y >= groundY - player.h) {
      player.y = groundY - player.h;
      player.vy = 0;
      player.grounded = true;
    }
    player.runFrame += speed * 0.09;

    spawnTimer -= delta;
    if (spawnTimer <= 0) {
      addObstacle();
      spawnTimer = 980 + Math.random() * 560;
    }

    distance += speed;
    speed += 0.0025;
    score += 0.11;
    scoreLabel.textContent = Math.floor(score);

    if (player.grounded && Math.random() > 0.72) {
      dust.push({
        x: player.x + 18,
        y: groundY + 4,
        vx: -1.5 - Math.random() * 1.5,
        vy: -0.5 - Math.random() * 1.2,
        life: 0.5,
        size: 2 + Math.random() * 3,
      });
    }

    obstacles.forEach((obstacle) => {
      obstacle.x -= speed;
      if (intersects(player, obstacle)) endGame("Tekrar dene");
    });
    stars.forEach((star) => {
      star.x -= speed;
      collectStar(star);
    });
    dust.forEach((dot) => {
      dot.x += dot.vx - speed * 0.2;
      dot.y += dot.vy;
      dot.life -= 0.018;
    });

    obstacles = obstacles.filter((obstacle) => obstacle.x > -80);
    stars = stars.filter((star) => star.x > -80 && !star.collected);
    dust = dust.filter((dot) => dot.life > 0);

    if (distance >= nextCheckpoint) {
      score += 100;
      scoreLabel.textContent = Math.floor(score);
      level += 1;
      nextCheckpoint += checkpointDistance + level * 220;
      stateLabel.textContent = "Siyah kuşak!";
      setTimeout(() => {
        if (running) stateLabel.textContent = `Tur ${level}`;
      }, 900);
    }
  }

  drawScene();
  window.requestAnimationFrame(updateGame);
}

startButton.addEventListener("click", resetGame);
canvas.addEventListener("pointerdown", jump);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    jump();
  }
});

drawScene();
animateBag();
window.requestAnimationFrame(updateGame);
