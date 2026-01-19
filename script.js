const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
const images = Array.from(document.querySelectorAll('.image'));
const descriptions = document.getElementById('project-descriptions');

/* ======================
   CAMERA STATE
====================== */

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

/* ======================
   UTILITIES
====================== */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function applyTransform() {
  canvas.style.transform =
    `translate(${originX}px, ${originY}px) scale(${scale})`;
}

/* ======================
   CAMERA LOOP
====================== */

function cameraLoop() {

  originX += (targetOriginX - originX) * PAN_EASE;
  originY += (targetOriginY - originY) * PAN_EASE;
  scale   += (targetScale   - scale)   * ZOOM_EASE;

  if (Math.abs(targetOriginX - originX) < 0.01) originX = targetOriginX;
  if (Math.abs(targetOriginY - originY) < 0.01) originY = targetOriginY;
  if (Math.abs(targetScale   - scale)   < 0.0005) scale = targetScale;

  applyTransform();
  requestAnimationFrame(cameraLoop);
}

cameraLoop();

/* ======================
   ZOOM
====================== */

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

/* ======================
   PAN
====================== */

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

/* ======================
   INITIAL IMAGE SETUP
====================== */

const originals = [];

images.forEach(img => {

  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight;

  img._x = x;
  img._y = y;

  img._vx = (Math.random() - 0.5) * 0.12;
  img._vy = (Math.random() - 0.5) * 0.12;

  img.dataset.x = x;
  img.dataset.y = y;

  img.style.transform =
    `translate(${Math.round(x)}px, ${Math.round(y)}px)`;

  originals.push({ img, x, y });
});

/* ======================
   FLOATING — TRUE VECTOR
====================== */

function floatImages() {

  if (!activeProject) {

    images.forEach(img => {

      // integrate velocity
      img._x += img._vx;
      img._y += img._vy;

      const margin = 80;
      const maxX = window.innerWidth  - margin;
      const maxY = window.innerHeight - margin;

      // bounce cleanly
      if (img._x < margin || img._x > maxX) {
        img._vx *= -1;
        img._x += img._vx;
      }

      if (img._y < margin || img._y > maxY) {
        img._vy *= -1;
        img._y += img._vy;
      }

      // very gentle damping
      img._vx *= 0.999;
      img._vy *= 0.999;

      const px = Math.round(img._x);
      const py = Math.round(img._y);

      img.dataset.x = px;
      img.dataset.y = py;

      img.style.transform =
        `translate(${px}px, ${py}px)`;
    });
  }

  requestAnimationFrame(floatImages);
}

floatImages();

/* ======================
   GROUP ACTIVATION
====================== */

images.forEach(img => {
  img.addEventListener('click', e => {
    if (activeProject) return;
    e.stopPropagation();
    activateGroup(img.dataset.project);
  });
});

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

      img.dataset.x = x;
      img.dataset.y = y;

      img.style.width = '320px';
      img.style.zIndex = 1000;

      img.style.transform =
        `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    });

    animateTargets({
      toScale: 1,
      toX: 0,
      toY: 0
    });

    setTimeout(() => {
      descriptions.hidden = false;
      cinematicActive = false;
    }, 700);

  }, 600);
}

/* ======================
   ESC RESTORE
====================== */

window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;

  activeProject = null;
  descriptions.hidden = true;

  originals.forEach(o => {

    o.img._x = o.x;
    o.img._y = o.y;

    o.img.style.width = '100px';
    o.img.style.opacity = '1';
    o.img.style.zIndex = 1;

    o.img.style.transform =
      `translate(${Math.round(o.x)}px, ${Math.round(o.y)}px)`;
  });

  animateTargets({
    toScale: storedScale,
    toX: storedOriginX,
    toY: storedOriginY
  });
});
