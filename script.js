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

let storedScale = 1;
let storedOriginX = 0;
let storedOriginY = 0;

/* =====================================================
   UTILITIES
===================================================== */

function applyTransform() {
  canvas.style.transform =
    `translate(${originX}px, ${originY}px) scale(${scale})`;
}

/* =====================================================
   CAMERA LOOP (single authority)
===================================================== */

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

  img._vx = (Math.random() - 0.5) * 0.12;
  img._vy = (Math.random() - 0.5) * 0.12;

  img._floating = true;

  img.style.transform = `translate(${x}px, ${y}px)`;

  originals.push({ img, x, y });
});

/* =====================================================
   FLOATING MOTION (vector-based, smooth)
===================================================== */

function floatImages() {

  if (!activeProject) {
    images.forEach(img => {

      if (!img._floating) return;

      img._tx += img._vx;
      img._ty += img._vy;

      const margin = 80;
      const maxX = window.innerWidth - margin;
      const maxY = window.innerHeight - margin;

      if (img._tx < margin || img._tx > maxX) img._vx *= -1;
      if (img._ty < margin || img._ty > maxY) img._vy *= -1;

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

function activateGroup(project) {

  storedScale = targetScale;
  storedOriginX = targetOriginX;
  storedOriginY = targetOriginY;

  activeProject = project;

  // fade background
  images.forEach(img => {
    img.style.opacity =
      img.dataset.project === project ? '1' : '0.15';

    img._floating = img.dataset.project !== project;
  });

  /* --- ACT 1: zoom out --- */
  targetScale = 0.7;
  targetOriginX = window.innerWidth * 0.15;
  targetOriginY = window.innerHeight * 0.15;

  /* --- ACT 2: regroup --- */
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

    /* --- ACT 3: zoom in --- */
    targetScale = 1;
    targetOriginX = 0;
    targetOriginY = 0;

    /* --- text appears slightly after zoom-in begins --- */
    setTimeout(() => {

      descriptions.classList.add('visible');

      Array.from(descriptions.children).forEach(desc => {
        desc.style.display =
          desc.dataset.project === project ? 'block' : 'none';
      });

    }, 260);

  }, 600);
}

/* =====================================================
   DRAGGING (group only)
===================================================== */

images.forEach(img => {
  img.addEventListener('pointerdown', e => {

    if (!activeProject) return;
    if (img.dataset.project !== activeProject) return;
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    img.setPointerCapture(e.pointerId);

    const startX = img._x;
    const startY = img._y;
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    function move(ev) {
      const dx = (ev.clientX - mouseX) / scale;
      const dy = (ev.clientY - mouseY) / scale;

      img._x = startX + dx;
      img._y = startY + dy;

      img._tx = img._x;
      img._ty = img._y;

      img.style.transform =
        `translate(${img._x}px, ${img._y}px)`;
    }

    function up(ev) {
      img.releasePointerCapture(ev.pointerId);
      img.removeEventListener('pointermove', move);
      img.removeEventListener('pointerup', up);
    }

    img.addEventListener('pointermove', move);
    img.addEventListener('pointerup', up);
  });
});

/* =====================================================
   ESC RESTORE
===================================================== */

window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;

  activeProject = null;
  descriptions.classList.remove('visible');

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

  targetScale = storedScale;
  targetOriginX = storedOriginX;
  targetOriginY = storedOriginY;
});
