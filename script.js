const viewport = document.getElementById("viewport");
const canvas = document.getElementById("canvas");
const images = Array.from(document.querySelectorAll(".image"));
const descriptions = document.getElementById("project-descriptions");

/* =====================================================
   CAMERA STATE
===================================================== */

let originX = 0;
let originY = 0;
let scale = 1;

let targetOriginX = 0;
let targetOriginY = 0;
let targetScale = 1;

const MIN_SCALE = 0.6;
const MAX_SCALE = 1.8;

const PAN_EASE = 0.07;
const ZOOM_EASE = 0.045;

let activeProject = null;

let storedScale = 1;
let storedOriginX = 0;
let storedOriginY = 0;

/* =====================================================
   CAMERA LOOP
===================================================== */

function applyTransform() {
  canvas.style.transform =
    `translate(${originX}px, ${originY}px) scale(${scale})`;
}

function cameraLoop() {
  originX += (targetOriginX - originX) * PAN_EASE;
  originY += (targetOriginY - originY) * PAN_EASE;
  scale   += (targetScale   - scale)   * ZOOM_EASE;

  applyTransform();
  requestAnimationFrame(cameraLoop);
}

cameraLoop();

/* =====================================================
   ZOOM
===================================================== */

viewport.addEventListener("wheel", e => {
  if (activeProject) return;
  e.preventDefault();

  const zoom = e.deltaY < 0 ? 1.12 : 0.88;

  const mx = e.clientX;
  const my = e.clientY;

  const wx = (mx - originX) / scale;
  const wy = (my - originY) / scale;

  targetScale = Math.min(
    Math.max(targetScale * zoom, MIN_SCALE),
    MAX_SCALE
  );

  targetOriginX = mx - wx * targetScale;
  targetOriginY = my - wy * targetScale;
});

/* =====================================================
   PAN
===================================================== */

viewport.addEventListener("mousedown", e => {
  if (activeProject) return;
  if (e.target.classList.contains("image")) return;

  const sx = e.clientX - targetOriginX;
  const sy = e.clientY - targetOriginY;

  function move(ev) {
    targetOriginX = ev.clientX - sx;
    targetOriginY = ev.clientY - sy;
  }

  function up() {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
  }

  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
});

/* =====================================================
   INITIAL IMAGE SETUP
===================================================== */

const originals = [];

images.forEach(img => {
  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight;

  img._x = x;
  img._y = y;
  img._tx = x;
  img._ty = y;

  img._vx = (Math.random() - 0.5) * 0.12;
  img._vy = (Math.random() - 0.5) * 0.12;

  img._floating = true;

  img.style.transform = `translate(${x}px, ${y}px)`;

  originals.push({ img, x, y });
});

/* =====================================================
   FLOATING MOTION — STABLE VECTOR
===================================================== */

function floatImages() {
  if (!activeProject) {
    images.forEach(img => {
      if (!img._floating) return;

      img._tx += img._vx;
      img._ty += img._vy;

      const m = 80;
      const maxX = window.innerWidth - m;
      const maxY = window.innerHeight - m;

      if (img._tx < m || img._tx > maxX) img._vx *= -1;
      if (img._ty < m || img._ty > maxY) img._vy *= -1;

      img._x += (img._tx - img._x) * 0.02;
      img._y += (img._ty - img._y) * 0.02;

      img.style.transform =
        `translate(${img._x}px, ${img._y}px)`;
    });
  }

  requestAnimationFrame(floatImages);
}

floatImages();

/* =====================================================
   IMAGE CLICK
===================================================== */

images.forEach(img => {
  img.addEventListener("click", e => {
    if (activeProject) return;
    e.stopPropagation();
    activateGroup(img.dataset.project);
  });
});

/* =====================================================
   GROUP LOGIC — NO OVERLAP
===================================================== */

