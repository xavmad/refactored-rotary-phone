/* =========================
   PIXI SETUP
========================= */

const viewport = document.getElementById("viewport");
const images = Array.from(document.querySelectorAll(".image"));
const descriptions = document.getElementById("project-descriptions");

// hide DOM images (Pixi replaces them)
images.forEach(img => img.style.display = "none");

const app = new PIXI.Application({
  resizeTo: viewport,
  backgroundAlpha: 0,
  antialias: true,
  autoDensity: true,
  resolution: window.devicePixelRatio || 1
});

viewport.appendChild(app.view);

/* =========================
   WORLD CONTAINER
========================= */

const world = new PIXI.Container();
app.stage.addChild(world);

/* =========================
   CAMERA STATE
========================= */

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

/* =========================
   SPRITES
========================= */

const sprites = [];
const DESIRED_WIDTH = 100;

images.forEach(img => {
  const texture = PIXI.Texture.from(img.src);
  const sprite = new PIXI.Sprite(texture);

  // center pivot
  sprite.anchor.set(0.5);

  // 🔑 match old CSS width: 100px
  const scale = DESIRED_WIDTH / texture.width;
  sprite.scale.set(scale);

  // random layout
  sprite.x = Math.random() * window.innerWidth;
  sprite.y = Math.random() * window.innerHeight;

  // smooth vector motion
  sprite.vx = (Math.random() - 0.5) * 0.3;
  sprite.vy = (Math.random() - 0.5) * 0.3;

  sprite.tx = sprite.x;
  sprite.ty = sprite.y;

  sprite.project = img.dataset.project;

  world.addChild(sprite);
  sprites.push(sprite);
});

/* =========================
   ZOOM
========================= */

viewport.addEventListener("wheel", e => {
  e.preventDefault();

  const zoom = e.deltaY < 0 ? 1.12 : 0.88;

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
});

/* =========================
   PAN
========================= */

let panning = false;
let panStartX = 0;
let panStartY = 0;

viewport.addEventListener("mousedown", e => {
  panning = true;
  panStartX = e.clientX - targetOriginX;
  panStartY = e.clientY - targetOriginY;
});

window.addEventListener("mousemove", e => {
  if (!panning) return;

  targetOriginX = e.clientX - panStartX;
  targetOriginY = e.clientY - panStartY;
});

window.addEventListener("mouseup", () => {
  panning = false;
});

/* =========================
   MAIN LOOP
========================= */

app.ticker.add(() => {

  // camera easing
  originX += (targetOriginX - originX) * PAN_EASE;
  originY += (targetOriginY - originY) * PAN_EASE;
  scale   += (targetScale   - scale)   * ZOOM_EASE;

  world.scale.set(scale);
  world.position.set(originX, originY);

  // floating motion
  sprites.forEach(s => {

    s.tx += s.vx;
    s.ty += s.vy;

    const margin = 120;
    const maxX = window.innerWidth - margin;
    const maxY = window.innerHeight - margin;

    if (s.tx < margin || s.tx > maxX) s.vx *= -1;
    if (s.ty < margin || s.ty > maxY) s.vy *= -1;

    s.x += (s.tx - s.x) * 0.02;
    s.y += (s.ty - s.y) * 0.02;
  });
});
