let socket;
let socketEnabled = false;

let flowers = [];
let activityLog = [];
let sessionStartTime;

let latestState = {
  calm: 0.55,
  arousal: 0.35,
  positiveValence: 0.65,
  negativeValence: 0.15,
  focus: 0.72,
  timestamp: Date.now()
};

let calmSlider, arousalSlider, positiveSlider, negativeSlider, focusSlider;
let applyButton, clearButton, toggleSocketButton;

const horizonY = 250;
const TEST_DURATION_MS = 15 * 60 * 1000;

const flowerLabels = {
  lavender: "Calm",
  gerbera: "High Energy",
  rose: "Positive",
  tulip: "Negative",
  lily: "Focus"
};

function setup() {
  createCanvas(1200, 760);
  textFont("sans-serif");
  sessionStartTime = Date.now();
  setupControls();
}

function draw() {
  drawSkyGradient();
  drawSunGlow();
  drawDistantHills();
  drawMidgroundField();
  drawForegroundSoil();
  drawGarden();
  drawFlowerLabels();
  drawAtmosphere();
  drawTimeIndicator();
  drawHUD();
  drawControlLabels();
}

function setupControls() {
  const left = 20;
  const top = height + 20;
  const w = 220;
  const step = 28;

  calmSlider = createSlider(0, 1, latestState.calm, 0.01);
  calmSlider.position(left, top);
  calmSlider.size(w);

  arousalSlider = createSlider(0, 1, latestState.arousal, 0.01);
  arousalSlider.position(left, top + step);
  arousalSlider.size(w);

  positiveSlider = createSlider(0, 1, latestState.positiveValence, 0.01);
  positiveSlider.position(left, top + step * 2);
  positiveSlider.size(w);

  negativeSlider = createSlider(0, 1, latestState.negativeValence, 0.01);
  negativeSlider.position(left, top + step * 3);
  negativeSlider.size(w);

  focusSlider = createSlider(0, 1, latestState.focus, 0.01);
  focusSlider.position(left, top + step * 4);
  focusSlider.size(w);

  applyButton = createButton("Plant from sliders");
  applyButton.position(left + 260, top);
  applyButton.mousePressed(() => {
    const manualState = getSliderState();
    latestState = manualState;
    updateGardenFromState(manualState);
  });

  clearButton = createButton("Clear garden");
  clearButton.position(left + 260, top + step * 2);
  clearButton.mousePressed(() => {
    flowers = [];
    activityLog = [];
  });

  toggleSocketButton = createButton("Socket: OFF");
  toggleSocketButton.position(left + 260, top + step * 4);
  toggleSocketButton.mousePressed(() => {
    socketEnabled = !socketEnabled;

    if (socketEnabled) {
      connectSocket();
      toggleSocketButton.html("Socket: ON");
    } else {
      if (socket) socket.close();
      socket = null;
      toggleSocketButton.html("Socket: OFF");
    }
  });
}

function connectSocket() {
  socket = new WebSocket("ws://localhost:8765");

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    latestState = data;

    calmSlider.value(data.calm);
    arousalSlider.value(data.arousal);
    positiveSlider.value(data.positiveValence);
    negativeSlider.value(data.negativeValence);
    focusSlider.value(data.focus);

    updateGardenFromState(data);
  };

  socket.onclose = () => {
    socketEnabled = false;
    toggleSocketButton.html("Socket: OFF");
  };

  socket.onerror = () => {
    socketEnabled = false;
    toggleSocketButton.html("Socket: OFF");
  };
}

function getSliderState() {
  return {
    calm: calmSlider.value(),
    arousal: arousalSlider.value(),
    positiveValence: positiveSlider.value(),
    negativeValence: negativeSlider.value(),
    focus: focusSlider.value(),
    timestamp: Date.now()
  };
}

