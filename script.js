const viewport = document.getElementById("viewport");
const canvas = document.getElementById("canvas");
const images = Array.from(document.querySelectorAll(".image"));
const descriptions = document.getElementById("project-descriptions");

/* ===============================
   CAMERA
================================ */

let originX = 0;
let originY = 0;
let scale = 1;

let targetOriginX = 0;
let targetOriginY = 0;
let targetScale = 1;

const PAN_EASE = 0.08;
const ZOOM_EASE = 0.06;

let activeProject = null;

let stored = { x: 0, y: 0, s: 1 };

function applyCamera() {
  canvas.style.transform =
    `translate(${originX}px, ${originY}px) scale(${scale})`;
}

function cameraLoop() {
  originX += (targetOriginX - originX) * PAN_EASE;
  originY += (targetOriginY - originY) * PAN_EASE;
  scale   += (targetScale - scale) * ZOOM_EASE;

  applyCamera();
  requestAnimationFrame(cameraLoop);
}
cameraLoop();

/* ===============================
   ZOOM
================================ */

viewport.addEventListener("wheel", e => {
  if (activeProject) return;
  e.preventDefault();

  const zoom = e.deltaY < 0 ? 1.12 : 0.88;

  const mx = e.clientX;
  const my = e.clientY;

  const wx = (mx - originX) / scale;
  const wy = (my - originY) / scale;

  targetScale *= zoom;
  targetScale = Math.min(Math.max(targetScale, 0.6), 1.8);

  targetOriginX = mx - wx * targetScale;
  targetOriginY = my - wy * targetScale;
});

/* ===============================
   PAN
================================ */

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

/* ===============================
   IMAGE SETUP
================================ */

const originals = [];

images.forEach(img => {
  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight;

  img.x = x;
  img.y = y;

  img.vx = (Math.random() - 0.5) * 0.25;
  img.vy = (Math.random() - 0.5) * 0.25;

  img.floating = true;

  img.style.transform = `translate(${x}px, ${y}px)`;

  originals.push({ img, x, y });
});

/* ===============================
   FLOATING — NO JITTER
================================ */

function floatImages() {
  if (!activeProject) {
    images.forEach(img => {
      if (!img.floating) return;

      img.x += img.vx;
      img.y += img.vy;

      const m = 60;
      if (img.x < m || img.x > innerWidth - m) img.vx *= -1;
      if (img.y < m || img.y > innerHeight - m) img.vy *= -1;

      img.style.transform =
        `translate(${Math.round(img.x)}px, ${Math.round(img.y)}px)`;
    });
  }
  requestAnimationFrame(floatImages);
}
floatImages();

/* ===============================
   GROUP ACTIVATION
================================ */

images.forEach(img => {
  img.addEventListener("click", e => {
    if (activeProject) return;
    e.stopPropagation();
    activateGroup(img.dataset.project);
  });
});

function activateGroup(project) {

  stored = {
    x: targetOriginX,
    y: targetOriginY,
    s: targetScale
  };

  activeProject = project;

  images.forEach(img => {
    img.style.opacity =
      img.dataset.project === project ? "1" : "0.15";
    img.floating = false;
  });

  /* zoom out */
  targetScale = 0.75;
  targetOriginX = window.innerWidth * 0.15;
  targetOriginY = window.innerHeight * 0.15;

  /* regroup */
  setTimeout(() => {

    const group = images.filter(i => i.dataset.project === project);

    const cx = (-originX + window.innerWidth * 0.35) / scale;
    const cy = (-originY + window.innerHeight * 0.5) / scale;

    group.forEach((img, i) => {
      const angle = i * 0.6;
      const r = 140;

      img.x = cx + Math.cos(angle) * r;
      img.y = cy + Math.sin(angle) * r;

      img.style.width = "320px";
      img.style.zIndex = 1000;

      img.style.transform =
        `translate(${img.x}px, ${img.y}px)`;
    });

    targetScale = 1;
    targetOriginX = 0;
    targetOriginY = 0;

    /* text timing — perceptual, not math */
    setTimeout(() => {
      descriptions.classList.add("visible");
      [...descriptions.children].forEach(d =>
        d.style.display =
          d.dataset.project === project ? "block" : "none"
      );
    }, 300);

  }, 550);
}

/* ===============================
   DRAG
================================ */

images.forEach(img => {
  img.addEventListener("pointerdown", e => {
    if (!activeProject) return;
    if (img.dataset.project !== activeProject) return;

    e.preventDefault();

    const sx = img.x;
    const sy = img.y;
    const mx = e.clientX;
    const my = e.clientY;

    function move(ev) {
      img.x = sx + (ev.clientX - mx) / scale;
      img.y = sy + (ev.clientY - my) / scale;

      img.style.transform =
        `translate(${img.x}px, ${img.y}px)`;
    }

    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
});

/* ===============================
   ESC RESET
================================ */

window.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;

  activeProject = null;
  descriptions.classList.remove("visible");

  images.forEach(img => {
    img.floating = true;
    img.style.opacity = "1";
    img.style.width = "100px";
    img.style.zIndex = 1;
  });

  originals.forEach(o => {
    o.img.x = o.x;
    o.img.y = o.y;
    o.img.style.transform =
      `translate(${o.x}px, ${o.y}px)`;
  });

  targetOriginX = stored.x;
  targetOriginY = stored.y;
  targetScale = stored.s;
});
