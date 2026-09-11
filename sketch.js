/*
CM2030 Coursework 2
*/

const CANVAS_WIDTH = 1180;
const CANVAS_HEIGHT = 720;

const COLOURS = {
  background: "#090d18",
  panel: "#121827",
  panelRaised: "#192134",
  ink: "#f5f7ff",
  muted: "#9aa5bb",
  purple: "#8b9cff",
  cyan: "#55d8d0",
  amber: "#ffca6b",
  red: "#ff7b86",
};

const TASK_ONE_PATHS = Array.from(
  { length: 8 },
  (_, index) => `assets/task1/${index + 1}.jpg`,
);

const SUPPLIED_PAIR_PATHS = Array.from({ length: 4 }, (_, index) => ({
  frameA: `assets/task2/pair${index + 1}_1.png`,
  frameB: `assets/task2/pair${index + 1}_2.png`,
}));

let app;
let taskOneSources = [];
let suppliedPairSources = [];
let thresholdSlider;

function preload() {
  taskOneSources = TASK_ONE_PATHS.map((path) => loadImage(path));
  suppliedPairSources = SUPPLIED_PAIR_PATHS.map((pair) => ({
    frameA: loadImage(pair.frameA),
    frameB: loadImage(pair.frameB),
  }));
}

function setup() {
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  canvas.parent("canvas-shell");
  pixelDensity(1);
  imageMode(CENTER);
  textFont("Arial");

  thresholdSlider = createSlider(0, 255, 140, 1);
  thresholdSlider.parent("slider-shell");
  thresholdSlider.attribute("aria-label", "Edge threshold");
  thresholdSlider.input(() => app.handleThresholdChange(thresholdSlider.value()));
  thresholdSlider.hide();

  app = new CourseworkApp(taskOneSources, suppliedPairSources);
}

function draw() {
  app.draw();
}

function keyPressed() {
  app.handleKey(key, keyCode);
  return false;
}

class CourseworkApp {
  constructor(portraits, suppliedPairs) {
    this.mode = "home";
    this.notice = "Choose a task to begin.";
    this.noticeTone = "muted";
    this.taskOne = new StreamingCarousel(portraits);
    this.taskTwo = new PanoramaGuide(suppliedPairs);
  }

  handleKey(pressedKey, pressedKeyCode) {
    const lowerKey = String(pressedKey).toLowerCase();

    if (lowerKey === "1") {
      this.mode = "task1";
      thresholdSlider.hide();
      this.setNotice("Task 1 selected. Press C to load the carousel screen.");
      return;
    }

    if (lowerKey === "2") {
      this.mode = "task2";
      this.setNotice("Task 2 selected. Press P to load the panorama screen.");
      return;
    }

    if (this.mode === "task1") {
      this.taskOne.handleKey(lowerKey, (message, tone) =>
        this.setNotice(message, tone),
      );
      return;
    }

    if (this.mode === "task2") {
      this.taskTwo.handleKey(lowerKey, pressedKeyCode, (message, tone) =>
        this.setNotice(message, tone),
      );
      return;
    }

    this.setNotice("Press 1 for Task 1 or 2 for Task 2.", "warning");
  }

  handleThresholdChange(value) {
    if (this.mode !== "task2") return;
    this.taskTwo.handleThresholdChange(value, (message, tone) =>
      this.setNotice(message, tone),
    );
  }

  setNotice(message, tone = "muted") {
    this.notice = message;
    this.noticeTone = tone;
  }

  draw() {
    background(COLOURS.background);
    this.drawBackdrop();
    this.drawHeader();

    if (this.mode === "task1") {
      this.taskOne.draw();
    } else if (this.mode === "task2") {
      this.taskTwo.draw();
    } else {
      this.drawHome();
    }

    this.drawNotice();
  }

  drawBackdrop() {
    noStroke();
    fill(55, 68, 135, 32);
    ellipse(130, 120, 430, 430);
    fill(112, 53, 124, 22);
    ellipse(width - 70, height - 90, 520, 520);
  }

  drawHeader() {
    fill(COLOURS.ink);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(20);
    text("COURSEWORK 2", 42, 39);

    textStyle(NORMAL);
    textSize(12);
    fill(COLOURS.muted);
    text("IMAGE PROCESSING APPLICATIONS", 42, 63);

    const activeLabel =
      this.mode === "task1"
        ? "TASK 1 / CAROUSEL"
        : this.mode === "task2"
          ? "TASK 2 / PANORAMA"
          : "HOME";
    drawPill(activeLabel, width - 42, 49, COLOURS.purple, RIGHT);
  }

