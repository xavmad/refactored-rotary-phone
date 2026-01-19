const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
const images = Array.from(document.querySelectorAll('.image'));
const descriptions = document.getElementById('project-descriptions');

/* --------------------
   Camera state
-------------------- */

let scale = 1;
let originX = 0;
let originY = 0;

let targetScale = 1;
let targetOriginX = 0;
let targetOriginY = 0;

const MIN_SCALE = 0.6;
const MAX_SCALE = 1.8;

const PAN_EASE = 0.15;
const ZOOM_EASE = 0.04;

let zoomVelocity = 0;
let zoomAnchorX = 0;
let zoomAnchorY = 0;

let isPanning = false;
let startX = 0;
let startY = 0;

let cinematicActive = false;
let activeProject = null;

let storedScale = 1;
let storedOriginX = 0;
let storedOriginY = 0;

/* --------------------
   Utils
-------------------- */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function applyTransform() {
  canvas.style.transform =
    `translate(${originX}px, ${originY}px) scale(${scale})`;
}

/* --------------------
   Camera animation
-------------------- */

function animateCamera({ toScale, toX, toY, duration = 900 }) {
  cinematicActive = true;

  const fromScale = scale;
  const fromX = originX;
  const fromY = originY;
  const start = performance.now();

  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease =
      t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

    scale   = fromScale + (toScale - fromScale) * ease;
    originX = fromX     + (toX - fromX) * ease;
    originY = fromY     + (toY - fromY) * ease;

    applyTransform();

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      targetScale = scale;
      targetOriginX = originX;
      targetOriginY = originY;
      cinematicActive = false;
    }
  }

  requestAnimationFrame(frame);
}

/* --------------------
   Camera loop
-------------------- */

function cameraLoop() {

  if (!cinematicActive) {

    if (Math.abs(zoomVelocity) > 0.000001) {
      const zoomFactor = 1 + zoomVelocity;

      const worldX = (zoomAnchorX - originX) / scale;
      const worldY = (zoomAnchorY - originY) / scale;

      const newScale = Math.min(
        Math.max(scale * zoomFactor, MIN_SCALE),
        MAX_SCALE
      );

      targetScale = newScale;
      targetOriginX = zoomAnchorX - worldX * newScale;
      targetOriginY = zoomAnchorY - worldY * newScale;

      zoomVelocity *= 0.96;
    }

    if (Math.abs(zoomVelocity) < 0.0000005) {
      zoomVelocity = 0;
    }

    const panEase = PAN_EASE;

    originX = lerp(originX, targetOriginX, panEase);
    originY = lerp(originY, targetOriginY, panEase);
    scale   = lerp(scale, targetScale, ZOOM_EASE);
  }

  applyTransform();
  requestAnimationFrame(cameraLoop);
}

cameraLoop();

/* --------------------
   Zoom
-------------------- */

viewport.addEventListener('wheel', e => {
  if (activeProject) return;
  e.preventDefault();

  zoomVelocity += -e.deltaY * 0.00012;
  zoomAnchorX = e.clientX;
  zoomAnchorY = e.clientY;
});

/* --------------------
   Pan
-------------------- */

viewport.addEventListener('mousedown', e => {
  if (activeProject) return;
  if (e.target.classList.contains('image')) return;

  // 🔥 stop all zoom motion immediately
  zoomVelocity = 0;

  scale = targetScale;
  originX = targetOriginX;
  originY = targetOriginY;

  isPanning = true;
  startX = e.clientX - originX;
  startY = e.clientY - originY;
});



/* --------------------
   Initial layout
-------------------- */

const originals = [];

images.forEach(img => {
  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight;

  img.dataset.x = x;
  img.dataset.y = y;

  img.style.left = `${x}px`;
  img.style.top  = `${y}px`;

  img._vx = (Math.random() - 0.5) * 0.15;
  img._vy = (Math.random() - 0.5) * 0.15;

  originals.push({ img, x, y });
});

/* --------------------
   Floating motion
-------------------- */

function floatImages() {
  if (!activeProject) {
    images.forEach(img => {
      let x = parseFloat(img.dataset.x);
      let y = parseFloat(img.dataset.y);

      x += img._vx;
      y += img._vy;

      const m = 80;
      if (x < m || x > window.innerWidth - m) img._vx *= -1;
      if (y < m || y > window.innerHeight - m) img._vy *= -1;

      img.dataset.x = x;
      img.dataset.y = y;

      img.style.left = `${x}px`;
      img.style.top  = `${y}px`;
    });
  }
  requestAnimationFrame(floatImages);
}
floatImages();

/* --------------------
   Image click
-------------------- */

images.forEach(img => {
  img.addEventListener('click', e => {
    if (activeProject) return;
    e.stopPropagation();
    activateGroup(img.dataset.project);
  });
});

/* --------------------
   Group logic
-------------------- */

function activateGroup(project) {

  storedScale = scale;
  storedOriginX = originX;
  storedOriginY = originY;

  activeProject = project;

  images.forEach(img => {
    img.style.opacity =
      img.dataset.project === project ? '1' : '0.15';
  });

  animateCamera({
    toScale: 0.7,
    toX: window.innerWidth * 0.15,
    toY: window.innerHeight * 0.15,
    duration: 700
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

      img.dataset.x = x;
      img.dataset.y = y;

      img.style.width = '320px';
      img.style.left = `${x}px`;
      img.style.top  = `${y}px`;
      img.style.zIndex = 1000;
    });

    animateCamera({
      toScale: 1,
      toX: 0,
      toY: 0,
      duration: 900
    });

    setTimeout(() => {
      descriptions.hidden = false;
    }, 900);

  }, 750);
}

/* --------------------
   ESC restore
-------------------- */

window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;

  activeProject = null;
  descriptions.hidden = true;

  originals.forEach(o => {
    o.img.style.width = '100px';
    o.img.style.opacity = '1';
    o.img.style.zIndex = 1;
    o.img.style.left = `${o.x}px`;
    o.img.style.top  = `${o.y}px`;
  });

  animateCamera({
    toScale: storedScale,
    toX: storedOriginX,
    toY: storedOriginY,
    duration: 900
  });
});