function updateGardenFromState(state) {
  const ranked = [
    { type: "lavender", score: state.calm },
    { type: "gerbera", score: state.arousal },
    { type: "rose", score: state.positiveValence },
    { type: "tulip", score: state.negativeValence },
    { type: "lily", score: state.focus }
  ]
    .filter(s => s.score > 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  for (const entry of ranked) {
    const depth = random(0.15, 1.0);
    const x = random(90, width - 90);
    const y = lerp(horizonY + 35, height - 110, depth) + random(-18, 18);

    const groupCount = 4;

    plantFlowerGroup(entry.type, x, y, depth, entry.score, state, groupCount);

    activityLog.unshift({
      time: Date.now(),
      type: entry.type,
      count: groupCount
    });

    if (activityLog.length > 8) activityLog.pop();
  }

  flowers.sort((a, b) => a.depth - b.depth);
}

function plantFlowerGroup(type, centerX, centerY, depth, score, state, count) {
  const clusterRadius = 28;

  let nearbyGroup = flowers.filter(f => {
    const distSq = (f.x - centerX) ** 2 + (f.y - centerY) ** 2;
    return f.type === type && distSq < 120 * 120;
  });

  if (nearbyGroup.length > 0) {
    for (let i = 0; i < min(count, nearbyGroup.length); i++) {
      nearbyGroup[i].grow(score, state);
    }

    const toCreate = max(0, count - nearbyGroup.length);
    for (let i = 0; i < toCreate; i++) {
      const angle = random(TWO_PI);
      const r = random(8, clusterRadius);
      const x = centerX + cos(angle) * r;
      const y = centerY + sin(angle) * r * 0.45;
      flowers.push(new Flower(type, x, y, depth + random(-0.03, 0.03), score, state));
    }
  } else {
    for (let i = 0; i < count; i++) {
      const angle = random(TWO_PI);
      const r = random(i === 0 ? 0 : 8, clusterRadius);
      const x = centerX + cos(angle) * r;
      const y = centerY + sin(angle) * r * 0.45;
      flowers.push(new Flower(type, x, y, depth + random(-0.03, 0.03), score, state));
    }
  }
}

function findNearbyFlower(type, x, y, radius) {
  for (const f of flowers) {
    const distSq = (f.x - x) ** 2 + (f.y - y) ** 2;
    if (f.type === type && distSq < radius * radius) {
      return f;
    }
  }
  return null;
}

function drawSkyGradient() {
  const warm = constrain((latestState.positiveValence - latestState.negativeValence + 1) / 2, 0, 1);
  const topC = color(
    lerp(170, 255, warm),
    lerp(200, 225, warm),
    lerp(245, 180, warm)
  );
  const bottomC = color(
    lerp(235, 255, warm),
    lerp(240, 215, latestState.negativeValence),
    lerp(245, 190, latestState.negativeValence)
  );

  for (let y = 0; y < height; y++) {
    const t = y / height;
    stroke(lerpColor(topC, bottomC, t));
    line(0, y, width, y);
  }
}

function drawSunGlow() {
  noStroke();
  const glowX = width * 0.78;
  const glowY = 120;
  const baseSize = 90 + latestState.positiveValence * 60;

  for (let i = 5; i >= 1; i--) {
    fill(255, 250, 220, 18);
    circle(glowX, glowY, baseSize * i);
  }

  fill(255, 250, 235, 150);
  circle(glowX, glowY, baseSize);
}

function drawDistantHills() {
  noStroke();

  fill(130, 165, 145, 130);
  beginShape();
  vertex(0, horizonY + 10);
  bezierVertex(width * 0.2, horizonY - 30, width * 0.35, horizonY + 25, width * 0.55, horizonY);
  bezierVertex(width * 0.75, horizonY - 22, width * 0.88, horizonY + 35, width, horizonY - 5);
  vertex(width, height);
  vertex(0, height);
  endShape(CLOSE);

  fill(105, 145, 105, 140);
  beginShape();
  vertex(0, horizonY + 55);
  bezierVertex(width * 0.18, horizonY + 5, width * 0.38, horizonY + 90, width * 0.58, horizonY + 40);
  bezierVertex(width * 0.8, horizonY + 10, width * 0.9, horizonY + 88, width, horizonY + 40);
  vertex(width, height);
  vertex(0, height);
  endShape(CLOSE);
}

function drawMidgroundField() {
  noStroke();
  fill(110, 160, 95, 110);
  rect(0, horizonY + 120, width, height - (horizonY + 120));

  for (let i = 0; i < 200; i++) {
    const x = (i * 47) % width;
    const y = random(horizonY + 110, height - 80);
    const h = random(8, 22);
    stroke(90, 140, 80, 70);
    line(x, y, x + random(-3, 3), y - h);
  }
}

function drawForegroundSoil() {
  noStroke();
  fill(90, 70, 50, 60);
  ellipse(width / 2, height - 20, width * 1.1, 180);

  fill(85, 120, 70, 120);
  ellipse(width / 2, height - 40, width * 1.08, 140);
}

function drawGarden() {
  for (const f of flowers) {
    f.displayShadow();
  }

  for (const f of flowers) {
    f.display();
  }
}

function drawFlowerLabels() {
  textAlign(CENTER);
  textSize(12);
  noStroke();

  let visited = new Set();

  for (let i = 0; i < flowers.length; i++) {
    if (visited.has(i)) continue;

    let cluster = [flowers[i]];
    visited.add(i);

    for (let j = i + 1; j < flowers.length; j++) {
      if (visited.has(j)) continue;

      let f1 = flowers[i];
      let f2 = flowers[j];
      let distSq = (f1.x - f2.x) ** 2 + (f1.y - f2.y) ** 2;

      if (f1.type === f2.type && distSq < 100 * 100) {
        cluster.push(f2);
        visited.add(j);
      }
    }

    let cx = 0;
    let cy = 0;
    let depth = 0;
    let minY = Infinity;

    for (let f of cluster) {
      cx += f.x;
      cy += f.y;
      depth += f.depth;
      minY = min(minY, f.y - f.stem);
    }

    cx /= cluster.length;
    cy /= cluster.length;
    depth /= cluster.length;

    let label = flowerLabels[cluster[0].type] || cluster[0].type;

    fill(30, 40, 40, lerp(180, 80, depth));
    text(label, cx, minY - 14);
  }
}

function drawAtmosphere() {
  noStroke();

  for (let i = 0; i < 20; i++) {
    const x = (frameCount * 0.3 + i * 67) % width;
    const y = 90 + noise(i, frameCount * 0.003) * 220;
    fill(255, 255, 255, 16);
    ellipse(x, y, 24, 12);
  }
}

function drawTimeIndicator() {
  const now = Date.now();
  const elapsedMs = now - sessionStartTime;
  const clampedElapsedMs = constrain(elapsedMs, 0, TEST_DURATION_MS);
  const progress = clampedElapsedMs / TEST_DURATION_MS;

  const elapsedSec = floor(clampedElapsedMs / 1000);
  const elapsedMin = floor(elapsedSec / 60);
  const elapsedRemainSec = elapsedSec % 60;
  const elapsedLabel = nf(elapsedMin, 2) + ":" + nf(elapsedRemainSec, 2);

  const barX = 180;
  const barY = 44;
  const barW = width - 360;

  stroke(255, 255, 255, 90);
  strokeWeight(2);
  line(barX, barY, barX + barW, barY);

  const majorMarks = [
    { t: 0, label: "0:00" },
    { t: 450, label: "7:30" },
    { t: 900, label: "15:00 mins" }
  ];

  textAlign(CENTER);
  noStroke();

  for (const mark of majorMarks) {
    const x = barX + (mark.t / 900) * barW;
    fill(255, 255, 255, 110);
    circle(x, barY, 10);

    fill(60, 70, 70, 220);
    textSize(14);
    text(mark.label, x, 24);
  }

for (let sec = 20; sec < 900; sec += 20) {
  if (sec === 450) continue;

  const x = barX + (sec / 900) * barW;

  stroke(255, 255, 255, 55);
  strokeWeight(1);
  line(x, barY - 4, x, barY + 4);
}

  const currentX = lerp(barX, barX + barW, progress);

  fill(255, 170, 80);
  circle(currentX, barY, 14);

  fill(30, 35, 40, 190);
  rect(currentX - 40, barY + 16, 80, 32, 10);
  fill(255);
  textSize(13);
  text(elapsedLabel, currentX, barY + 37);

  if (activityLog.length > 0) {
    const last = activityLog[0];
    fill(20, 30, 30, 180);
    noStroke();
    rect(width - 220, 12, 190, 54, 12);

    fill(255);
    textAlign(LEFT);
    textSize(13);
    text("Last planted:", width - 205, 34);
    text(formatClock(last.time), width - 205, 54);
  }
}

function formatSmallTickLabel(sec) {
  if (sec < 60) return `${sec}s`;

  const min = floor(sec / 60);
  const remain = sec % 60;

  if (remain === 0) return `${min}m`;
  return `${min}m${remain}s`;
}

function drawHUD() {
  fill(20, 30, 30, 180);
  noStroke();
  rect(12, 12, 180, 140, 14);

  fill(255);
  textAlign(LEFT);
  text(`calm: ${latestState.calm.toFixed(2)}`, 24, 36);
  text(`arousal: ${latestState.arousal.toFixed(2)}`, 24, 56);
  text(`positive: ${latestState.positiveValence.toFixed(2)}`, 24, 76);
  text(`negative: ${latestState.negativeValence.toFixed(2)}`, 24, 96);
  text(`focus: ${latestState.focus.toFixed(2)}`, 24, 116);
  text(`flowers: ${flowers.length}`, 24, 136);
}

function drawControlLabels() {
  fill(40);
  noStroke();
  textAlign(LEFT);

  const left = 20;
  const top = height + 15;
  const step = 28;

  text("Calm / Low Arousal", left, top - 2);
  text("High Arousal / Energy", left, top + step - 2);
  text("Positive Valence", left, top + step * 2 - 2);
  text("Negative Valence", left, top + step * 3 - 2);
  text("Focus / Stability", left, top + step * 4 - 2);
}

function formatClock(ts) {
  const d = new Date(ts);
  return nf(d.getHours(), 2) + ":" + nf(d.getMinutes(), 2) + ":" + nf(d.getSeconds(), 2);
}

class Flower {
  constructor(type, x, y, depth, score, state) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.depth = constrain(depth, 0.1, 1.0);
    this.baseScale = lerp(0.45, 1.45, this.depth);
    this.size = map(score, 0.45, 1.0, 18, 58) * this.baseScale;
    this.stem = map(score, 0.45, 1.0, 30, 130) * this.baseScale;
    this.openness = score;
    this.droop = state.negativeValence || 0;
    this.symmetry = state.focus || 0;
    this.warmth = (state.positiveValence || 0) - (state.negativeValence || 0);
    this.petals = floor(map(state.focus || 0, 0, 1, 5, 12));
    this.swayOffset = random(TWO_PI);
  }

  grow(score, state) {
    this.size += score * 1.7 * this.baseScale;
    this.stem += score * 2.2 * this.baseScale;
    this.openness = min(1, this.openness + score * 0.06);
    this.droop = lerp(this.droop, state.negativeValence || 0, 0.2);
    this.symmetry = lerp(this.symmetry, state.focus || 0, 0.2);
    this.warmth = lerp(this.warmth, (state.positiveValence || 0) - (state.negativeValence || 0), 0.2);
    this.petals = floor(map(this.symmetry, 0, 1, 5, 12));
  }

  displayShadow() {
    push();
    translate(this.x, this.y + 8 * this.depth);
    noStroke();
    fill(0, 30);
    ellipse(0, 0, this.size * 0.9, this.size * 0.28);
    pop();
  }

  display() {
    push();
    translate(this.x, this.y);

    const sway = sin(frameCount * 0.02 + this.swayOffset) * 3 * this.depth;
    const lean = map(this.droop, 0, 1, 0, 18) + sway;

    stroke(lerp(120, 70, this.depth), lerp(170, 140, this.depth), lerp(120, 90, this.depth));
    strokeWeight(1.2 + this.depth * 1.8);
    line(0, 0, lean, -this.stem);

    translate(lean, -this.stem);

    if (this.type === "lavender") drawLavender(this.size, this.warmth, this.depth);
    if (this.type === "gerbera") drawGerbera(this.size, this.openness, this.depth);
    if (this.type === "rose") drawRose(this.size, this.warmth, this.openness, this.depth);
    if (this.type === "tulip") drawTulip(this.size, this.droop, this.depth);
    if (this.type === "lily") drawLily(this.size, this.petals, this.symmetry, this.depth);

    pop();
  }
}

