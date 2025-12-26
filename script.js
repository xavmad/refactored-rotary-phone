const viewport = document.getElementById('viewport');
const canvas = document.getElementById('canvas');
const images = Array.from(document.querySelectorAll('.image'));
const descriptions = document.getElementById('project-descriptions');
let isDragging = false;


/* --------------------
   Pan & zoom
-------------------- */
let scale = 1;
let originX = 0;
let originY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;

function applyTransform() {
  canvas.style.transform =
    `translate(${originX}px, ${originY}px) scale(${scale})`;
}

viewport.addEventListener('wheel', e => {
  e.preventDefault();
  const prev = scale;
  scale *= e.deltaY < 0 ? 1.1 : 0.9;
  scale = Math.min(Math.max(scale, 0.3), 3);

  originX = e.clientX - (e.clientX - originX) * (scale / prev);
  originY = e.clientY - (e.clientY - originY) * (scale / prev);
  applyTransform();
});

viewport.addEventListener('mousedown', e => {
  if (e.target.classList.contains('image')) return;
  isPanning = true;
  startX = e.clientX - originX;
  startY = e.clientY - originY;
});

window.addEventListener('mousemove', e => {
  if (!isPanning) return;
  originX = e.clientX - startX;
  originY = e.clientY - startY;
  applyTransform();
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

    img.style.transform =
      `translate(-50%, -50%) translate(${x}px, ${y}px)`;

    originals.push({ img, x, y });

    img._vx = (Math.random() - 0.5) * 0.15;
    img._vy = (Math.random() - 0.5) * 0.15;
  });
}
randomizePositions();

/* --------------------
   Floating motion
-------------------- */
let activeProject = null;

function floatImages() {
  if (!activeProject && !isDragging) {
    images.forEach(img => {
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
    e.stopPropagation();
    activateGroup(img.dataset.project);
  });
});

document.body.addEventListener('click', restoreAll);

function activateGroup(project) {
  activeProject = project;

  const groupImages = images.filter(
    img => img.dataset.project === project
  );

  const baseX = window.innerWidth * 0.18;
  const baseY = window.innerHeight * 0.5;
  const offset = 60;

  groupImages.forEach((img, i) => {
    img.style.width = '500px';
    img.style.opacity = '1';
    img.style.zIndex = 1000 + i;

    const x = baseX;
    const y = baseY + i * offset;

    img.dataset.x = x;
    img.dataset.y = y;

const x = baseX + i * offset;
const y = baseY + i * offset;

img.dataset.x = x;
img.dataset.y = y;

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
  descriptions.style.position = 'fixed';
  descriptions.style.right = '4%';
  descriptions.style.top = '50%';
  descriptions.style.transform = 'translateY(-50%)';
  descriptions.style.width = '32vw';
  descriptions.style.maxHeight = '60vh';
  descriptions.style.overflowY = 'auto';
  descriptions.style.color = 'white';
  descriptions.style.zIndex = '2000';

  Array.from(descriptions.children).forEach(desc => {
    desc.style.display =
      desc.dataset.project === project ? 'block' : 'none';
  });
}

function restoreAll() {
  if (!activeProject) return;
  activeProject = null;

  originals.forEach(o => {
    o.img.style.width = '100px';
    o.img.style.opacity = '1';
    o.img.style.zIndex = '1';
    o.img.dataset.x = o.x;
    o.img.dataset.y = o.y;
    o.img.style.transform =
      `translate(-50%, -50%) translate(${o.x}px, ${o.y}px)`;
  });

  descriptions.hidden = true;
}

/* --------------------
   DRAGGING (STABLE)
-------------------- */

images.forEach(img => {
  img.addEventListener('pointerdown', e => {
    if (!activeProject) return;
    if (img.dataset.project !== activeProject) return;
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
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
      img.releasePointerCapture(ev.pointerId);
      img.removeEventListener('pointermove', onMove);
      img.removeEventListener('pointerup', onUp);
      isDragging = false;
    }

    img.addEventListener('pointermove', onMove);
    img.addEventListener('pointerup', onUp);
  });
});

