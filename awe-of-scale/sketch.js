// ============================================================
//  AWE OF SCALE — EEG Brain Response Visualizer
//  p5.js sketch — paste into editor.p5js.org
//  SPACE or click buttons to toggle MACRO <-> MICRO
// ============================================================

const BANDS = [
  { name:"Calm",    desc:"delta", col:[60,  120, 255], orbitR:68,  speed:0.0009, size:18, microPow:0.18, macroPow:0.22 },
  { name:"Relaxed", desc:"theta", col:[150, 60,  255], orbitR:118, speed:0.0020, size:15, microPow:0.58, macroPow:0.42 },
  { name:"Curious", desc:"alpha", col:[0,   210, 180], orbitR:175, speed:0.0035, size:13, microPow:0.44, macroPow:0.58 },
  { name:"Engaged", desc:"beta",  col:[255, 175, 0  ], orbitR:235, speed:0.0056, size:12, microPow:0.88, macroPow:0.72 },
  { name:"Awe",     desc:"gamma", col:[255, 55,  110], orbitR:300, speed:0.0085, size:11, microPow:0.76, macroPow:0.92 },
];

const TILT      = 0.38;
const TRAIL_LEN = 130;
const PER_ORB   = 18;

// macro
let angles = [];
let trails = [];

// micro
let microPhase    = 0; // 0=scatter 1=converge 2=merge
let microTimer    = 0;
let microOrbs     = [];
let microClusters = [];
const SCATTER_DUR  = 180;
const CONVERGE_DUR = 240;
const MERGE_DUR    = 220;

// shared
let mode      = "macro";
let nextMode  = "macro";
let tProgress = 1.0;
let eeg       = [];

// ── SETUP ─────────────────────────────────────────────────
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(RGB, 255, 255, 255, 1.0);
  eeg    = BANDS.map(b => b.macroPow);
  angles = BANDS.map((b, i) => (TWO_PI / BANDS.length) * i);
  trails = BANDS.map(() => []);
  buildMicro();
}

// ── DRAW ──────────────────────────────────────────────────
function draw() {
  background(3, 3, 12, 0.20);

  if (tProgress < 1) {
    tProgress = min(1, tProgress + 0.016);
    if (tProgress >= 1) mode = nextMode;
  }

  for (let i = 0; i < BANDS.length; i++) {
    let target = nextMode === "macro" ? BANDS[i].macroPow : BANDS[i].microPow;
    eeg[i] = lerp(eeg[i], target, 0.022);
  }

  drawStars();

  if (nextMode === "macro") {
    drawOrbits();
    drawMacroOrbs();
  } else {
    drawMicro();
  }

  drawEEGBars();
  drawLabels();
  drawButtons();
}

// ── STARS ─────────────────────────────────────────────────
function drawStars() {
  let a = nextMode === "macro" ? 0.42 : map(tProgress, 0.3, 1.0, 0.42, 0.0);
  if (a <= 0.01) return;
  randomSeed(77);
  for (let i = 0; i < 110; i++) {
    let fl = 0.4 + 0.4 * sin(frameCount * 0.027 + i * 1.9);
    fill(255, 255, 255, a * fl);
    ellipse(random(width), random(height * 0.85), random(0.6, 3.0));
  }
}

// ── MACRO ─────────────────────────────────────────────────
function drawOrbits() {
  let cx = width / 2, cy = height / 2 - 22;
  noFill();
  for (let i = 0; i < BANDS.length; i++) {
    let b = BANDS[i];
    stroke(b.col[0], b.col[1], b.col[2], 0.10);
    strokeWeight(0.8);
    push();
    translate(cx, cy);
    scale(1, TILT);
    ellipse(0, 0, b.orbitR * 2, b.orbitR * 2);
    pop();
  }
  noStroke();
}

