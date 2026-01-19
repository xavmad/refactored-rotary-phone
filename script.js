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

let storedScale = 1;
let storedOriginX = 0;
let storedOriginY = 0;

/* ======================
   UTILS
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
  if (Math.abs(targetScale - scale) < 0.0005) scale = targetScale;

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
   INITIAL IMAGE LAYOUT
====================== */

const originals = [];

images.forEach(img => {
  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight;

  img.dataset.x = x;
  img.dataset.y = y;

  img.style.left = `${x}px`;
  img.style.top  = `${y}px`;

  img._vx = (Math.random() - 0.5) * 0.08;
  img._vy = (Math.random() - 0.5) * 0.08;

  originals.push({ img, x, y });
});

/* ======================
   FLOATING (SMOOTH)
====================== */

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

/* ======================
   IMAGE CLICK
====================== */

images.forEach(img => {
  img.addEventListener('click', e => {
    if (activeProject) return;
    e.stopPropagation();
    activateGroup(img.dataset.project);
  });
});

/* ======================
   GROUP LOGIC
====================== */

function activateGroup(project) {

  storedScale = targetScale;
  storedOriginX = targetOriginX;
  storedOriginY = targetOriginY;

  activeProject = project;

  images.forEach(img => {
    img.style.opacity =
      img.dataset.project === project ? '1' : '0.15';
  });

  // show correct description
  descriptions.classList.add('visible');

  Array.from(descriptions.children).forEach(desc => {
    desc.style.display =
      desc.dataset.project === project ? 'block' : 'none';
  });

  targetScale = 0.7;
  targetOriginX = window.innerWidth * 0.15;
  targetOriginY = window.innerHeight * 0.15;

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

    targetScale = 1;
    targetOriginX = 0;
    targetOriginY = 0;

  }, 600);
}

/* ======================
   ESC — RESTORE
====================== */

window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;

  activeProject = null;

  descriptions.classList.remove('visible');

  originals.forEach(o => {
    o.img.style.width = '100px';
    o.img.style.opacity = '1';
    o.img.style.zIndex = 1;
    o.img.style.left = `${o.x}px`;
    o.img.style.top  = `${o.y}px`;
  });

  targetScale = storedScale;
  targetOriginX = storedOriginX;
  targetOriginY = storedOriginY;
});
