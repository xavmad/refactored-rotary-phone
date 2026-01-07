const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
const images = Array.from(document.querySelectorAll('.image'));
const descriptions = document.getElementById('project-descriptions');

/* --------------------
   Camera (Pan & Zoom)
-------------------- */
let scale = 1;
let originX = 0;
let originY = 0;

let targetScale = 1;
let targetOriginX = 0;
let targetOriginY = 0;

const MIN_SCALE = 0.6;
const MAX_SCALE = 1.8;
const ZOOM_EASE = 0.04;

let isPanning = false;
let startX = 0;
let startY = 0;

let storedScale = 1;
let storedOriginX = 0;
let storedOriginY = 0;


let zoomStartTime = 0;
let zoomDuration = 800; // milliseconds (slow + cinematic)
let zoomFromScale = 1;
let zoomFromX = 0;
let zoomFromY = 0;
let zoomToScale = 1;
let zoomToX = 0;
let zoomToY = 0;
let zoomAnimating = false;

function applyTransform() {
  canvas.style.transform =
    `translate(${originX}px, ${originY}px) scale(${scale})`;
}

/* --------------------
   Zoom (mouse wheel)
-------------------- */
viewport.addEventListener('wheel', e => {
  if (activeProject) return;
  if (zoomAnimating) return;
  e.preventDefault();

  const zoomFactor = e.deltaY < 0 ? 1.25 : 0.87;

  const mouseX = e.clientX;
  const mouseY = e.clientY;

  const worldX = (mouseX - originX) / scale;
  const worldY = (mouseY - originY) / scale;

  zoomFromScale = scale;
  zoomFromX = originX;
  zoomFromY = originY;

  zoomToScale = Math.min(
    Math.max(scale * zoomFactor, MIN_SCALE),
    MAX_SCALE
  );

  zoomToX = mouseX - worldX * zoomToScale;
  zoomToY = mouseY - worldY * zoomToScale;

  zoomStartTime = performance.now();
  zoomAnimating = true;
});

function startCameraTransition(toScale, toX, toY) {
  zoomFromScale = scale;
  zoomFromX = originX;
  zoomFromY = originY;

  zoomToScale = toScale;
  zoomToX = toX;
  zoomToY = toY;

  zoomStartTime = performance.now();
  zoomAnimating = true;
}


/* --------------------
   Smooth camera loop
-------------------- */
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothCamera() {
  if (zoomAnimating) {
    const now = performance.now();
    const t = Math.min((now - zoomStartTime) / zoomDuration, 1);
    const e = easeInOutCubic(t);

    scale   = zoomFromScale + (zoomToScale - zoomFromScale) * e;
    originX = zoomFromX     + (zoomToX     - zoomFromX)     * e;
    originY = zoomFromY     + (zoomToY     - zoomFromY)     * e;

    if (t === 1) {
      zoomAnimating = false;
    }
  }

  applyTransform();
  requestAnimationFrame(smoothCamera);
}
smoothCamera();


/* --------------------
   Pan
-------------------- */
viewport.addEventListener('mousedown', e => {
  if (activeProject) return;
  if (e.target.classList.contains('image')) return;

  isPanning = true;
  startX = e.clientX - targetOriginX;
  startY = e.clientY - targetOriginY;
});

window.addEventListener('mousemove', e => {
  if (!isPanning) return;

  targetOriginX = e.clientX - startX;
  targetOriginY = e.clientY - startY;
});

window.addEventListener('mouseup', () => {
  isPanning = false;
});


/* --------------------
   Initial placement
-------------------- */
const originals = [];

function randomizePositions() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  images.forEach(img => {
    const x = Math.random() * (w * 0.7) + w * 0.15;
    const y = Math.random() * (h * 0.7) + h * 0.15;

    img.dataset.x = x;
    img.dataset.y = y;
    img.dataset.locked = "false";

    img.style.transform =
      `translate(-50%, -50%) translate(${x}px, ${y}px)`;

    originals.push({ img, x, y });

    img._vx = (Math.random() - 0.5) * 0.15;
    img._vy = (Math.random() - 0.5) * 0.15;
  });
}
randomizePositions();

/* ---- Camera init (CRITICAL) ---- */
originX = 0;
originY = 0;
targetOriginX = 0;
targetOriginY = 0;
targetScale = 1;
applyTransform();


/* --------------------
   Floating motion
-------------------- */
let activeProject = null;

