const BASE_CONFIG = {
  minPitch: 20,
  maxPitch: 100,
  noteHeight: 1.5,
  pixelsPerTimeStep: 44
};

class Visualizer {
  constructor(clicksPerQuarter = 1) {
    this.TICKS_PER_BAR = 4 * clicksPerQuarter;
    this.TICKS_PER_TWO_BAR = 2 * this.TICKS_PER_BAR;

    this.svgInput = document.getElementById('svgInput');
    this.svgMelody = document.getElementById('svgMelody');
    this.svgDrums = document.getElementById('svgDrums');
    this.bar = document.getElementById('timeline');

    this.barLocations = Array(this.TICKS_PER_TWO_BAR).fill().map((v, i) => i);
    this.vizMelody = this.vizDrums = null;


    this.input = { notes: [] };

    this.melody = { notes: [] };
    this.drums = { notes: [] };

    this.melody = {
      notes: [
        { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 2 },
        { pitch: 60, quantizedStartStep: 2, quantizedEndStep: 4 },
        { pitch: 67, quantizedStartStep: 4, quantizedEndStep: 6 },
        { pitch: 67, quantizedStartStep: 6, quantizedEndStep: 8 },
        { pitch: 69, quantizedStartStep: 8, quantizedEndStep: 10 },
        { pitch: 69, quantizedStartStep: 10, quantizedEndStep: 12 },
        { pitch: 67, quantizedStartStep: 12, quantizedEndStep: 16 },
        { pitch: 65, quantizedStartStep: 16, quantizedEndStep: 18 },
        { pitch: 65, quantizedStartStep: 18, quantizedEndStep: 20 },
        { pitch: 64, quantizedStartStep: 20, quantizedEndStep: 22 },
        { pitch: 64, quantizedStartStep: 22, quantizedEndStep: 24 },
        { pitch: 62, quantizedStartStep: 24, quantizedEndStep: 26 },
        { pitch: 62, quantizedStartStep: 26, quantizedEndStep: 28 },
        { pitch: 60, quantizedStartStep: 28, quantizedEndStep: 32 },
      ],
      quantizationInfo: { stepsPerQuarter: 4 },
      tempos: [{ time: 0, qpm: 120 }],
      totalQuantizedSteps: 32,
    };
    this.vizMelody = new mm.PianoRollSVGVisualizer(this.melody, this.svgMelody, this.cfgMelody);

    this.cfgInput = this.makeConfig('255, 255, 255');
    this.cfgMelody = this.makeConfig('255, 215, 0');
    this.cfgDrums = this.makeConfig('123, 225, 225');

    this.barOffset = 0;
    this.barHasBeenRestarted = false;
  }

  reset() {
    this.svgInput.innerHTML = '';
    this.svgMelody.innerHTML = '';
    this.svgDrums.innerHTML = '';

    this.input.notes = [];
    this.melody.notes = [];
    this.drums.notes = [];
    this.barHasBeenRestarted = false;
    this.barOffset = 0;

  }

  setTotalTime(t) {
    this.input.totalTime = this.melody.totalTime = this.drums.totalTime = t;
    // There's 260 pixels available for every timestep
    const p = Math.floor(260 / t);
    this.cfgInput.pixelsPerTimeStep = this.cfgMelody.pixelsPerTimeStep = this.cfgDrums.pixelsPerTimeStep = p;
  }

  restartBar() {
    if (this.barOffset >= this.TICKS_PER_BAR) {
      // We are restarting the timeline in the second bar. This means that we want 
      // the timeline to be the index of this click in a single bar.
      for (let i = 0; i < this.barLocations.length; i++) {
        const newIndex = i >= this.TICKS_PER_BAR ? i - this.TICKS_PER_BAR : i + this.TICKS_PER_BAR;
        this.barLocations[i] = newIndex;
      }
    } else {
      this.barLocations = Array(this.TICKS_PER_TWO_BAR).fill().map((v, i) => i);
    }
    this.barHasBeenRestarted = true;
    this.advanceBar(this.barOffset);
  }

  advanceBar(click) {
    let index = click;

    if (!this.barHasBeenRestarted) {
      this.barOffset = click;
    } else {
      // Wrap the time correctly, since the beginning of the
      // 2 bar chunk might actually now be the second bar.
      index = this.barLocations[click];
    }
    this.bar.style.left = `${index / this.TICKS_PER_TWO_BAR * 100}%`;
  }

  showInput(note, timeOffset) {
    this.input.notes.push({
      pitch: note.pitch,
      startTime: note.startTime - timeOffset,
      endTime: note.endTime - timeOffset,
      velocity: note.velocity
    });

    this.vizInput = new window.core.PianoRollSVGVisualizer(this.input, this.svgInput, this.cfgInput);
  }

  showMelody(melody, muted) {
    if (muted) {
      this.svgMelody.innerHTML = '';
      return;
    }

    // Has anything even changed?
    // if (this.melody.notes.length !== 0 && this.melody === melody) {
    //   console.log("nothing changed in the melody");
    //   return;
    // }

    this.melody = melody;
    this.vizMelody = new window.core.PianoRollSVGVisualizer(this.melody, this.svgMelody, this.cfgMelody);
  }

  showDrums(drums, muted) {
    if (muted) {
      this.svgDrums.innerHTML = '';
      return;
    }

    // Has anything even changed?
    // if (this.drums === drums) {
    //   console.log("nothing changed in the melody");
    //   return;
    // }

    this.drums = drums;
    this.vizDrums = new window.core.PianoRollSVGVisualizer(this.drums, this.svgDrums, this.cfgDrums);
  }

  clearInput() {
    this.svgInput.innerHTML = '';
    this.input.notes = [];
  }

  makeConfig(color) {
    // I don't trust objects anymore, man.
    const cfg = JSON.parse(JSON.stringify(BASE_CONFIG));
    cfg.noteRGB = color;
    return cfg;
  }
}