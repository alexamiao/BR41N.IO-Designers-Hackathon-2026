let particles = [];
let tasteSelector;
let alphaSlider, betaSlider;

const tasteConfigs = {
  sweet: {
    palette: [
      [255, 170, 90],
      [255, 120, 140],
      [255, 210, 120],
      [255, 190, 230]
    ],
    gravity: 0.02,
    wobble: 0.4,
    sizeMin: 6,
    sizeMax: 14,
    burstMin: 18,
    burstMax: 36,
    shape: "circle",
    halo: true,
    lifeMin: 70,
    lifeMax: 110
  },
  sour: {
    palette: [
      [220, 255, 60],
      [180, 255, 0],
      [255, 245, 90]
    ],
    gravity: 0.01,
    wobble: 2.2,
    sizeMin: 4,
    sizeMax: 10,
    burstMin: 24,
    burstMax: 42,
    shape: "spike",
    halo: false,
    lifeMin: 35,
    lifeMax: 70
  },
  bitter: {
    palette: [
      [80, 60, 140],
      [120, 70, 180],
      [60, 40, 110]
    ],
    gravity: 0.06,
    wobble: -0.6,
    sizeMin: 5,
    sizeMax: 12,
    burstMin: 20,
    burstMax: 32,
    shape: "star",
    halo: false,
    lifeMin: 50,
    lifeMax: 85
  },
  umami: {
    palette: [
      [180, 50, 40],
      [210, 90, 50],
      [255, 120, 40]
    ],
    gravity: 0.045,
    wobble: 0.15,
    sizeMin: 7,
    sizeMax: 16,
    burstMin: 16,
    burstMax: 28,
    shape: "ember",
    halo: true,
    lifeMin: 65,
    lifeMax: 100
  },
  dysgeusia: {
    palette: [
      [140, 145, 155],
      [110, 120, 135],
      [170, 175, 185]
    ],
    gravity: 0.03,
    wobble: 0.05,
    sizeMin: 4,
    sizeMax: 8,
    burstMin: 6,
    burstMax: 14,
    shape: "ash",
    halo: false,
    lifeMin: 30,
    lifeMax: 55
  }
};

function setup() {
  createCanvas(900, 500);
  textFont("sans-serif");

  tasteSelector = createSelect();
  tasteSelector.position(20, height + 20);
  tasteSelector.option("sweet");
  tasteSelector.option("sour");
  tasteSelector.option("bitter");
  tasteSelector.option("umami");
  tasteSelector.option("dysgeusia");
  tasteSelector.selected("sweet");

  alphaSlider = createSlider(0, 1, 0.7, 0.01);
  alphaSlider.position(140, height + 20);
  alphaSlider.size(180);

  betaSlider = createSlider(0, 1, 0.6, 0.01);
  betaSlider.position(140, height + 50);
  betaSlider.size(180);
}

function draw() {
  background(10, 10, 15);

  drawBokeh();

  let alphaPower = alphaSlider.value();
  let betaPower = betaSlider.value();
  let taste = tasteSelector.value();
  let cfg = tasteConfigs[taste];

  let launchChance = map(betaPower, 0, 1, 0.02, 0.18);

  if (random() < launchChance) {
    launchBurst(
      random(width * 0.2, width * 0.8),
      random(height * 0.3, height * 0.7),
      cfg,
      alphaPower,
      betaPower
    );
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.run();
    if (p.isDead()) {
      particles.splice(i, 1);
    }
  }

  drawHUD(taste, alphaPower, betaPower);
}

function launchBurst(x, y, cfg, alphaPower, betaPower) {
  let count = floor(map(alphaPower, 0, 1, cfg.burstMin, cfg.burstMax));
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, cfg, alphaPower, betaPower));
  }
}

function drawBokeh() {
  noStroke();
  for (let i = 0; i < 20; i++) {
    let x = (frameCount * 0.5 + i * 60) % width;
    let y = random(height);
    fill(255, 100, 60, 20);
    ellipse(x, y, random(6, 20));
  }
}

function drawHUD(taste, alpha, beta) {
  fill(0, 150);
  rect(10, 10, 260, 100, 10);

  fill(255);
  textSize(14);
  text(`Taste: ${taste}`, 20, 35);
  text(`Alpha: ${alpha.toFixed(2)}`, 20, 55);
  text(`Beta: ${beta.toFixed(2)}`, 20, 75);
}

class Particle {
  constructor(x, y, cfg, alphaPower, betaPower) {
    this.pos = createVector(x, y);

    let angle = random(TWO_PI);
    let speed = map(betaPower, 0, 1, 1, 5);
    this.vel = p5.Vector.fromAngle(angle).mult(speed);

    this.acc = createVector(0, cfg.gravity);
    this.wobble = cfg.wobble;
    this.size = random(cfg.sizeMin, cfg.sizeMax);

    let c = random(cfg.palette);
    this.r = c[0];
    this.g = c[1];
    this.b = c[2];

    this.life = random(cfg.lifeMin, cfg.lifeMax);
    this.maxLife = this.life;

    this.shape = cfg.shape;
    this.halo = cfg.halo;
  }

  run() {
    this.update();
    this.display();
  }

  update() {
    let wobbleOffset = random(-this.wobble, this.wobble);
    this.vel.x += wobbleOffset * 0.05;

    this.vel.add(this.acc);
    this.pos.add(this.vel);

    this.life -= 2;
  }

  display() {
    let alpha = map(this.life, 0, this.maxLife, 0, 255);

    noStroke();

    if (this.halo) {
      fill(this.r, this.g, this.b, alpha * 0.2);
      ellipse(this.pos.x, this.pos.y, this.size * 2);
    }

    fill(this.r, this.g, this.b, alpha);

    if (this.shape === "circle") {
      ellipse(this.pos.x, this.pos.y, this.size);
    } else if (this.shape === "spike") {
      drawSpike(this.pos.x, this.pos.y, this.size);
    } else if (this.shape === "star") {
      drawStar(this.pos.x, this.pos.y, this.size * 0.5, this.size, 5);
    } else {
      ellipse(this.pos.x, this.pos.y, this.size * 0.8);
    }
  }

  isDead() {
    return this.life <= 0;
  }
}

function drawSpike(x, y, s) {
  push();
  translate(x, y);
  beginShape();
  for (let i = 0; i < 8; i++) {
    let angle = (TWO_PI / 8) * i;
    let r = i % 2 === 0 ? s : s * 0.5;
    vertex(cos(angle) * r, sin(angle) * r);
  }
  endShape(CLOSE);
  pop();
}

function drawStar(x, y, r1, r2, n) {
  push();
  translate(x, y);
  beginShape();
  for (let i = 0; i < TWO_PI; i += TWO_PI / n) {
    vertex(cos(i) * r2, sin(i) * r2);
    vertex(cos(i + PI / n) * r1, sin(i + PI / n) * r1);
  }
  endShape(CLOSE);
  pop();
}