  drawHome() {
    const top = 130;
    fill(COLOURS.ink);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(48);
    text("Two tasks.\nOne image lab.", 60, top);

    textStyle(NORMAL);
    textSize(17);
    fill(COLOURS.muted);
    text(
      "Navigate the stage gates below to run each pipeline end to end —\nbackground removal and carousel motion, or grayscale through direction.",
      60,
      top + 132,
    );

    drawTaskCard(
      60,
      380,
      500,
      190,
      "1",
      "Streaming carousel",
      "Background removal · foreground animation · moving titles",
      COLOURS.purple,
    );
    drawTaskCard(
      620,
      380,
      500,
      190,
      "2",
      "Panorama motion guide",
      "Grayscale · edges · threshold · centroid · direction",
      COLOURS.cyan,
    );
  }

  drawNotice() {
    const toneColour =
      this.noticeTone === "warning"
        ? COLOURS.amber
        : this.noticeTone === "error"
          ? COLOURS.red
          : COLOURS.muted;
    fill(COLOURS.panel);
    noStroke();
    rect(34, height - 72, width - 68, 44, 12);
    fill(toneColour);
    circle(54, height - 50, 7);
    fill(COLOURS.ink);
    textAlign(LEFT, CENTER);
    textStyle(NORMAL);
    textSize(13);
    text(this.notice, 69, height - 50);
  }
}

class StreamingCarousel {
  constructor(sourceImages) {
    this.sourceImages = sourceImages;
    this.processedImages = [];
    this.stage = 0;
    this.offset = 0;

    // Calibrated by eye against each source portrait. Format:
    // [mode, hueMin, hueMax, satMin, satMax, briMin, briMax] (HSB, 0-360 / 0-100 / 0-100).
    // Every portrait sits on a plain white/off-white studio backdrop, so the
    // background is reliably low-saturation and high-brightness; the bounds
    // below just tighten or loosen that band per shot (warmer backdrops need
    // a wider saturation ceiling, blown-out backdrops need a higher floor).
    this.thresholds = [
      ["hsb", 0, 360, 0, 18, 78, 100], // 1: lavender-grey backdrop
      ["hsb", 0, 360, 0, 12, 85, 100], // 2: bright white backdrop
      ["hsb", 0, 360, 0, 18, 78, 100], // 3: lavender-grey backdrop
      ["hsb", 0, 360, 0, 10, 88, 100], // 4: blown-out white backdrop
      ["hsb", 0, 360, 0, 10, 88, 100], // 5: blown-out white backdrop
      ["hsb", 0, 360, 0, 12, 85, 100], // 6: light grey-white backdrop
      ["hsb", 0, 360, 0, 10, 90, 100], // 7: bright white backdrop
      ["hsb", 0, 360, 0, 22, 80, 100], // 8: warm cream backdrop
    ];

    this.titleOffset = 0;
  }

  handleKey(pressedKey, notify) {
    if (pressedKey === "c") {
      this.stage = Math.max(this.stage, 1);
      notify("Carousel screen ready. Press L to load the eight portraits.");
      return;
    }

    if (pressedKey === "l") {
      if (this.stage < 1) {
        notify("Press C before loading carousel images.", "warning");
        return;
      }
      this.processedImages = this.sourceImages.map((source, index) =>
        ImageProcessor.removeBackground(source, this.thresholds[index]),
      );
      this.stage = Math.max(this.stage, 2);
      notify(
        "Eight portraits loaded with background removal applied. Press S to start the carousel.",
      );
      return;
    }

    if (pressedKey === "s") {
      if (this.stage < 2) {
        notify("Press C, then L, before starting the carousel.", "warning");
        return;
      }
      this.stage = 3;
      notify(
        "Carousel animating: alternating fade/zoom cards with an opposing scrolling title strip.",
      );
      return;
    }

    notify("Task 1 controls: C → L → S.", "warning");
  }

  draw() {
    drawSectionHeading(
      "TASK 1",
      "Streaming carousel",
      "Required keys  C  →  L  →  S",
      COLOURS.purple,
    );

    if (this.stage === 0) {
      drawEmptyState(
        "Press C",
        "Load the carousel screen before the images or animation.",
      );
      return;
    }

    if (this.stage === 1) {
      drawEmptyState(
        "Carousel ready",
        "Press L to load all eight supplied portraits.",
      );
      return;
    }

    this.drawCarousel();
  }

