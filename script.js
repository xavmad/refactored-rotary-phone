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

const PAN_EASE = 0.15;
const ZOOM_EASE = 0.04;

let isPanning = false;
let startX = 0;
let startY = 0;

let storedScale = 1;
let storedOriginX = 0;
let storedOriginY = 0;

let zoomVelocity = 0;
let zoomAnchorX = 0;
let zoomAnchorY = 0;
let isZoomingBlocked = false;

let cinematicActive = false;


function applyTransform() {
  canvas.style.transform =
    `translate(${originX}px, ${originY}px) scale(${scale})`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/* --------------------
   Animate Camera
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
      // lock camera at final values
      targetScale = scale;
      targetOriginX = originX;
      targetOriginY = originY;

      cinematicActive = false;
    }
  }

  requestAnimationFrame(frame);
}



function fadeNonGroup(project, opacity) {
  images.forEach(img => {
    if (img.dataset.project !== project) {
      img.style.transition = 'opacity 400ms ease';
      img.style.opacity = opacity;
    } else {
      img.style.opacity = '1';
    }
  });
}



/* --------------------
   Camera loop (ALWAYS RUNS)
-------------------- */

function cameraLoop() {

  if (cinematicActive) {
    applyTransform();
    requestAnimationFrame(cameraLoop);
    return;
  }

  // --- smooth zoom using velocity ---
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

  const scaleDelta = Math.abs(targetScale - scale);
  const panEase = scaleDelta > 0.0003 ? 0.03 : PAN_EASE;

  originX = lerp(originX, targetOriginX, panEase);
  originY = lerp(originY, targetOriginY, panEase);
  scale   = lerp(scale, targetScale, ZOOM_EASE);

  applyTransform();
  requestAnimationFrame(cameraLoop);
}

cameraLoop();



/* --------------------
   Zoom (mouse wheel)
-------------------- */
viewport.addEventListener('wheel', e => {
  if (activeProject) return;
  if (isZoomingBlocked) return; // 🔑 HARD BLOCK
  e.preventDefault();

  // accumulate zoom intent (very fine resolution)
  zoomVelocity += -e.deltaY * 0.00012;

  // store cursor anchor (screen space)
  zoomAnchorX = e.clientX;
  zoomAnchorY = e.clientY;

});



/* --------------------
   Pan
-------------------- */
viewport.addEventListener('mousedown', e => {
  if (activeProject) return;
  if (e.target.classList.contains('image')) return;

  isZoomingBlocked = true; // 🔒 block wheel inertia
  zoomVelocity = 0;

  isPanning = true;
  startX = e.clientX - originX;
  startY = e.clientY - originY;
});


window.addEventListener('mousemove', e => {
  if (!isPanning) return;

  targetOriginX = e.clientX - startX;
  targetOriginY = e.clientY - startY;
});

window.addEventListener('mouseup', () => {
  isPanning = false;

  // allow zoom again after pan
  isZoomingBlocked = false;
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


/* ---- Camera init ---- */
originX = window.innerWidth / 2;
originY = window.innerHeight / 2;

targetOriginX = originX;
targetOriginY = originY;

scale = 1;
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
   Image click → activate group
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
  if (cinematicActive) return;

  cinematicActive = true;
  zoomVelocity = 0;
  isZoomingBlocked = true;

  storedScale = scale;
  storedOriginX = originX;
  storedOriginY = originY;

  activeProject = project;

  /* --------------------
     ACT 1 — reveal context
  -------------------- */
  images.forEach(img => {
    img.style.transition = 'opacity 500ms ease';
    img.style.opacity =
      img.dataset.project === project ? '1' : '0.15';
  });

  animateCamera({
    toScale: 0.7,
    toX: window.innerWidth * 0.15,
    toY: window.innerHeight * 0.15,
    duration: 700
  });

  /* --------------------
     ACT 2 + 3 — focus
  -------------------- */
  setTimeout(() => {

    const groupImages = images.filter(
      img => img.dataset.project === project
    );

    const leftZoneX = window.innerWidth * 0.18;
    const topZone = window.innerHeight * 0.2;
    const bottomZone = window.innerHeight * 0.8;

    groupImages.forEach(img => {
      const x = leftZoneX + (Math.random() - 0.5) * 120;
      const y = topZone + Math.random() * (bottomZone - topZone);

      img.dataset.x = x;
      img.dataset.y = y;

      img.style.width = `320px`;
      img.style.opacity = '1';
      img.style.zIndex = 1000;

      img.style.transform =
        `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    });

     animateCamera({
  toScale: 1,
  toX: 0,
  toY: 0,
  duration: 900
  });

  // show description AFTER zoom-in completes
  setTimeout(() => {
  descriptions.hidden = false;
  cinematicActive = false;
  }, 900);

}, 750);


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

  animateCamera({
  toScale: storedScale,
  toX: storedOriginX,
  toY: storedOriginY,
  duration: 900
});


  activeProject = null;

  images.forEach(img => {
    img.style.pointerEvents = 'auto';
    img.classList.remove('active');

  isZoomingBlocked = false;

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
