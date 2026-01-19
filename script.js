/* =====================================================
   PIXI CANVAS PROJECT SYSTEM
   ===================================================== */

const viewport = document.getElementById("viewport");
const loader = document.getElementById("loader");
const descriptions = document.getElementById("project-descriptions");

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

/* --------------------
   CAMERA LOOP
-------------------- */

app.ticker.add(() => {
  posX += (targetX - posX) * PAN_EASE;
  posY += (targetY - posY) * PAN_EASE;
  scale += (targetScale - scale) * ZOOM_EASE;

  world.position.set(posX, posY);
  world.scale.set(scale);
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
  const s = desiredWidth / texture.width;
  sprite.scale.set(s);

  sprite.x = Math.random() * window.innerWidth;
  sprite.y = Math.random() * window.innerHeight;

  sprite.vx = (Math.random() - 0.5) * 0.25;
  sprite.vy = (Math.random() - 0.5) * 0.25;

  sprite.project = img.dataset.project;

  sprite.interactive = true;
  sprite.buttonMode = true;

  world.addChild(sprite);
  sprites.push(sprite);
});

/* --------------------
   FLOATING MOTION
-------------------- */

app.ticker.add(() => {
  if (activeProject) return;

  const m = 80;

  sprites.forEach(s => {
    s.x += s.vx;
    s.y += s.vy;

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

  const mx = e.clientX;
  const my = e.clientY;

  const wx = (mx - posX) / scale;
  const wy = (my - posY) / scale;

  targetScale = Math.min(
    Math.max(targetScale * zoom, MIN_SCALE),
    MAX_SCALE
  );

  targetX = mx - wx * targetScale;
  targetY = my - wy * targetScale;
});

/* --------------------
   PAN
-------------------- */

viewport.addEventListener("mousedown", e => {
  if (activeProject) return;

  const sx = e.clientX - targetX;
  const sy = e.clientY - targetY;

  function move(ev) {
    targetX = ev.clientX - sx;
    targetY = ev.clientY - sy;
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
  sprite.on("pointerdown", () => {
    if (activeProject) return;

    activateGroup(sprite.project);
  });
});

function activateGroup(project) {
  activeProject = project;

  sprites.forEach(s => {
    s.alpha = s.project === project ? 1 : 0.15;
  });

  targetScale = 0.7;
  targetX = window.innerWidth * 0.15;
  targetY = window.innerHeight * 0.15;

  setTimeout(() => {
    const group = sprites.filter(
      s => s.project === project
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

    showDescription(project);
  }, 650);
}

/* --------------------
   DESCRIPTION PANEL
-------------------- */

function showDescription(project) {
  descriptions.hidden = false;

  [...descriptions.children].forEach(el => {
    el.style.display =
      el.dataset.project === project ? "block" : "none";
  });
}

/* --------------------
   ESC RESTORE
-------------------- */

window.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;

  activeProject = null;
  descriptions.hidden = true;

  sprites.forEach(s => {
    s.alpha = 1;
  });

  targetScale = 1;
  targetX = 0;
  targetY = 0;
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