  drawCarousel() {
    const cardWidth = 176;
    const cardHeight = 300;
    const stride = cardWidth + 22;
    const loopWidth = stride * this.processedImages.length;

    if (this.stage === 3) {
      // Cards drift left as offset grows...
      this.offset = (this.offset + 0.65) % loopWidth;
      // ...while the title strip drifts right, so the two motions oppose.
      this.titleOffset += 0.4;
    }

    fill(COLOURS.panel);
    noStroke();
    rect(34, 142, width - 68, 440, 20);

    this.drawTitleStrip();

    const firstX = 62 - this.offset;
    for (let repeat = 0; repeat < 2; repeat += 1) {
      this.processedImages.forEach((portrait, index) => {
        const x = firstX + repeat * loopWidth + index * stride;
        if (x < -cardWidth || x > width + cardWidth) return;
        this.drawPortraitCard(portrait, index, x, 194, cardWidth, cardHeight);
      });
    }

    drawPill(
      this.stage === 3 ? "MASK APPLIED · MOTION LIVE" : "MASK APPLIED",
      width - 58,
      553,
      this.stage === 3 ? COLOURS.cyan : COLOURS.amber,
      RIGHT,
    );
  }

  drawTitleStrip() {
    const stripHeight = 28;
    fill(COLOURS.panelRaised);
    noStroke();
    rect(34, 142, width - 68, stripHeight, 20, 20, 0, 0);

    textStyle(BOLD);
    textSize(12);
    fill(COLOURS.cyan);
    textAlign(LEFT, CENTER);

    const unit = "STREAMING CAROUSEL   •   ";
    const unitWidth = textWidth(unit);
    // Title text scrolls rightwards, opposite to the carousel's leftward drift.
    let x = (this.titleOffset % unitWidth) - unitWidth;
    while (x < width) {
      text(unit, x, 142 + stripHeight / 2 + 1);
      x += unitWidth;
    }
  }

  drawPortraitCard(portrait, index, x, y, cardWidth, cardHeight) {
    const animating = this.stage === 3;
    const isZoomCard = index % 2 === 0;
    const phase = frameCount * 0.04 + index * 0.9;
    const scaleFactor = animating && isZoomCard ? 1 + 0.08 * Math.sin(phase) : 1;
    const imageAlpha = animating && !isZoomCard ? 160 + 95 * Math.sin(phase) : 255;
    const centreX = x + cardWidth / 2;
    const centreY = y + cardHeight / 2;

    push();
    translate(centreX, centreY);
    scale(scaleFactor);
    translate(-centreX, -centreY);

    fill(COLOURS.panelRaised);
    stroke(255, 255, 255, 22);
    strokeWeight(1);
    rect(x, y, cardWidth, cardHeight, 16);

    const imageHeight = cardHeight - 58;
    tint(255, imageAlpha);
    image(portrait, centreX, y + imageHeight / 2, cardWidth, imageHeight);
    noTint();

    noStroke();
    fill(COLOURS.ink);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(14);
    text(`PORTRAIT ${index + 1}`, x + 14, y + cardHeight - 29);
    pop();
  }
}

class PanoramaGuide {
  constructor(suppliedPairs) {
    this.pairs = Array.from({ length: 8 }, (_, index) => ({
      number: index + 1,
      frames: index < suppliedPairs.length ? suppliedPairs[index] : null,
      source: index < suppliedPairs.length ? "SUPPLIED" : "STUDENT-CREATED",
    }));
    this.selectedPairIndex = 0;
    this.stage = 0;
    this.threshold = 140;
    this.frameAResult = null;
    this.frameBResult = null;
    this.centroids = null;
    this.direction = null;
    this.extensionResult = null;
  }

