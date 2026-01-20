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

  const SAFE_RIGHT_EDGE = window.innerWidth * 0.55;
  const SAFE_LEFT_EDGE  = window.innerWidth * 0.05;
  const SAFE_TOP_EDGE   = window.innerHeight * 0.06;
  const SAFE_BOTTOM_EDGE= window.innerHeight * 0.92;

  const placed = [];
  const MIN_DISTANCE = 260; // spacing between images
  const MAX_TRIES = 160;

  function overlaps(x, y) {
    for (const p of placed) {
      const dx = x - p.x;
      const dy = y - p.y;
      if (Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE) {
        return true;
      }
    }
    return false;
  }

  groupImages.forEach(img => {

    // ✅ measure real rendered size
    img.style.width = "320px";
    img.style.visibility = "hidden";

    const rect = img.getBoundingClientRect();
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;

    let x, y;
    let tries = 0;

    do {
      x =
        SAFE_LEFT_EDGE  + halfW +
        Math.random() * (SAFE_RIGHT_EDGE - SAFE_LEFT_EDGE - halfW * 2);

      y =
        SAFE_TOP_EDGE   + halfH +
        Math.random() * (SAFE_BOTTOM_EDGE - SAFE_TOP_EDGE - halfH * 2);

      tries++;
    }
    while (overlaps(x, y) && tries < MAX_TRIES);

    placed.push({ x, y });

    img._x = x;
    img._y = y;
    img._tx = x;
    img._ty = y;

    img.style.zIndex = 1000;
    img.style.visibility = "visible";
    img.style.transform =
      `translate(${x}px, ${y}px)`;
  });

  /* camera returns */
  targetScale = 1;
  targetOriginX = 0;
  targetOriginY = 0;

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
