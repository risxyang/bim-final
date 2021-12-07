const QPM = 120;
const STEPS_PER_QUARTER = 24;
const Z_DIM = 256;
const HUMANIZE_SECONDS = 0.01;

const tf = mm.tf;

// Set up Multitrack MusicVAE.
const model = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/multitrack_chords');

// Set up an audio player.
const player = initPlayerAndEffects();

// Get UI elements.
const statusDiv = document.getElementById('status');
const changeChordsButton = document.getElementById('changeChords');
const playButton = document.getElementById('play');
const sampleButton1 = document.getElementById('sample1');
const sampleButton2 = document.getElementById('sample2');
const alphaSlider = document.getElementById('alpha');
const saveButton = document.getElementById('download');
const chordsContainer = document.getElementById('chordsContainer');
const chordInputs = [
  document.getElementById('chord1'),
  document.getElementById('chord2'),
  document.getElementById('chord3'),
  document.getElementById('chord4')
];

const numSteps = +alphaSlider.max + 1;
const numChords = chordInputs.length;

// Declare style / sequence variables.
var z1, z2;
var chordSeqs;
var progSeqs;

var changingChords = false;
var playing = false;

var chords = chordInputs.map(c => c.value);

sampleButton1.onclick = updateSample1;
sampleButton2.onclick = updateSample2;
playButton.onclick = togglePlaying;
saveButton.onclick = saveSequence;
changeChordsButton.onclick = toggleChangeChords;
chordInputs.forEach(c => c.oninput = chordChanged);

model.initialize()
  .then(() => {
    setUpdatingState();
    setTimeout(() => {
      generateSample(z => {
        z1 = z;
        generateSample(z => {
          z2 = z;
          generateProgressions(setStoppedState);
        });
      });
    }, 0);
  });


// Sample a latent vector.
function generateSample(doneCallback) {
  const z = tf.randomNormal([1, Z_DIM]);
  z.data().then(zArray => {
    z.dispose();
    doneCallback(zArray);
  });
}

// Randomly adjust note times.
function humanize(s) {
  const seq = mm.sequences.clone(s);
  seq.notes.forEach((note) => {
    let offset = HUMANIZE_SECONDS * (Math.random() - 0.5);
    if (seq.notes.startTime + offset < 0) {
      offset = -seq.notes.startTime;
    }
    if (seq.notes.endTime > seq.totalTime) {
      offset = seq.totalTime - seq.notes.endTime;
    }
    seq.notes.startTime += offset;
    seq.notes.endTime += offset;
  });
  return seq;
}

// Construct spherical linear interpolation tensor.
function slerp(z1, z2, n) {
  const norm1 = tf.norm(z1);
  const norm2 = tf.norm(z2);
  const omega = tf.acos(tf.matMul(tf.div(z1, norm1),
                                  tf.div(z2, norm2),
                                  false, true));
  const sinOmega = tf.sin(omega);
  const t1 = tf.linspace(1, 0, n);
  const t2 = tf.linspace(0, 1, n);
  const alpha1 = tf.div(tf.sin(tf.mul(t1, omega)), sinOmega).as2D(n, 1);
  const alpha2 = tf.div(tf.sin(tf.mul(t2, omega)), sinOmega).as2D(n, 1);
  const z = tf.add(tf.mul(alpha1, z1), tf.mul(alpha2, z2));
  return z;
}

// Concatenate multiple NoteSequence objects.
function concatenateSequences(seqs) {
  const seq = mm.sequences.clone(seqs[0]);
  let numSteps = seqs[0].totalQuantizedSteps;
  for (let i=1; i<seqs.length; i++) {
    const s = mm.sequences.clone(seqs[i]);
    s.notes.forEach(note => {
      note.quantizedStartStep += numSteps;
      note.quantizedEndStep += numSteps;
      seq.notes.push(note);
    });
    numSteps += s.totalQuantizedSteps;
  }
  seq.totalQuantizedSteps = numSteps;
  return seq;
}

// Interpolate the two styles for a single chord.
function interpolateSamples(chord, doneCallback) {
  const z1Tensor = tf.tensor2d(z1, [1, Z_DIM]);
  const z2Tensor = tf.tensor2d(z2, [1, Z_DIM]);
  const zInterp = slerp(z1Tensor, z2Tensor, numSteps);
  
  model.decode(zInterp, undefined, [chord], STEPS_PER_QUARTER)
    .then(sequences => doneCallback(sequences));
}

// Generate interpolations for all chords.
function generateInterpolations(chordIndex, result, doneCallback) {
  if (chordIndex === numChords) {
    doneCallback(result);
  } else {
    interpolateSamples(chords[chordIndex], seqs => {
      for (let i=0; i<numSteps; i++) {
        result[i].push(seqs[i]);
      }
      generateInterpolations(chordIndex + 1, result, doneCallback);
    })
  }
}

// Generate chord progression for each alpha.
function generateProgressions(doneCallback) {
  let temp = [];
  for (let i=0; i<numSteps; i++) {
    temp.push([]);
  }
  generateInterpolations(0, temp, seqs => {
    chordSeqs = seqs;
    concatSeqs = chordSeqs.map(s => concatenateSequences(s));
    progSeqs = concatSeqs.map(seq => {
      const mergedSeq = mm.sequences.mergeInstruments(seq);
      const progSeq = mm.sequences.unquantizeSequence(mergedSeq);
      progSeq.ticksPerQuarter = STEPS_PER_QUARTER;
      return progSeq;
    });
    
    const fullSeq = concatenateSequences(concatSeqs);
    const mergedFullSeq = mm.sequences.mergeInstruments(fullSeq);

    setLoadingState();
    player.loadSamples(mergedFullSeq)
      .then(doneCallback);
  });  
}