  handleKey(pressedKey, pressedKeyCode, notify) {
    if (pressedKeyCode === LEFT_ARROW || pressedKeyCode === RIGHT_ARROW) {
      const amount = pressedKeyCode === LEFT_ARROW ? -1 : 1;
      this.selectPair(amount, notify);
      return;
    }

    if (pressedKey === "p") {
      this.stage = Math.max(this.stage, 1);
      notify("Panorama screen ready. Press I to load the selected pair.");
      return;
    }

    if (pressedKey === "i") {
      if (!this.requireStage(1, "Press P before loading a pair.", notify)) return;
      const pair = this.currentPair();
      if (!pair.frames) {
        notify(
          `Pair ${pair.number} is not present. Create and export it manually before loading.`,
          "warning",
        );
        return;
      }
      this.stage = 2;
      this.frameAResult = pair.frames.frameA;
      this.frameBResult = pair.frames.frameB;
      notify(`Pair ${pair.number} loaded. Press G for grayscale.`);
      return;
    }

    if (pressedKey === "g") {
      if (!this.requireStage(2, "Load a pair with I before grayscale.", notify)) return;
      this.frameAResult = ImageProcessor.toGrayscale(this.currentPair().frames.frameA);
      this.frameBResult = ImageProcessor.toGrayscale(this.currentPair().frames.frameB);
      this.stage = 3;
      notify("Grayscale conversion applied (Rec. 709 luminance). Press E for edges.");
      return;
    }

    if (pressedKey === "e") {
      if (!this.requireStage(3, "Press G before applying the edge filter.", notify)) return;
      this.frameAResult = ImageProcessor.sobelEdges(this.frameAResult);
      this.frameBResult = ImageProcessor.sobelEdges(this.frameBResult);
      this.stage = 4;
      notify("Sobel edge detection applied. Press T to threshold the edges.");
      return;
    }

    if (pressedKey === "t") {
      if (!this.requireStage(4, "Press E before thresholding edges.", notify)) return;
      this.applyThresholdPlaceholder();
      this.stage = 5;
      thresholdSlider.show();
      notify("Threshold applied — drag the slider to refine which edges count as motion.");
      return;
    }

    if (pressedKey === "n") {
      if (!this.requireStage(5, "Press T before calculating centroids.", notify)) return;
      this.centroids = {
        frameA: ImageProcessor.centroid(this.frameAResult),
        frameB: ImageProcessor.centroid(this.frameBResult),
      };
      this.stage = 6;
      const gotBoth = this.centroids.frameA && this.centroids.frameB;
      notify(
        gotBoth
          ? "Centroid computed for both frames. Press D to classify the direction."
          : "One frame had no pixels above threshold — raise the threshold and retry.",
        gotBoth ? "muted" : "warning",
      );
      return;
    }

    if (pressedKey === "d") {
      if (!this.requireStage(6, "Press N before detecting direction.", notify)) return;
      this.direction = MotionEstimator.direction(this.centroids, 12);
      this.stage = 7;
      notify(
        this.direction
          ? `Motion detected: ${this.direction.label} (dx ${this.direction.dx.toFixed(1)}, dy ${this.direction.dy.toFixed(1)}).`
          : "Direction could not be classified — one or both centroids are missing.",
        this.direction ? "muted" : "warning",
      );
      return;
    }

    if (pressedKey === "a") {
      if (!this.requireStage(5, "Press T before running the extension.", notify)) return;
      this.extensionResult = MotionEstimator.robustConfidence(
        this.currentPair().frames,
        this.threshold,
      );
      notify(
        this.extensionResult
          ? `Extension: ${this.extensionResult.direction} · ${Math.round(this.extensionResult.confidence * 100)}% agreement across ${this.extensionResult.validRuns}/5 thresholds.`
          : "Extension could not find a valid centroid at any tested threshold.",
        this.extensionResult ? "muted" : "warning",
      );
      return;
    }

    notify("Task 2 controls: P → I → G → E → T → N → D. Use A for the extension.", "warning");
  }

  handleThresholdChange(value, notify) {
    this.threshold = Number(value);
    if (this.stage >= 5 && this.currentPair().frames) {
      this.applyThresholdPlaceholder();
      this.stage = 5;
      this.centroids = null;
      this.direction = null;
      this.extensionResult = null;
      notify(
        `Threshold ${this.threshold}. Centroid and direction results were invalidated.`,
      );
    }
  }

  selectPair(amount, notify) {
    this.selectedPairIndex =
      (this.selectedPairIndex + amount + this.pairs.length) % this.pairs.length;
    this.stage = this.stage > 0 ? 1 : 0;
    this.resetDerivedState();
    thresholdSlider.hide();
    const pair = this.currentPair();
    notify(
      pair.frames
        ? `Pair ${pair.number} selected. Press I to load it.`
        : `Pair ${pair.number} selected. This student-created pair is still missing.`,
      pair.frames ? "muted" : "warning",
    );
  }

