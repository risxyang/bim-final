// TODO: get importing modules to work
// import { presetMelodies } from "./utils";
// const utils = require('./utils')
// console.log(utils)

const chordProgressions = [
  [
    'C', 'Am', 'F', 'G',
    'C', 'F', 'G', 'C',
  ],
  [
    'C', 'Am', 'F', 'G',
    'C', 'F', 'G', 'C',
  ],
  [
    'C', 'Am', 'F', 'G',
    'C', 'F', 'G', 'C',
    'C', 'Am', 'F', 'G',
    'C', 'F', 'G', 'C',
  ],
];

const presetMelodies = {
  'Twinkle': {
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
  },
  'Sparse': {
    notes: [
      { pitch: 64, quantizedStartStep: 0, quantizedEndStep: 1 },
      { pitch: 62, quantizedStartStep: 1, quantizedEndStep: 2 },
      { pitch: 64, quantizedStartStep: 2, quantizedEndStep: 3 },
      { pitch: 65, quantizedStartStep: 3, quantizedEndStep: 4 },
      { pitch: 67, quantizedStartStep: 4, quantizedEndStep: 8 },
      { pitch: 60, quantizedStartStep: 16, quantizedEndStep: 17 },
      { pitch: 59, quantizedStartStep: 17, quantizedEndStep: 18 },
      { pitch: 60, quantizedStartStep: 18, quantizedEndStep: 19 },
      { pitch: 62, quantizedStartStep: 19, quantizedEndStep: 20 },
      { pitch: 64, quantizedStartStep: 20, quantizedEndStep: 24 }
    ],
    quantizationInfo: { stepsPerQuarter: 4 },
    tempos: [{ time: 0, qpm: 120 }],
    totalQuantizedSteps: 32,
  },
  'Arpeggiated': {
    notes: [
      { pitch: 48, quantizedStartStep: 0, quantizedEndStep: 2 },
      { pitch: 52, quantizedStartStep: 2, quantizedEndStep: 4 },
      { pitch: 55, quantizedStartStep: 4, quantizedEndStep: 6 },
      { pitch: 60, quantizedStartStep: 6, quantizedEndStep: 8 },
      { pitch: 64, quantizedStartStep: 8, quantizedEndStep: 10 },
      { pitch: 67, quantizedStartStep: 10, quantizedEndStep: 12 },
      { pitch: 64, quantizedStartStep: 12, quantizedEndStep: 14 },
      { pitch: 60, quantizedStartStep: 14, quantizedEndStep: 16 },
      { pitch: 57, quantizedStartStep: 16, quantizedEndStep: 18 },
      { pitch: 60, quantizedStartStep: 18, quantizedEndStep: 20 },
      { pitch: 64, quantizedStartStep: 20, quantizedEndStep: 22 },
      { pitch: 69, quantizedStartStep: 22, quantizedEndStep: 24 },
      { pitch: 72, quantizedStartStep: 24, quantizedEndStep: 26 },
      { pitch: 76, quantizedStartStep: 26, quantizedEndStep: 28 },
      { pitch: 72, quantizedStartStep: 28, quantizedEndStep: 30 },
      { pitch: 69, quantizedStartStep: 30, quantizedEndStep: 32 }
    ],
    quantizationInfo: { stepsPerQuarter: 4 },
    tempos: [{ time: 0, qpm: 120 }],
    totalQuantizedSteps: 32,
  },
}


const twinkleButton = document.getElementById('twinkle')
const arpeggiatedButton = document.getElementById('arpeggiated')
const sparseButton = document.getElementById('sparse')

const playLoadedMusicButton = document.getElementById('loadedMusic')

twinkleButton.onclick = () => { this.player.start(presetMelodies.Twinkle) }

arpeggiatedButton.onclick = () => { this.player.start(presetMelodies.Arpeggiated) }

sparseButton.onclick = () => { this.player.start(presetMelodies.Sparse) }

playLoadedMusicButton.onclick = () => {
  this.player.start(this.noteSequence)
}

window.onload = () => {
  console.log('window.onload!')
  console.log('this', this)

  // init player
  this.player = new mm.Player()

  // init rnn
  initRNN()

  // TODO: init chord cnn, make this a option
};

const initRNN = () => {
  console.log('hi')
  const modelCheckPoint = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn'
  const model = new mm.MusicRNN(modelCheckPoint);

  const nOfBars = 8 // hardcode

  console.log('here')

  model.initialize()
    .then(() => {
      console.log('initialized non-chord rnn!');
      return model.continueSequence(
        presetMelodies.Arpeggiated,
        nOfBars * 16,
        1.0)
    })
    .then((noteSequence) => {
      // this.setMelodies([i]);
      console.log(noteSequence)

      this.noteSequence = noteSequence
      this.model = model;
    });
}