// Set UI state to updating styles.
function setUpdatingState() {
  statusDiv.innerText = 'Updating arrangements...';
  controls.setAttribute('disabled', true);
}

// Set UI state to updating instruments.
function setLoadingState() {
  statusDiv.innerText = 'Loading samples...';
  controls.setAttribute('disabled', true);
  chordsContainer.setAttribute('disabled', true);
  changeChordsButton.innerText = 'Change chords';
}

// Set UI state to playing.
function setStoppedState() {
  statusDiv.innerText = 'Ready to play!';
  statusDiv.classList.remove('loading');
  controls.removeAttribute('disabled');
  chordsContainer.setAttribute('disabled', true);
  changeChordsButton.innerText = 'Change chords';
  playButton.innerText = 'Play';
  chordInputs.forEach(c => c.classList.remove('playing'));
}

// Set UI state to playing.
function setPlayingState() {
  statusDiv.innerText = 'Move the slider to interpolate between styles.';
  playButton.innerText = 'Stop';
  controls.removeAttribute('disabled');
  chordsContainer.setAttribute('disabled', true);
  changeChordsButton.innerText = 'Change chords';
}

// Set UI state to changing chords.
function setChordChangeState() {
  statusDiv.innerText = 'Change chords (triads only) then press Done.';
  changeChordsButton.innerText = 'Done';
  chordsContainer.removeAttribute('disabled');
  chordInputs.forEach(c => c.classList.remove('playing'));
}

// Play the interpolated sequence for the current slider position.
function playProgression(chordIdx) {
  const idx = alphaSlider.value;
  
  chordInputs.forEach(c => c.classList.remove('playing'));
  chordInputs[chordIdx].classList.add('playing');
  
  const unquantizedSeq = mm.sequences.unquantizeSequence(chordSeqs[idx][chordIdx]);
  player.start(humanize(unquantizedSeq))
    .then(() => {
      const nextChordIdx = (chordIdx + 1) % numChords;
      playProgression(nextChordIdx);
    });
}

// Update the start style.
function updateSample1() {
  playing = false;
  setUpdatingState();
  player.stop();
  setTimeout(() => {
    generateSample(z => {
      z1 = z;
      generateProgressions(setStoppedState);
    });
  }, 0);
}

// Update the end style.
function updateSample2() {
  playing = false;
  setUpdatingState();
  player.stop();
  setTimeout(() => {
    generateSample(z => {
      z2 = z;
      generateProgressions(setStoppedState);
    });
  }, 0);
}

// Save sequence as MIDI.
function saveSequence() {
  const idx = alphaSlider.value;
  const midi = mm.sequenceProtoToMidi(progSeqs[idx]);
  const file = new Blob([midi], {type: 'audio/midi'});
    
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(file, 'prog.mid');
  } else { // Others
    const a = document.createElement('a');
    const url = URL.createObjectURL(file);
    a.href = url;
    a.download = 'prog.mid';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);  
    }, 0); 
  }
}

// Start or stop playing the sequence at the current slider position.
function togglePlaying() {
  mm.Player.tone.context.resume();
  
  if (playing) {
    playing = false;
    setStoppedState();
    player.stop();
  } else {
    playing = true;
    setPlayingState();
    playProgression(0);
  }
}

// Start or finish changing chords.
function toggleChangeChords() {
  if (changingChords) {
    changingChords = false;
    chords = chordInputs.map(c => c.value);
    setUpdatingState();
    setTimeout(() => generateProgressions(setStoppedState), 0);
  } else {
    playing = false;
    changingChords = true;
    setChordChangeState();
    player.stop();
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
}


function initPlayerAndEffects() {
  const MAX_PAN = 0.2;
  const MIN_DRUM = 35;
  const MAX_DRUM = 81;
  
  // Set up effects chain.
  const globalCompressor = new mm.Player.tone.MultibandCompressor();
  const globalReverb = new mm.Player.tone.Freeverb(0.25);
  const globalLimiter = new mm.Player.tone.Limiter();
  globalCompressor.connect(globalReverb);
  globalReverb.connect(globalLimiter);
  globalLimiter.connect(mm.Player.tone.Master);

  // Set up per-program effects.
  const programMap = new Map();
  for (let i = 0; i < 128; i++) {
    const programCompressor = new mm.Player.tone.Compressor();
    const pan = 2 * MAX_PAN * Math.random() - MAX_PAN;
    const programPanner = new mm.Player.tone.Panner(pan);  
    programMap.set(i, programCompressor);
    programCompressor.connect(programPanner);
    programPanner.connect(globalCompressor);
  }

  // Set up per-drum effects.
  const drumMap = new Map();
  for (let i = MIN_DRUM; i <= MAX_DRUM; i++) {
    const drumCompressor = new mm.Player.tone.Compressor();
    const pan = 2 * MAX_PAN * Math.random() - MAX_PAN;
    const drumPanner = new mm.Player.tone.Panner(pan);
    drumMap.set(i, drumCompressor);
    drumCompressor.connect(drumPanner);  
    drumPanner.connect(globalCompressor);
  }
  
  // Set up SoundFont player.
  const player = new mm.SoundFontPlayer(
      'https://storage.googleapis.com/download.magenta.tensorflow.org/soundfonts_js/sgm_plus', 
    globalCompressor, programMap, drumMap);
  return player;
}