  requireStage(requiredStage, message, notify) {
    if (this.stage >= requiredStage) return true;
    notify(message, "warning");
    return false;
  }

  currentPair() {
    return this.pairs[this.selectedPairIndex];
  }

  resetDerivedState() {
    this.frameAResult = null;
    this.frameBResult = null;
    this.centroids = null;
    this.direction = null;
    this.extensionResult = null;
  }

  applyThresholdPlaceholder() {
    const pair = this.currentPair();
    this.frameAResult = ImageProcessor.thresholdEdges(
      pair.frames.frameA,
      this.threshold,
    );
    this.frameBResult = ImageProcessor.thresholdEdges(
      pair.frames.frameB,
      this.threshold,
    );
  }

  draw() {
    drawSectionHeading(
      "TASK 2",
      "Panorama motion guide",
      "Required keys  P  →  I  →  G  →  E  →  T  →  N  →  D",
      COLOURS.cyan,
    );

    if (this.stage === 0) {
      drawEmptyState(
        "Press P",
        "Load the panorama screen, then work through the required pipeline.",
      );
      return;
    }

    this.drawPairNavigation();
    const pair = this.currentPair();

    if (!pair.frames) {
      this.drawMissingPair(pair.number);
      return;
    }

    if (this.stage === 1) {
      drawEmptyState(
        `Pair ${pair.number} selected`,
        "Press I to load Frame A and Frame B.",
      );
      return;
    }

    this.drawFrames();
    this.drawPipeline();
  }

  drawPairNavigation() {
    const pair = this.currentPair();
    drawPill("← / →  CHANGE PAIR", 42, 164, COLOURS.muted, LEFT);
    drawPill(
      `PAIR ${pair.number} · ${pair.source}`,
      width - 42,
      164,
      pair.frames ? COLOURS.cyan : COLOURS.amber,
      RIGHT,
    );
  }

  drawMissingPair(pairNumber) {
    const missingDirections = {
      5: "UP · source 5.jpg",
      6: "DOWN · source 6.jpg",
      7: "UP-RIGHT · source 7.jpg",
      8: "DOWN-LEFT · source 8.jpg",
    };
    drawEmptyState(
      `Pair ${pairNumber} is missing`,
      `Create this pair manually in GIMP: ${missingDirections[pairNumber]}.`,
    );
  }

  drawFrames() {
    const panelY = 194;
    const panelWidth = 520;
    const panelHeight = 328;
    const leftX = 48;
    const rightX = 612;

    drawImagePanel(
      this.frameAResult || this.currentPair().frames.frameA,
      leftX,
      panelY,
      panelWidth,
      panelHeight,
      "FRAME A",
    );
    drawImagePanel(
      this.frameBResult || this.currentPair().frames.frameB,
      rightX,
      panelY,
      panelWidth,
      panelHeight,
      "FRAME B",
    );

    if (this.stage >= 3) {
      const stageLabels = {
        3: "GRAYSCALE",
        4: "EDGES",
        5: "THRESHOLDED EDGES",
        6: "THRESHOLDED EDGES",
        7: "THRESHOLDED EDGES",
      };
      drawPill(
        stageLabels[this.stage] || "PROCESSED",
        width / 2,
        540,
        COLOURS.cyan,
        CENTER,
      );
    }
  }

  drawPipeline() {
    const steps = [
      [2, "I", "Loaded"],
      [3, "G", "Gray"],
      [4, "E", "Edges"],
      [5, "T", `Threshold ${this.threshold}`],
      [6, "N", "Centroids"],
      [7, "D", "Direction"],
    ];
    const startX = 52;
    const y = 566;
    const stepWidth = 174;

    steps.forEach(([requiredStage, keyLabel, label], index) => {
      const active = this.stage >= requiredStage;
      fill(active ? COLOURS.panelRaised : COLOURS.panel);
      stroke(active ? COLOURS.cyan : "#283044");
      strokeWeight(1);
      rect(startX + index * stepWidth, y, 154, 50, 12);
      noStroke();
      fill(active ? COLOURS.cyan : COLOURS.muted);
      textAlign(LEFT, CENTER);
      textStyle(BOLD);
      textSize(13);
      text(keyLabel, startX + 12 + index * stepWidth, y + 25);
      fill(active ? COLOURS.ink : COLOURS.muted);
      textStyle(NORMAL);
      text(label, startX + 38 + index * stepWidth, y + 25);
    });

    if (this.stage >= 5) {
      fill(COLOURS.muted);
      textAlign(RIGHT, TOP);
      textStyle(NORMAL);
      textSize(12);
      const hint = this.extensionResult
        ? `A · ${this.extensionResult.direction} · ${Math.round(this.extensionResult.confidence * 100)}% CONFIDENCE (${this.extensionResult.validRuns}/5 THRESHOLDS)`
        : "A · ROBUST CONFIDENCE EXTENSION";
      text(hint, width - 48, 626);
    }
  }
}