function drawLavender(size, warmth, depth) {
  noStroke();
  for (let i = 0; i < 7; i++) {
    const y = -i * (size * 0.18);
    fill(150 + warmth * 20, 120, 190, lerp(140, 230, depth));
    ellipse(0, y, size * 0.28, size * 0.18);
    ellipse(-size * 0.12, y, size * 0.22, size * 0.15);
    ellipse(size * 0.12, y, size * 0.22, size * 0.15);
  }
}

function drawGerbera(size, openness, depth) {
  noStroke();
  const petals = 14;
  for (let i = 0; i < petals; i++) {
    push();
    rotate((TWO_PI / petals) * i);
    fill(255, 150, 90, lerp(150, 240, depth));
    ellipse(0, size * 0.45, size * 0.24, size * (0.7 + openness * 0.5));
    pop();
  }
  fill(120, 80, 40, lerp(140, 255, depth));
  circle(0, 0, size * 0.45);
}

function drawRose(size, warmth, openness, depth) {
  noStroke();
  const cool = color(180, 80, 120, lerp(140, 240, depth));
  const warm = color(255, 90 + warmth * 40, 80, lerp(150, 245, depth));
  fill(lerpColor(cool, warm, constrain((warmth + 1) / 2, 0, 1)));

  for (let i = 0; i < 6; i++) {
    const r = size * (0.25 + i * 0.08) * openness;
    ellipse(0, 0, r * 1.4, r);
  }
}

function drawTulip(size, droop, depth) {
  noStroke();
  fill(120, 140, 220, lerp(140, 240, depth));
  push();
  rotate(map(droop, 0, 1, 0, 0.4));
  beginShape();
  vertex(0, -size * 0.6);
  bezierVertex(size * 0.4, -size * 0.3, size * 0.5, size * 0.2, 0, size * 0.5);
  bezierVertex(-size * 0.5, size * 0.2, -size * 0.4, -size * 0.3, 0, -size * 0.6);
  endShape(CLOSE);
  pop();
}

function drawLily(size, petals, symmetry, depth) {
  noStroke();
  fill(250, 245, 235, lerp(150, 245, depth));
  const spread = map(symmetry, 0, 1, 0.7, 1.0);

  for (let i = 0; i < petals; i++) {
    push();
    rotate((TWO_PI / petals) * i);
    ellipse(0, size * 0.42, size * 0.22, size * 0.95 * spread);
    pop();
  }

  fill(230, 180, 80, lerp(150, 245, depth));
  circle(0, 0, size * 0.18);
}