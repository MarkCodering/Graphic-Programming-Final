# CM2030 Coursework 2 starter

This repository is a runnable foundation for the two-task p5.js application. It
contains the supplied assets, offline library, task navigation, required key
sequences, state validation, and clearly marked interfaces for the assessed
work.

It is **not submission-ready**. Image-processing algorithms, the final Task 1
animation, motion estimation, the technical extension, four manually created
image pairs, and the student's commentary are intentionally unfinished.

## Run locally

From this directory, start any local static server, for example:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. The project is offline at runtime: p5.js and
all currently available images are stored in the repository.

## Controls

- `1`: select Task 1
- Task 1 sequence: `C`, `L`, `S`
- `2`: select Task 2
- Task 2 sequence: `P`, `I`, `G`, `E`, `T`, `N`, `D`
- Left/Right Arrow: select a Task 2 pair
- `A`: invoke the Task 2 extension hook after thresholding

## Student implementation checklist

Search `sketch.js` for `STUDENT TODO`. Complete and be able to explain every
marked section:

1. Calibrate the eight RGB/HSB background masks and implement pixel removal.
2. Replace the raw carousel motion with the required alternating fade/zoom
   subject sequence, opposing text motion, and animated background image.
3. Implement grayscale luminance, Sobel convolution, strong-edge thresholding,
   centroid calculation, and eight-way direction classification.
4. Implement the five-threshold robust-confidence extension.
5. Replace the commentary prompt with an original commentary of at most 500
   words.

## Manually create pairs 5-8

The assignment requires these images to be created manually in GIMP or similar.
Use a 500×350 white canvas and scale each portrait to 140 pixels high while
preserving its aspect ratio:

| Pair | Direction | Source | Frame A top-left | Frame B top-left |
| --- | --- | --- | --- | --- |
| 5 | UP | `assets/task2/5.jpg` | `(180,170)` | `(180,90)` |
| 6 | DOWN | `assets/task2/6.jpg` | `(180,80)` | `(180,160)` |
| 7 | UP-RIGHT | `assets/task2/7.jpg` | `(130,170)` | `(210,90)` |
| 8 | DOWN-LEFT | `assets/task2/8.jpg` | `(220,80)` | `(140,160)` |

Export the frames into `assets/task2/` as `pair5_1.png` through
`pair8_2.png`. After creating them, update the Task 2 loading manifest in
`sketch.js` so all eight pairs are loaded in `preload()`.

## Asset notes

- `assets/task1/`: the eight portraits from the supplied Task 1 archive.
- `assets/task2/`: the four supplied pairs and the four source portraits for
  manually making the remaining pairs.
- `lib/p5.min.js`: p5.js 1.11.3, vendored for offline use.

Before submission, test a freshly extracted ZIP and generate the required code
PDF with the course-provided JavaScript Bundler Tool. Do not include p5.js in
that code PDF.