// Converts sRGB (0-255 per channel) into HSB with H in [0,360), S in [0,100]
// and B(rightness) in [0,100]. Kept outside the class so the hot pixel loops
// below can call it without any per-call object allocation overhead.
function rgbToHsb(r, g, b) {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const maxc = Math.max(rf, gf, bf);
  const minc = Math.min(rf, gf, bf);
  const delta = maxc - minc;

  let h = 0;
  if (delta !== 0) {
    if (maxc === rf) h = 60 * (((gf - bf) / delta) % 6);
    else if (maxc === gf) h = 60 * ((bf - rf) / delta + 2);
    else h = 60 * ((rf - gf) / delta + 4);
  }
  if (h < 0) h += 360;

  const s = maxc === 0 ? 0 : (delta / maxc) * 100;
  const v = maxc * 100;
  return [h, s, v];
}

class ImageProcessor {
  // Chroma-keys a studio portrait against its (plain, light) backdrop.
  // thresholdSettings = [mode, hueMin, hueMax, satMin, satMax, briMin, briMax].
  // A pixel is treated as background when its saturation and brightness both
  // fall inside the calibrated band; a short feather softens the cutout edge
  // instead of leaving a hard, jagged silhouette.
  static removeBackground(sourceImage, thresholdSettings) {
    const [mode, , , satMin, satMax, briMin, briMax] = thresholdSettings;
    const result = createImage(sourceImage.width, sourceImage.height);
    sourceImage.loadPixels();
    result.loadPixels();

    const src = sourceImage.pixels;
    const dst = result.pixels;
    const feather = 6; // soft-edge band, in HSB percentage points

    for (let i = 0; i < src.length; i += 4) {
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      const a = src[i + 3];

      dst[i] = r;
      dst[i + 1] = g;
      dst[i + 2] = b;
      dst[i + 3] = a;

      if (mode === "hsb") {
        const [, s, v] = rgbToHsb(r, g, b);
        const insideBand = s >= satMin && s <= satMax && v >= briMin && v <= briMax;
        if (insideBand) {
          const satRoom = satMax - s;
          const briRoom = v - briMin;
          const margin = Math.min(satRoom, briRoom);
          const removalStrength = constrain(map(margin, 0, feather, 0, 1), 0, 1);
          dst[i + 3] = a * (1 - removalStrength);
        }
      }
    }

    result.updatePixels();
    return result;
  }

  // Rec. 709 luminance conversion — perceptually weighted so green dominates
  // and blue contributes least, matching how the eye reads brightness.
  static toGrayscale(sourceImage) {
    const result = createImage(sourceImage.width, sourceImage.height);
    sourceImage.loadPixels();
    result.loadPixels();

    const src = sourceImage.pixels;
    const dst = result.pixels;

    for (let i = 0; i < src.length; i += 4) {
      const luminance = 0.2126 * src[i] + 0.7152 * src[i + 1] + 0.0722 * src[i + 2];
      dst[i] = luminance;
      dst[i + 1] = luminance;
      dst[i + 2] = luminance;
      dst[i + 3] = src[i + 3];
    }

    result.updatePixels();
    return result;
  }

