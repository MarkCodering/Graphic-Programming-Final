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
      "This starter establishes navigation, assets, stage gates, and interfaces.\nThe marked processing work is intentionally left for you to implement.",
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

    // Each row must be calibrated by the student. Format:
    // [mode, c1Min, c1Max, c2Min, c2Max, c3Min, c3Max]
    this.thresholds = Array.from({ length: 8 }, () => [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
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
        "Eight raw placeholders loaded. Implement and calibrate background removal before submission.",
        "warning",
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
        "Starter motion running. Student TODO: required fade/zoom alternation and opposing text motion.",
        "warning",
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
      this.offset = (this.offset + 0.65) % loopWidth;
    }

    fill(COLOURS.panel);
    noStroke();
    rect(34, 142, width - 68, 440, 20);

    const firstX = 62 - this.offset;
    for (let repeat = 0; repeat < 2; repeat += 1) {
      this.processedImages.forEach((portrait, index) => {
        const x = firstX + repeat * loopWidth + index * stride;
        if (x < -cardWidth || x > width + cardWidth) return;
        this.drawPortraitCard(portrait, index, x, 194, cardWidth, cardHeight);
      });
    }

    drawPill(
      "RAW INPUT · MASK TODO",
      width - 58,
      553,
      COLOURS.amber,
      RIGHT,
    );
  }

  drawPortraitCard(portrait, index, x, y, cardWidth, cardHeight) {
    fill(COLOURS.panelRaised);
    stroke(255, 255, 255, 22);
    strokeWeight(1);
    rect(x, y, cardWidth, cardHeight, 16);

    const imageHeight = cardHeight - 58;
    image(portrait, x + cardWidth / 2, y + imageHeight / 2, cardWidth, imageHeight);

    noStroke();
    fill(COLOURS.ink);
    textAlign(LEFT, CENTER);
    textStyle(BOLD);
    textSize(14);
    text(`PORTRAIT ${index + 1}`, x + 14, y + cardHeight - 29);
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
      notify("Grayscale hook called. Student TODO: implement luminance conversion.", "warning");
      return;
    }

    if (pressedKey === "e") {
      if (!this.requireStage(3, "Press G before applying the edge filter.", notify)) return;
      this.frameAResult = ImageProcessor.sobelEdges(this.frameAResult);
      this.frameBResult = ImageProcessor.sobelEdges(this.frameBResult);
      this.stage = 4;
      notify("Edge hook called. Student TODO: implement the Sobel convolution.", "warning");
      return;
    }

    if (pressedKey === "t") {
      if (!this.requireStage(4, "Press E before thresholding edges.", notify)) return;
      this.applyThresholdPlaceholder();
      this.stage = 5;
      thresholdSlider.show();
      notify("Threshold control enabled. Student TODO: retain only strong edges.", "warning");
      return;
    }

    if (pressedKey === "n") {
      if (!this.requireStage(5, "Press T before calculating centroids.", notify)) return;
      this.centroids = {
        frameA: ImageProcessor.centroid(this.frameAResult),
        frameB: ImageProcessor.centroid(this.frameBResult),
      };
      this.stage = 6;
      notify("Centroid hook called. Student TODO: calculate from selected pixels.", "warning");
      return;
    }

    if (pressedKey === "d") {
      if (!this.requireStage(6, "Press N before detecting direction.", notify)) return;
      this.direction = MotionEstimator.direction(this.centroids, 12);
      this.stage = 7;
      notify("Direction hook called. Student TODO: classify dx and dy.", "warning");
      return;
    }

    if (pressedKey === "a") {
      if (!this.requireStage(5, "Press T before running the extension.", notify)) return;
      this.extensionResult = MotionEstimator.robustConfidence(
        this.currentPair().frames,
        this.threshold,
      );
      notify(
        "Extension hook called. Student TODO: threshold sweep, median vector, and confidence.",
        "warning",
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
      drawPill("PROCESSING PLACEHOLDER", width / 2, 540, COLOURS.amber, CENTER);
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
      textSize(12);
      text("A · ROBUST CONFIDENCE EXTENSION", width - 48, 626);
    }
  }
}

class ImageProcessor {
  static removeBackground(sourceImage, thresholdSettings) {
    // TODO: inspect every pixel, apply the selected RGB/HSB bounds,
    // and write transparency into a copied image. Do not mutate sourceImage.
    void thresholdSettings;
    

    return sourceImage.get();
  }

  static toGrayscale(sourceImage) {
    // TODO: calculate luminance for every source pixel.
    return sourceImage.get();
  }

  static sobelEdges(grayscaleImage) {
    // TODO: convolve horizontal and vertical Sobel kernels and store
    // normalized gradient magnitudes in a new p5.Image.
    return grayscaleImage.get();
  }

  static thresholdEdges(edgeImage, thresholdValue) {
    // TODO: retain only pixels stronger than thresholdValue.
    void thresholdValue;
    return edgeImage.get();
  }

  static centroid(thresholdedImage) {
    // TODO: sum selected x/y positions, count them, and guard count=0.
    void thresholdedImage;
    return null;
  }
}

class MotionEstimator {
  static direction(centroids, deadZone) {
    // TODO: derive dx/dy solely from centroids, then classify one of
    // the eight required directions with the supplied dead zone.
    void centroids;
    void deadZone;
    return null;
  }

  static robustConfidence(frames, centreThreshold) {
    // TODO: test five thresholds around centreThreshold, use median
    // dx/dy, and calculate directional agreement among valid runs.
    void frames;
    void centreThreshold;
    return null;
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