function drawMacroOrbs() {
  let cx = width / 2, cy = height / 2 - 22;
  for (let i = 0; i < BANDS.length; i++) {
    let b   = BANDS[i];
    let c   = b.col;
    let pwr = eeg[i];
    let wobble = sin(frameCount * 0.0005 + i * 1.4) * 7;
    let r = b.orbitR + wobble;
    angles[i] += b.speed;
    let x = cx + cos(angles[i]) * r;
    let y = cy + sin(angles[i]) * r * TILT;

    trails[i].push({ x, y });
    if (trails[i].length > TRAIL_LEN) trails[i].shift();

    for (let t = 1; t < trails[i].length; t++) {
      let prog = t / trails[i].length;
      stroke(c[0], c[1], c[2], prog * prog * 0.32 * pwr);
      strokeWeight(prog * b.size * 0.55);
      line(trails[i][t-1].x, trails[i][t-1].y, trails[i][t].x, trails[i][t].y);
      noStroke();
    }
    noStroke();

    for (let g = 4; g > 0; g--) {
      fill(c[0], c[1], c[2], 0.06 * g * pwr);
      ellipse(x, y, b.size * (1 + g * 0.9) * 2);
    }
    fill(c[0], c[1], c[2], 0.92);
    ellipse(x, y, b.size * 2);
    fill(255, 255, 255, 0.65);
    ellipse(x, y, b.size * 0.7);

    let side = cos(angles[i]) > 0 ? 1 : -1;
    let lx = x + side * (b.size + 9);
    let ly = y - b.size - 5;
    noStroke();
    textFont("monospace");
    textAlign(side > 0 ? LEFT : RIGHT, BOTTOM);
    textSize(11);
    fill(c[0], c[1], c[2], 0.95);
    text(b.name, lx, ly);
    textSize(9);
    fill(c[0], c[1], c[2], 0.55);
    text(b.desc, lx, ly + 12);
  }
  noStroke();
}

// ── MICRO ─────────────────────────────────────────────────
function buildMicro() {
  microPhase = 0;
  microTimer = 0;
  microOrbs  = [];
  microClusters = [];

  let cx = width / 2, cy = height / 2 - 22;

  for (let i = 0; i < BANDS.length; i++) {
    let angle  = (TWO_PI / BANDS.length) * i - HALF_PI;
    let ox = cx + cos(angle) * 155;
    let oy = cy + sin(angle) * 105;
    microOrbs.push({ x: ox, y: oy, startX: ox, startY: oy });

    let cluster = [];
    for (let p = 0; p < PER_ORB; p++) {
      cluster.push({
        x:     ox + random(-190, 190),
        y:     oy + random(-150, 150),
        vx:    random(-0.9, 0.9),
        vy:    random(-0.9, 0.9),
        sz:    random(3.5, 9.0),
        pulse: random(TWO_PI),
        alpha: random(0.5, 0.92),
      });
    }
    microClusters.push(cluster);
  }
}