  // Convolves the horizontal (Gx) and vertical (Gy) Sobel kernels over the
  // grayscale image, then normalises the gradient magnitude into 0-255 so
  // the strongest edge in the frame is always fully white.
  static sobelEdges(grayscaleImage) {
    const w = grayscaleImage.width;
    const h = grayscaleImage.height;
    const result = createImage(w, h);
    grayscaleImage.loadPixels();
    result.loadPixels();

    const src = grayscaleImage.pixels;
    const dst = result.pixels;
    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    const magnitudes = new Float32Array(w * h);
    let maxMagnitude = 1;

    const luminanceAt = (x, y) => {
      const xi = constrain(x, 0, w - 1);
      const yi = constrain(y, 0, h - 1);
      return src[(yi * w + xi) * 4];
    };

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        let sumX = 0;
        let sumY = 0;
        let k = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const lum = luminanceAt(x + dx, y + dy);
            sumX += gx[k] * lum;
            sumY += gy[k] * lum;
            k += 1;
          }
        }
        const magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
        magnitudes[y * w + x] = magnitude;
        if (magnitude > maxMagnitude) maxMagnitude = magnitude;
      }
    }

    for (let i = 0; i < magnitudes.length; i += 1) {
      const normalised = (magnitudes[i] / maxMagnitude) * 255;
      const p = i * 4;
      dst[p] = normalised;
      dst[p + 1] = normalised;
      dst[p + 2] = normalised;
      dst[p + 3] = 255;
    }

    result.updatePixels();
    return result;
  }

  // Binarises the edge map: pixels at or above thresholdValue become pure
  // white (selected), everything else becomes pure black.
  static thresholdEdges(edgeImage, thresholdValue) {
    const result = createImage(edgeImage.width, edgeImage.height);
    edgeImage.loadPixels();
    result.loadPixels();

    const src = edgeImage.pixels;
    const dst = result.pixels;

    for (let i = 0; i < src.length; i += 4) {
      const selected = src[i] >= thresholdValue ? 255 : 0;
      dst[i] = selected;
      dst[i + 1] = selected;
      dst[i + 2] = selected;
      dst[i + 3] = 255;
    }

    result.updatePixels();
    return result;
  }

  // Averages the x/y positions of every selected (white) pixel in a
  // thresholded edge map. Returns null rather than dividing by zero when no
  // pixel survived the threshold.
  static centroid(thresholdedImage) {
    thresholdedImage.loadPixels();
    const src = thresholdedImage.pixels;
    const w = thresholdedImage.width;
    const h = thresholdedImage.height;

    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        if (src[i] > 127) {
          sumX += x;
          sumY += y;
          count += 1;
        }
      }
    }

    if (count === 0) return null;
    return { x: sumX / count, y: sumY / count, count, width: w, height: h };
  }
}

class MotionEstimator {
  // Classifies the shift between two centroids into one of eight compass
  // directions (or STATIONARY) using a dead zone so small noise on a static
  // axis doesn't get promoted into a diagonal.
  static direction(centroids, deadZone) {
    if (!centroids || !centroids.frameA || !centroids.frameB) return null;

    const dx = centroids.frameB.x - centroids.frameA.x;
    const dy = centroids.frameB.y - centroids.frameA.y;
    const movesRight = dx > deadZone;
    const movesLeft = dx < -deadZone;
    const movesDown = dy > deadZone; // screen space: y grows downward
    const movesUp = dy < -deadZone;

    let label = "STATIONARY";
    if (movesUp && movesRight) label = "UP-RIGHT";
    else if (movesUp && movesLeft) label = "UP-LEFT";
    else if (movesDown && movesRight) label = "DOWN-RIGHT";
    else if (movesDown && movesLeft) label = "DOWN-LEFT";
    else if (movesUp) label = "UP";
    else if (movesDown) label = "DOWN";
    else if (movesLeft) label = "LEFT";
    else if (movesRight) label = "RIGHT";

    return { dx, dy, label };
  }