function activateGroup(project) {

  storedScale = targetScale;
  storedOriginX = targetOriginX;
  storedOriginY = targetOriginY;

  activeProject = project;

  images.forEach(img => {
    img.style.opacity =
      img.dataset.project === project ? "1" : "0.15";

    img._floating = img.dataset.project !== project;
  });

  /* zoom out */
  targetScale = 0.7;
  targetOriginX = window.innerWidth * 0.15;
  targetOriginY = window.innerHeight * 0.15;

setTimeout(() => {

  const groupImages =
    images.filter(i => i.dataset.project === project);

  /* ===============================
     CENTER OF LEFT ZONE
  =============================== */

  const CENTER_X = window.innerWidth * 0.28;
  const CENTER_Y = window.innerHeight * 0.5;

  /* ===============================
     SAFE SCREEN BOUNDS
  =============================== */

  const SAFE_LEFT   = window.innerWidth * 0.06;
  const SAFE_RIGHT  = window.innerWidth * 0.52;
  const SAFE_TOP    = window.innerHeight * 0.08;
  const SAFE_BOTTOM = window.innerHeight * 0.90;

  /* ===============================
     IMAGE GEOMETRY
  =============================== */

  const IMAGE_SIZE = 320;
  const SPACING    = 90;

  /* golden-angle spiral */
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ≈ 2.399

  groupImages.forEach((img, i) => {

    img.style.width = "320px";

    const radius =
      Math.sqrt(i) * (IMAGE_SIZE * 0.55 + SPACING);

    const angle = i * GOLDEN_ANGLE;

    let x =
      CENTER_X +
      Math.cos(angle) * radius;

    let y =
      CENTER_Y +
      Math.sin(angle) * radius;

    /* keep fully visible on screen */
    const margin = IMAGE_SIZE * 0.55;

    x = Math.max(SAFE_LEFT + margin,
        Math.min(SAFE_RIGHT - margin, x));

    y = Math.max(SAFE_TOP + margin,
        Math.min(SAFE_BOTTOM - margin, y));

    img._x = x;
    img._y = y;
    img._tx = x;
    img._ty = y;

    img.style.zIndex = 1000;
    img.style.transform =
      `translate(${x}px, ${y}px)`;
  });

  /* ===============================
     CAMERA RETURN
  =============================== */

  targetScale = 1;
  targetOriginX = 0;
  targetOriginY = 0;

  /* ===============================
     TEXT PANEL
  =============================== */

  setTimeout(() => {
    descriptions.classList.add("visible");

    Array.from(descriptions.children).forEach(desc => {
      desc.style.display =
        desc.dataset.project === project ? "block" : "none";
    });

  }, 420);

}, 520);





}

/* =====================================================
   DRAGGING — GROUP ONLY
===================================================== */

images.forEach(img => {
  img.addEventListener("pointerdown", e => {

    if (!activeProject) return;
    if (img.dataset.project !== activeProject) return;

    e.preventDefault();
    e.stopPropagation();

    img.setPointerCapture(e.pointerId);
    img.style.zIndex = 3000;

    const sx = e.clientX;
    const sy = e.clientY;
    const ix = img._x;
    const iy = img._y;

    function move(ev) {
      const dx = (ev.clientX - sx) / scale;
      const dy = (ev.clientY - sy) / scale;

      img._x = ix + dx;
      img._y = iy + dy;
      img._tx = img._x;
      img._ty = img._y;

      img.style.transform =
        `translate(${img._x}px, ${img._y}px)`;
    }

    function up(ev) {
      img.releasePointerCapture(ev.pointerId);
      img.removeEventListener("pointermove", move);
      img.removeEventListener("pointerup", up);
    }

    img.addEventListener("pointermove", move);
    img.addEventListener("pointerup", up);
  });
});

/* =====================================================
   ESC RESTORE
===================================================== */

window.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;

  activeProject = null;
  descriptions.classList.remove("visible");

  images.forEach(img => {
    img._floating = true;
    img.style.opacity = "1";
    img.style.zIndex = 1;
    img.style.width = "100px";
  });

  originals.forEach(o => {
    o.img._x = o.x;
    o.img._y = o.y;
    o.img._tx = o.x;
    o.img._ty = o.y;
    o.img.style.transform =
      `translate(${o.x}px, ${o.y}px)`;
  });

  targetScale = storedScale;
  targetOriginX = storedOriginX;
  targetOriginY = storedOriginY;
});