function drawMicro() {
  microTimer++;
  let cx = width / 2, cy = height / 2 - 22;

  // phase transitions
  if (microPhase === 0 && microTimer > SCATTER_DUR)  { microPhase = 1; microTimer = 0; }
  if (microPhase === 1 && microTimer > CONVERGE_DUR) { microPhase = 2; microTimer = 0; }
  if (microPhase === 2 && microTimer > MERGE_DUR)    { buildMicro(); return; }

  let convergeProg = microPhase === 0 ? 0
                   : microPhase === 1 ? microTimer / CONVERGE_DUR
                   : 1.0;
  let mergeProg    = microPhase === 2 ? microTimer / MERGE_DUR : 0;

  // move orbs toward center during merge
  for (let i = 0; i < BANDS.length; i++) {
    let orb = microOrbs[i];
    orb.x = lerp(orb.x, cx, mergeProg * 0.045);
    orb.y = lerp(orb.y, cy, mergeProg * 0.045);
  }

  // draw particles + orbs per band
  for (let i = 0; i < BANDS.length; i++) {
    let b       = BANDS[i];
    let c       = b.col;
    let pwr     = eeg[i];
    let orb     = microOrbs[i];
    let cluster = microClusters[i];

    // particles
    for (let p of cluster) {
      p.pulse += 0.045;

      let pull = convergeProg * 0.055 + mergeProg * 0.09;
      p.vx += (orb.x - p.x) * pull + random(-0.2, 0.2);
      p.vy += (orb.y - p.y) * pull + random(-0.2, 0.2);
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.x  += p.vx;
      p.y  += p.vy;

      let d = dist(p.x, p.y, orb.x, orb.y);
      let fa = convergeProg > 0 ? p.alpha * map(d, 0, 28, 0, 1, true) : p.alpha;
      let sz = p.sz * (1 + 0.22 * sin(p.pulse) * pwr);

      noStroke();
      for (let g = 3; g > 0; g--) {
        fill(c[0], c[1], c[2], fa * pwr * 0.07 * g);
        ellipse(p.x, p.y, sz * (1 + g * 1.2));
      }
      fill(c[0], c[1], c[2], fa * pwr);
      ellipse(p.x, p.y, sz);
      fill(255, 255, 255, fa * pwr * 0.5);
      ellipse(p.x, p.y, sz * 0.3);
    }

    // main orb
    let ov  = convergeProg;
    let osm = ov * b.size * 2 + mergeProg * 16;
    if (ov > 0.01) {
      noStroke();
      for (let g = 5; g > 0; g--) {
        fill(c[0], c[1], c[2], ov * 0.07 * g * pwr);
        ellipse(orb.x, orb.y, osm * (1 + g * 0.9));
      }
      fill(c[0], c[1], c[2], ov * 0.88);
      ellipse(orb.x, orb.y, osm);
      fill(255, 255, 255, ov * 0.6);
      ellipse(orb.x, orb.y, osm * 0.3);

      let la = ov * (1 - mergeProg);
      if (la > 0.05) {
        textFont("monospace");
        textAlign(CENTER, BOTTOM);
        textSize(11);
        fill(c[0], c[1], c[2], la * 0.95);
        text(b.name, orb.x, orb.y - b.size - 8);
        textSize(9);
        fill(c[0], c[1], c[2], la * 0.55);
        text(b.desc, orb.x, orb.y - b.size + 4);
      }
    }
  }

  // unified orb
  if (mergeProg > 0.35) {
    let ua  = map(mergeProg, 0.35, 1.0, 0, 1);
    let usz = map(mergeProg, 0.35, 1.0, 0, 110);
    noStroke();
    for (let i = 0; i < BANDS.length; i++) {
      let c = BANDS[i].col;
      fill(c[0], c[1], c[2], ua * 0.13);
      ellipse(cx, cy, usz * (1.6 + i * 0.28));
    }
    fill(255, 255, 255, ua * 0.88);
    ellipse(cx, cy, usz * 0.5);

    if (ua > 0.5) {
      textFont("monospace");
      textAlign(CENTER, BOTTOM);
      textSize(12);
      fill(255, 255, 255, ua * 0.8);
      text("unified response", cx, cy - 62);
    }
  }
}