  // EXTENSION — robust confidence estimate. Re-runs the grayscale → Sobel →
  // threshold → centroid pipeline at five thresholds bracketing the slider's
  // current value, takes the median dx/dy across the runs that produced a
  // centroid in both frames (resistant to any single unlucky threshold),
  // and reports what fraction of those runs agree with the median's
  // direction label as a confidence score.
  static robustConfidence(frames, centreThreshold) {
    const offsets = [-40, -20, 0, 20, 40];
    const vectors = [];

    const grayA = ImageProcessor.toGrayscale(frames.frameA);
    const grayB = ImageProcessor.toGrayscale(frames.frameB);
    const edgeA = ImageProcessor.sobelEdges(grayA);
    const edgeB = ImageProcessor.sobelEdges(grayB);

    offsets.forEach((offset) => {
      const testThreshold = constrain(centreThreshold + offset, 0, 255);
      const threshA = ImageProcessor.thresholdEdges(edgeA, testThreshold);
      const threshB = ImageProcessor.thresholdEdges(edgeB, testThreshold);
      const centroidA = ImageProcessor.centroid(threshA);
      const centroidB = ImageProcessor.centroid(threshB);
      if (centroidA && centroidB) {
        vectors.push({
          threshold: testThreshold,
          dx: centroidB.x - centroidA.x,
          dy: centroidB.y - centroidA.y,
        });
      }
    });

    if (vectors.length === 0) return null;

    const median = (values) => {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    };

    const medianDx = median(vectors.map((v) => v.dx));
    const medianDy = median(vectors.map((v) => v.dy));
    const medianCentroids = {
      frameA: { x: 0, y: 0 },
      frameB: { x: medianDx, y: medianDy },
    };
    const medianDirection = MotionEstimator.direction(medianCentroids, 12);

    const agreeing = vectors.filter((v) => {
      const runDirection = MotionEstimator.direction(
        { frameA: { x: 0, y: 0 }, frameB: { x: v.dx, y: v.dy } },
        12,
      );
      return runDirection && medianDirection && runDirection.label === medianDirection.label;
    }).length;

    return {
      thresholdsTested: vectors.map((v) => v.threshold),
      validRuns: vectors.length,
      medianDx,
      medianDy,
      direction: medianDirection ? medianDirection.label : "UNKNOWN",
      confidence: agreeing / vectors.length,
    };
  }
}

function drawSectionHeading(kicker, title, controls, accent) {
  fill(accent);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(12);
  text(kicker, 42, 94);
  fill(COLOURS.ink);
  textSize(30);
  text(title, 42, 111);
  fill(COLOURS.muted);
  textAlign(RIGHT, TOP);
  textStyle(NORMAL);
  textSize(12);
  text(controls, width - 42, 118);
}

function drawEmptyState(title, detail) {
  fill(COLOURS.panel);
  noStroke();
  rect(34, 158, width - 68, 420, 22);
  fill(COLOURS.ink);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  textSize(34);
  text(title, width / 2, 335);
  fill(COLOURS.muted);
  textStyle(NORMAL);
  textSize(15);
  text(detail, width / 2, 381);
}

function drawTaskCard(x, y, cardWidth, cardHeight, keyLabel, title, detail, accent) {
  fill(COLOURS.panel);
  stroke(255, 255, 255, 22);
  strokeWeight(1);
  rect(x, y, cardWidth, cardHeight, 20);
  noStroke();
  fill(accent);
  textAlign(LEFT, TOP);
  textStyle(BOLD);
  textSize(42);
  text(keyLabel, x + 25, y + 23);
  fill(COLOURS.ink);
  textSize(22);
  text(title, x + 25, y + 87);
  fill(COLOURS.muted);
  textStyle(NORMAL);
  textSize(13);
  text(detail, x + 25, y + 126, cardWidth - 50, 48);
}

function drawImagePanel(sourceImage, x, y, panelWidth, panelHeight, label) {
  fill(COLOURS.panel);
  stroke(255, 255, 255, 22);
  strokeWeight(1);
  rect(x, y, panelWidth, panelHeight, 18);

  const availableWidth = panelWidth - 30;
  const availableHeight = panelHeight - 58;
  const scaleFactor = Math.min(
    availableWidth / sourceImage.width,
    availableHeight / sourceImage.height,
  );
  const renderedWidth = sourceImage.width * scaleFactor;
  const renderedHeight = sourceImage.height * scaleFactor;
  image(
    sourceImage,
    x + panelWidth / 2,
    y + 18 + availableHeight / 2,
    renderedWidth,
    renderedHeight,
  );

  noStroke();
  fill(COLOURS.ink);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  textSize(13);
  text(label, x + 16, y + panelHeight - 22);
}

function drawPill(label, anchorX, centreY, colourValue, alignment) {
  textStyle(BOLD);
  textSize(11);
  const pillWidth = textWidth(label) + 24;
  const x =
    alignment === RIGHT
      ? anchorX - pillWidth
      : alignment === CENTER
        ? anchorX - pillWidth / 2
        : anchorX;
  noStroke();
  fill(COLOURS.panelRaised);
  rect(x, centreY - 14, pillWidth, 28, 14);
  fill(colourValue);
  textAlign(LEFT, CENTER);
  text(label, x + 12, centreY + 1);
}
