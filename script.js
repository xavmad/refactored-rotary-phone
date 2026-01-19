/* =====================================================
   PIXI CANVAS — FINAL STABLE VERSION
   ===================================================== */

const viewport = document.getElementById("viewport");
const loader = document.getElementById("loader");

/* --------------------
   PIXI SETUP
-------------------- */

const app = new PIXI.Application({
  resizeTo: viewport,
  backgroundAlpha: 0,
  antialias: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true
});

viewport.appendChild(app.view);

const world = new PIXI.Container();
app.stage.addChild(world);

world.alpha = 0;

/* --------------------
   CAMERA STATE
-------------------- */

let scale = 1;
let targetScale = 1;

let posX = 0;
let posY = 0;
let targetX = 0;
let targetY = 0;

const MIN_SCALE = 0.6;
const MAX_SCALE = 1.8;

const PAN_EASE = 0.08;
const ZOOM_EASE = 0.06;

let activeProject = null;
let cinematicActive = false;

/* --------------------
   CAMERA LOOP
-------------------- */

app.ticker.add(() => {
  posX += (targetX - posX) * PAN_EASE;
  posY += (targetY - posY) * PAN_EASE;
  scale += (targetScale - scale) * ZOOM_EASE;

  world.scale.set(scale);
  world.position.set(posX, posY);
});

/* --------------------
   LOAD IMAGES FROM HTML
-------------------- */

const domImages = [...document.querySelectorAll(".image")];
const sprites = [];

domImages.forEach(img => {
  const texture = PIXI.Texture.from(img.src);
  const sprite = new PIXI.Sprite(texture);

  sprite.anchor.set(0.5);

  const desiredWidth = 100;
  const scaleFactor = desiredWidth / texture.width;
  sprite.scale.set(scaleFactor);

  sprite.x = Math.random() * window.innerWidth;
  sprite.y = Math.random() * window.innerHeight;

  sprite.vx = (Math.random() - 0.5) * 0.3;
  sprite.vy = (Math.random() - 0.5) * 0.3;

  sprite.project = img.dataset.project;

  world.addChild(sprite);
  sprites.push(sprite);
});

/* --------------------
   FLOATING MOTION (VECTOR)
-------------------- */

app.ticker.add(() => {
  if (activeProject) return;

  sprites.forEach(s => {
    s.x += s.vx;
    s.y += s.vy;

    const m = 80;

    if (s.x < m || s.x > window.innerWidth - m) s.vx *= -1;
    if (s.y < m || s.y > window.innerHeight - m) s.vy *= -1;
  });
});

/* --------------------
   ZOOM
-------------------- */

viewport.addEventListener("wheel", e => {
  if (activeProject) return;
  e.preventDefault();

  const zoom = e.deltaY < 0 ? 1.12 : 0.88;

  const mouseX = e.clientX;
  const mouseY = e.clientY;

  const worldX = (mouseX - posX) / scale;
  const worldY = (mouseY - posY) / scale;

  targetScale = Math.min(
    Math.max(targetScale * zoom, MIN_SCALE),
    MAX_SCALE
  );

  targetX = mouseX - worldX * targetScale;
  targetY = mouseY - worldY * targetScale;
});

/* --------------------
   PAN
-------------------- */

viewport.addEventListener("mousedown", e => {
  if (activeProject) return;

  const startX = e.clientX - targetX;
  const startY = e.clientY - targetY;

  function move(ev) {
    targetX = ev.clientX - startX;
    targetY = ev.clientY - startY;
  }

  function up() {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
  }

  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
});

/* --------------------
   GROUP ACTIVATION
-------------------- */

sprites.forEach(sprite => {
  sprite.interactive = true;
  sprite.buttonMode = true;

  sprite.on("pointerdown", () => {
    if (activeProject) return;

    activeProject = sprite.project;

    sprites.forEach(s => {
      s.alpha = s.project === activeProject ? 1 : 0.15;
    });

    targetScale = 0.7;
    targetX = window.innerWidth * 0.15;
    targetY = window.innerHeight * 0.15;

    setTimeout(() => {
      const group = sprites.filter(
        s => s.project === activeProject
      );

      const left = window.innerWidth * 0.2;
      const top = window.innerHeight * 0.2;
      const bottom = window.innerHeight * 0.8;

      group.forEach(s => {
        s.x = left + (Math.random() - 0.5) * 160;
        s.y = top + Math.random() * (bottom - top);
      });

      targetScale = 1;
      targetX = 0;
      targetY = 0;

      document
        .getElementById("project-descriptions")
        .hidden = false;
    }, 650);
  });
});

/* --------------------
   ESC RESTORE
-------------------- */

window.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;

  activeProject = null;

  sprites.forEach(s => {
    s.alpha = 1;
  });

  targetScale = 1;
  targetX = 0;
  targetY = 0;

  document.getElementById("project-descriptions").hidden = true;
});

/* --------------------
   LOADER + FADE IN
-------------------- */

let loaded = 0;

sprites.forEach(s => {
  const bt = s.texture.baseTexture;

  if (bt.valid) {
    loaded++;
  } else {
    bt.once("loaded", () => {
      loaded++;
      if (loaded === sprites.length) reveal();
    });
  }
});

function reveal() {
  loader.classList.add("hidden");

  app.ticker.add(() => {
    world.alpha += 0.04;
    if (world.alpha >= 1) world.alpha = 1;
  });
}