// ── EEG BARS ──────────────────────────────────────────────
function drawEEGBars() {
  let bw    = 54, bh = 82, gap = 12;
  let total = BANDS.length * bw + (BANDS.length - 1) * gap;
  let sx    = width / 2 - total / 2;
  let baseY = height - 108;

  noStroke();
  fill(4, 4, 18, 0.62);
  rect(sx - 14, baseY - bh - 30, total + 28, bh + 56, 8);

  textFont("monospace");
  textAlign(CENTER, CENTER);

  for (let i = 0; i < BANDS.length; i++) {
    let b     = BANDS[i];
    let c     = b.col;
    let pwr   = eeg[i];
    let x     = sx + i * (bw + gap);
    let fillH = pwr * bh;
    let shim  = 0.78 + 0.22 * sin(frameCount * 0.055 + i * 1.2);

    fill(c[0], c[1], c[2], 0.10);
    rect(x, baseY - bh, bw, bh, 3);
    fill(c[0], c[1], c[2], 0.55 * shim);
    rect(x, baseY - fillH, bw, fillH, 3);
    fill(c[0], c[1], c[2], 0.88 * shim);
    rect(x, baseY - fillH, bw, 2.5, 1);

    textSize(12);
    fill(c[0], c[1], c[2], 0.92);
    text(nf(pwr * 100, 2, 0) + "%", x + bw/2, baseY - fillH - 12);
    textSize(10);
    fill(c[0], c[1], c[2], 0.88);
    text(b.name, x + bw/2, baseY + 12);
    textSize(8);
    fill(170, 170, 195, 0.55);
    text(b.desc, x + bw/2, baseY + 26);
  }
}

// ── LABELS ────────────────────────────────────────────────
function drawLabels() {
  textFont("monospace");
  noStroke();
  textAlign(CENTER, TOP);
  textSize(10);
  fill(180, 180, 220, 0.40);
  text("AWE OF SCALE", width/2, 16);

  let mLabel = nextMode === "macro" ? "MACRO" : "MICRO";
  let mc     = nextMode === "macro" ? [100, 185, 255] : [70, 255, 185];
  textSize(20);
  fill(mc[0], mc[1], mc[2], min(1, tProgress * 1.8));
  text(mLabel, width/2, 34);

  if (nextMode === "macro") {
    textAlign(LEFT, CENTER);
    textSize(9);
    fill(160, 180, 220, 0.38);
    text("inner orbit = slower", 22, height * 0.26);
    text("outer orbit = faster", 22, height * 0.26 + 16);
  }

  textAlign(RIGHT, CENTER);
  textSize(11);
  fill(120, 205, 165, 0.55);
  text(nextMode === "macro" ? "scale: 10^26 m" : "scale: 10^-6 m", width - 24, height * 0.29);
}

// ── BUTTONS ───────────────────────────────────────────────
function drawButtons() {
  drawBtn("MACRO", width/2 - 78, height - 46, nextMode === "macro");
  drawBtn("MICRO", width/2 + 78, height - 46, nextMode === "micro");
  textFont("monospace");
  textAlign(CENTER, BOTTOM);
  textSize(9);
  fill(150, 150, 170, 0.40);
  text("SPACE to toggle", width/2, height - 10);
}

function drawBtn(label, cx, cy, active) {
  rectMode(CENTER);
  let co = active ? 255 : 100;
  let ao = active ? 0.88 : 0.38;
  noFill();
  stroke(co, co, co + 20, ao);
  strokeWeight(active ? 1.4 : 0.8);
  rect(cx, cy, 112, 28, 4);
  noStroke();
  fill(co, co, co + 20, ao + 0.05);
  textAlign(CENTER, CENTER);
  textFont("monospace");
  textSize(11);
  text(label, cx, cy);
  rectMode(CORNER);
}

// ── INTERACTION ───────────────────────────────────────────
function keyPressed() {
  if (key === " ") toggle();
}

function mousePressed() {
  if (abs(mouseY - (height - 46)) < 18) {
    if (abs(mouseX - (width/2 - 78)) < 60) switchTo("macro");
    if (abs(mouseX - (width/2 + 78)) < 60) switchTo("micro");
  }
}

function toggle() {
  switchTo(nextMode === "macro" ? "micro" : "macro");
}

function switchTo(m) {
  if (nextMode === m) return;
  nextMode  = m;
  tProgress = 0;
  if (m === "micro") {
    buildMicro();
  } else {
    angles = BANDS.map((b, i) => (TWO_PI / BANDS.length) * i);
    trails = BANDS.map(() => []);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildMicro();
}