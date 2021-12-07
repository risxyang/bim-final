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


const playNoteSeqFromChord = document.getElementById('noteSeqFromChord')

twinkleButton.onclick = () => { this.player.start(presetMelodies.Twinkle) }

arpeggiatedButton.onclick = () => { this.player.start(presetMelodies.Arpeggiated) }

sparseButton.onclick = () => { this.player.start(presetMelodies.Sparse) }

playNoteSeqFromChord.onclick = () => { this.player.start(this.noteSequenceFromChord) }

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
  initChordRNN()
};

const nOfBars = 8 // hardcode

const initRNN = () => {
  console.log('hi')
  const modelCheckPoint = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn'
  const model = new mm.MusicRNN(modelCheckPoint);

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

const changeChordsButton = document.getElementById('changeChords');
const chordsContainer = document.getElementById('chordsContainer');
const statusDiv = document.getElementById('changeChordsPopup');
const chordInputs = [
  document.getElementById('chord1'),
  document.getElementById('chord2'),
  document.getElementById('chord3'),
  document.getElementById('chord4')
];

const numChords = chordInputs.length;
var chordSeqs;


var changingChords = false;

changeChordsButton.onclick = toggleChangeChords;

chordInputs.forEach(c => c.oninput = chordChanged);

var chords = chordInputs.map(c => c.value);

// Set UI state to changing chords.
function setChordChangeState() {
    statusDiv.innerText = 'Change chords (letters A through G, optionally followed by "m", "dim", "aug" for minor, diminished, and augmented chords), then press Done.';
    changeChordsButton.innerText = 'Done';
    chordsContainer.removeAttribute('disabled');
    chordInputs.forEach(c => c.classList.remove('playing'));
  }
  
function setUpdatingState() {
    statusDiv.innerText = '';
    chordsContainer.setAttribute('disabled', true);
    changeChordsButton.innerText = 'Change';
  }
  
// Start or finish changing chords.
function toggleChangeChords() {
    if (changingChords) {
      changingChords = false;
      chords = chordInputs.map(c => c.value);
      const modelCheckPoint = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv'
      const model = new mm.MusicRNN(modelCheckPoint);
      console.log(chords);
      initChordRNN()
      // model.initialize()
      // .then(() => {
      //   console.log('initialized chord rnn!');
      //   return model.continueSequence(
      //     presetMelodies.Arpeggiated,
      //     nOfBars * 16,
      //     1.0, chords)
      // })
      // .then((noteSequence) => {
      //   // this.setMelodies([i]);
      //   console.log("new" + noteSequence);
  
      //   this.noteSequence = noteSequence;
      //   this.model = model;
      // });
      setUpdatingState();
    //   setTimeout(() => generateProgressions(setStoppedState), 0);
    } else {
      playing = false;
      changingChords = true;
      setChordChangeState();
    //   player.stop();
    }
  }

// One of the chords has been edited.
function chordChanged() {
    const isGood = (chord) => {
      if (!chord) {
        return false;
      }
      try {
        mm.chords.ChordSymbols.pitches(chord);
        return true;
      } catch(e) {
        return false;
      }
    }
    
    var allGood = true;
    chordInputs.forEach(c => {
      if (isGood(c.value)) {
        c.classList.remove('invalid');
      } else {
        c.classList.add('invalid');
        allGood = false;
      }
    });
  
    changeChordsButton.disabled = !allGood;
    // if (allGood)
    // {
    //     console.log(chords);
    //     // chordInputs.forEach(c => {
    //     //     console.log(c.value);
    //     // })
    // }
    
  }
  
  const initChordRNN = () => {
    console.log('hi')
    const modelCheckPoint = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/chord_pitches_improv'
    const model = new mm.MusicRNN(modelCheckPoint);
  
    console.log('here')
  
    model.initialize()
      .then(() => {
        console.log('initialized non-chord rnn!');
        return model.continueSequence(
          presetMelodies.Arpeggiated,
          nOfBars * 16,
          1.0, chords)
      })
      .then((noteSequence) => {
        // this.setMelodies([i]);
        console.log(noteSequence)
  
        this.noteSequenceFromChord = noteSequence
        this.model = model;
      });
  }