function floatImages() {
  if (!activeProject) {
    images.forEach(img => {
      if (img.dataset.locked === "true") return;

      let x = parseFloat(img.dataset.x);
      let y = parseFloat(img.dataset.y);

      x += img._vx;
      y += img._vy;

      const margin = 80;
      if (x < margin || x > window.innerWidth - margin) img._vx *= -1;
      if (y < margin || y > window.innerHeight - margin) img._vy *= -1;

      img.dataset.x = x;
      img.dataset.y = y;

      img.style.transform =
        `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    });
  }
  requestAnimationFrame(floatImages);
}
floatImages();

/* --------------------
   Group logic
-------------------- */
images.forEach(img => {
  img.addEventListener('click', e => {
    if (activeProject) return;
    e.stopPropagation();
    activateGroup(img.dataset.project);
  });
});

function activateGroup(project) {
  storedScale = scale;
  storedOriginX = originX;
  storedOriginY = originY;

storedScale = scale;
storedOriginX = originX;
storedOriginY = originY;

// Smoothly move camera into group view
startCameraTransition(1, 0, 0);


  activeProject = project;

  images.forEach(img => {
    const isActive = img.dataset.project === project;
    img.style.pointerEvents = isActive ? 'auto' : 'none';
    img.classList.toggle('active', isActive);
  });

  const groupImages = images.filter(
    img => img.dataset.project === project
  );

  const leftZoneX = window.innerWidth * 0.18;
  const topZone = window.innerHeight * 0.2;
  const bottomZone = window.innerHeight * 0.8;
  const imageSize = 320;

  groupImages.forEach(img => {
    const x = leftZoneX + (Math.random() - 0.5) * 120;
    const y = topZone + Math.random() * (bottomZone - topZone);

    img.dataset.x = x;
    img.dataset.y = y;

    img.style.width = `${imageSize}px`;
    img.style.opacity = '1';
    img.style.zIndex = 1000;

    img.style.transform =
      `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  });

  images.forEach(img => {
    if (img.dataset.project !== project) {
      img.style.opacity = '0.25';
      img.style.zIndex = '1';
    }
  });

  descriptions.hidden = false;
  descriptions.style.pointerEvents = 'auto';
  descriptions.style.position = 'fixed';
  descriptions.style.right = '4%';
  descriptions.style.top = '50%';
  descriptions.style.transform = 'translateY(-50%)';
  descriptions.style.width = '32vw';
  descriptions.style.maxHeight = '60vh';
  descriptions.style.overflowY = 'auto';
  descriptions.style.zIndex = '2000';

  Array.from(descriptions.children).forEach(desc => {
    desc.style.display =
      desc.dataset.project === project ? 'block' : 'none';
  });
}

/* --------------------
   ESC to exit group
-------------------- */
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') restoreAll();
});

/* --------------------
   Restore
-------------------- */
function restoreAll() {
  if (!activeProject) return;

 startCameraTransition(
  storedScale,
  storedOriginX,
  storedOriginY
);

  activeProject = null;

  images.forEach(img => {
    img.style.pointerEvents = 'auto';
    img.classList.remove('active');
  });

  originals.forEach(o => {
    o.img.dataset.locked = "false";
    o.img.dataset.x = o.x;
    o.img.dataset.y = o.y;
    o.img.style.width = '100px';
    o.img.style.opacity = '1';
    o.img.style.zIndex = '1';

    o.img.style.transform =
      `translate(-50%, -50%) translate(${o.x}px, ${o.y}px)`;
  });

  descriptions.hidden = true;
}

/* --------------------
   Dragging images
-------------------- */
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
    const startX = parseFloat(img.dataset.x);
    const startY = parseFloat(img.dataset.y);

    function onMove(ev) {
      const dx = (ev.clientX - startMouseX) / scale;
      const dy = (ev.clientY - startMouseY) / scale;

      const x = startX + dx;
      const y = startY + dy;

      img.dataset.x = x;
      img.dataset.y = y;

      img.style.transform =
        `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    }

    function onUp(ev) {
      img.dataset.locked = "true";
      img.releasePointerCapture(ev.pointerId);
      img.removeEventListener('pointermove', onMove);
      img.removeEventListener('pointerup', onUp);
    }

    img.addEventListener('pointermove', onMove);
    img.addEventListener('pointerup', onUp);
  });
});

/* --------------------
   Draggable text box
-------------------- */
let descDragging = false;
let descStartX = 0;
let descStartY = 0;
let descOriginX = 0;
let descOriginY = 0;

descriptions.addEventListener('mousedown', e => {
  if (e.target.tagName === 'P') return;

  descDragging = true;
  const rect = descriptions.getBoundingClientRect();
  descOriginX = rect.left;
  descOriginY = rect.top;
  descStartX = e.clientX;
  descStartY = e.clientY;
});

window.addEventListener('mousemove', e => {
  if (!descDragging) return;

  const dx = e.clientX - descStartX;
  const dy = e.clientY - descStartY;

  descriptions.style.left = `${descOriginX + dx}px`;
  descriptions.style.top = `${descOriginY + dy}px`;
  descriptions.style.right = 'auto';
  descriptions.style.transform = 'none';
});

window.addEventListener('mouseup', () => {
  descDragging = false;
});
