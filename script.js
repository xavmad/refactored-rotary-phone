// ===============================
// PIXI SETUP
// ===============================

const app = new PIXI.Application({
  resizeTo: window,
  backgroundAlpha: 0,
  antialias: true,
  autoDensity: true,
  resolution: window.devicePixelRatio || 1
});

document.getElementById("viewport").appendChild(app.view);

// main container = your canvas
const world = new PIXI.Container();
app.stage.addChild(world);

// ===============================
// CAMERA STATE
// ===============================

let scale = 1;
let targetScale = 1;

let originX = 0;
let originY = 0;
let targetOriginX = 0;
let targetOriginY = 0;

const MIN_SCALE = 0.6;
const MAX_SCALE = 1.8;

const PAN_EASE = 0.08;
const ZOOM_EASE = 0.06;

// ===============================
// LOAD IMAGES
// ===============================

const imageElements = document.querySelectorAll(".image");
const sprites = [];

imageElements.forEach(img => {
  const sprite = PIXI.Sprite.from(img.src);

  sprite.anchor.set(0.5);
  sprite.x = Math.random() * window.innerWidth;
  sprite.y = Math.random() * window.innerHeight;

  sprite.vx = (Math.random() - 0.5) * 0.25;
  sprite.vy = (Math.random() - 0.5) * 0.25;

  sprite.project = img.dataset.project;
  sprite.interactive = true;
  sprite.cursor = "pointer";

  sprite.on("pointerdown", () => {
    if (activeProject) return;
    activateGroup(sprite.project);
  });

  world.addChild(sprite);
  sprites.push(sprite);

  // hide DOM image
  img.style.display = "none";
});

// ===============================
// CAMERA LOOP
// ===============================

app.ticker.add(() => {

  scale += (targetScale - scale) * ZOOM_EASE;
  originX += (targetOriginX - originX) * PAN_EASE;
  originY += (targetOriginY - originY) * PAN_EASE;

  world.scale.set(scale);
  world.position.set(originX, originY);

  if (!activeProject) {
    sprites.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;

      const m = 80;

      if (s.x < m || s.x > window.innerWidth - m) s.vx *= -1;
      if (s.y < m || s.y > window.innerHeight - m) s.vy *= -1;
    });
  }
});

// ===============================
// ZOOM AT MOUSE
// ===============================

app.view.addEventListener("wheel", e => {
  if (activeProject) return;
  e.preventDefault();

  const zoom = e.deltaY < 0 ? 1.15 : 0.85;

  const mouseX = e.clientX;
  const mouseY = e.clientY;

  const worldX = (mouseX - originX) / scale;
  const worldY = (mouseY - originY) / scale;

  targetScale = Math.min(
    Math.max(targetScale * zoom, MIN_SCALE),
    MAX_SCALE
  );

  targetOriginX = mouseX - worldX * targetScale;
  targetOriginY = mouseY - worldY * targetScale;
}, { passive: false });

// ===============================
// PAN
// ===============================

let dragging = false;
let panStartX = 0;
let panStartY = 0;

app.view.addEventListener("mousedown", e => {
  if (activeProject) return;
  dragging = true;
  panStartX = e.clientX - targetOriginX;
  panStartY = e.clientY - targetOriginY;
});

window.addEventListener("mousemove", e => {
  if (!dragging) return;
  targetOriginX = e.clientX - panStartX;
  targetOriginY = e.clientY - panStartY;
});

window.addEventListener("mouseup", () => {
  dragging = false;
});

// ===============================
// GROUP LOGIC
// ===============================

let activeProject = null;
let stored = {};

function activateGroup(project) {

  activeProject = project;

  stored = {
    scale: scale,
    x: originX,
    y: originY
  };

  sprites.forEach(s => {
    s.alpha = s.project === project ? 1 : 0.15;
  });

  targetScale = 0.7;
  targetOriginX = window.innerWidth * 0.15;
  targetOriginY = window.innerHeight * 0.15;

  setTimeout(() => {

    const group = sprites.filter(s => s.project === project);

    const left = window.innerWidth * 0.18;
    const top = window.innerHeight * 0.2;
    const bottom = window.innerHeight * 0.8;

    group.forEach(s => {
      s.x = left + (Math.random() - 0.5) * 120;
      s.y = top + Math.random() * (bottom - top);
      s.width = 320;
      s.height *= 320 / s.width;
    });

    targetScale = 1;
    targetOriginX = 0;
    targetOriginY = 0;

    document.getElementById("project-descriptions").hidden = false;

  }, 600);
}

// ===============================
// ESC RESTORE
// ===============================

window.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;

  activeProject = null;

  sprites.forEach(s => {
    s.alpha = 1;
    s.width = 100;
  });

  targetScale = stored.scale;
  targetOriginX = stored.x;
  targetOriginY = stored.y;

  document.getElementById("project-descriptions").hidden = true;
});
