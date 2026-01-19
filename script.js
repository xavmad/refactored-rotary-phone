const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
const images = Array.from(document.querySelectorAll('.image'));
const descriptions = document.getElementById('project-descriptions');

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

const PAN_EASE = 0.06;
const ZOOM_EASE = 0.045;

let activeProject = null;
let cinematicActive = false;

let storedScale = 1;
let storedOriginX = 0;
let storedOriginY = 0;

/* =====================================================
   UTILS
===================================================== */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function applyTransform() {
  canvas.style.transform =
    `translate(${originX}px, ${originY}px) scale(${scale})`;
}

/* =====================================================
   CAMERA LOOP
===================================================== */

function cameraLoop() {
  originX += (targetOriginX - originX) * PAN_EASE;
  originY += (targetOriginY - originY) * PAN_EASE;
  scale   += (targetScale   - scale)   * ZOOM_EASE;

  if (Math.abs(targetOriginX - originX) < 0.01) originX = targetOriginX;
  if (Math.abs(targetOriginY - originY) < 0.01) originY = targetOriginY;
  if (Math.abs(targetScale - scale) < 0.0005) scale = targetScale;

  applyTransform();
  requestAnimationFrame(cameraLoop);
}

cameraLoop();

/* =====================================================
   ZOOM
===================================================== */

viewport.addEventListener('wheel', e => {
  if (activeProject) return;
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

/* =====================================================
   PAN
===================================================== */

viewport.addEventListener('mousedown', e => {
  if (activeProject) return;
  if (e.target.classList.contains('image')) return;

  const startX = e.clientX - targetOriginX;
  const startY = e.clientY - targetOriginY;

  function move(ev) {
    targetOriginX = ev.clientX - startX;
    targetOriginY = ev.clientY - startY;
  }

  function up() {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  }

  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
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

  img._vx = (Math.random() - 0.5) * 0.15;
  img._vy = (Math.random() - 0.5) * 0.15;

  img._floating = true;

  img.style.transform = `translate(${x}px, ${y}px)`;

  originals.push({ img, x, y });
});

/* =====================================================
   FLOATING MOTION (VECTOR BASED)
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
  img.addEventListener('click', e => {
    if (activeProject) return;
    e.stopPropagation();
    activateGroup(img.dataset.project);
  });
});

/* =====================================================
   GROUP LOGIC
===================================================== */

function animateTargets({ toScale, toX, toY }) {
  cinematicActive = true;
  targetScale = toScale;
  targetOriginX = toX;
  targetOriginY = toY;
}

function activateGroup(project) {

  storedScale = targetScale;
  storedOriginX = targetOriginX;
  storedOriginY = targetOriginY;

  activeProject = project;

  images.forEach(img => {
    img.style.opacity =
      img.dataset.project === project ? '1' : '0.15';

    if (img.dataset.project === project) {
      img._floating = false;
    }
  });

  animateTargets({
    toScale: 0.7,
    toX: window.innerWidth * 0.15,
    toY: window.innerHeight * 0.15
  });

  setTimeout(() => {

    const groupImages =
      images.filter(i => i.dataset.project === project);

    const left = window.innerWidth * 0.18;
    const top = window.innerHeight * 0.2;
    const bottom = window.innerHeight * 0.8;

    groupImages.forEach(img => {

      const x = left + (Math.random() - 0.5) * 120;
      const y = top + Math.random() * (bottom - top);

      img._x = x;
      img._y = y;
      img._tx = x;
      img._ty = y;

      img.style.width = '320px';
      img.style.zIndex = 1000;
      img.style.transform = `translate(${x}px, ${y}px)`;
    });

    animateTargets({
      toScale: 1,
      toX: 0,
      toY: 0
    });

  setTimeout(() => {
  descriptions.hidden = false;

  Array.from(descriptions.children).forEach(desc => {
    desc.style.display =
      desc.dataset.project === project ? 'block' : 'none';
  });

  cinematicActive = false;
}, 700);


  }, 600);
}

/* =====================================================
   DRAGGING (GROUP ONLY)
===================================================== */

images.forEach(img => {
  img.addEventListener('pointerdown', e => {

    if (!activeProject) return;
    if (img.dataset.project !== activeProject) return;
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    img.setPointerCapture(e.pointerId);
    img.style.zIndex = 3000;

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;

    const startX = img._x;
    const startY = img._y;

    function onMove(ev) {

      const dx = (ev.clientX - startMouseX) / scale;
      const dy = (ev.clientY - startMouseY) / scale;

      img._x = startX + dx;
      img._y = startY + dy;

      img._tx = img._x;
      img._ty = img._y;

      img.style.transform =
        `translate(${img._x}px, ${img._y}px)`;
    }

    function onUp(ev) {
      img.releasePointerCapture(ev.pointerId);
      img.removeEventListener('pointermove', onMove);
      img.removeEventListener('pointerup', onUp);
    }

    img.addEventListener('pointermove', onMove);
    img.addEventListener('pointerup', onUp);
  });
});

/* =====================================================
   ESC RESTORE
===================================================== */

window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;

  activeProject = null;
  descriptions.hidden = true;

  images.forEach(img => {
    img._floating = true;
    img.style.opacity = '1';
    img.style.zIndex = 1;
    img.style.width = '100px';
  });

  originals.forEach(o => {
    o.img._x = o.x;
    o.img._y = o.y;
    o.img._tx = o.x;
    o.img._ty = o.y;
    o.img.style.transform =
      `translate(${o.x}px, ${o.y}px)`;
  });

  animateTargets({
    toScale: storedScale,
    toX: storedOriginX,
    toY: storedOriginY
  });
});

