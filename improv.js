const MIN_NOTE = 48;
const MAX_NOTE = 83;
const NO_EVENT = -2;
const NOTE_OFF = -1;
const STEPS_PER_CHORD = 16;
const MODES = [
  [2, 2, 1, 2, 2, 2, 1],
  [2, 1, 2, 2, 2, 1, 2],
  [1, 2, 2, 2, 1, 2, 2],
  [2, 2, 2, 1, 2, 2, 1],
  [2, 2, 1, 2, 2, 1, 2],
  [2, 1, 2, 2, 1, 2, 2],
  [1, 2, 2, 1, 2, 2, 2]
];
const KEYS = [
  'C4',
  'G3',
  'D4',
  'A3',
  'E4',
  'B3',
  'F#4',
  'C#4',
  'G#3',
  'D#4',
  'A#3',
  'F4'
];

let key = Tone.Frequency(_.sample(KEYS)).toMidi();
let mode = _.sample(MODES);
let melodyLine = [];
let generatedChords = new Map();
let pendingActions = [];
let musicOutput = 'internal';
let currentMIDIOutput;

Tone.Transport.bpm.value = 30;
Tone.context.latencyHint = 'playback';

function buildScale(tonic, mode) {
  return mode
    .concat(mode)
    .reduce((res, interval) => res.concat([_.last(res) + interval]), [tonic]);
}

function getPitchChord(degree, tonic, mode) {
  let scale = buildScale(tonic, mode);
  let root = scale[degree];
  let third = _.includes(scale, root + 4) ? root + 4 : root + 3;
  let fifth = _.includes(scale, third + 4) ? third + 4 : third + 3;
  return [root % 12, third % 12, fifth % 12];
}

function getChordRootBasedOnLast(degree, tonic, mode, last) {
  let rootMid = buildScale(tonic, mode)[degree];
  let rootLow = rootMid - 12;
  let rootHigh = rootMid + 12;
  let options = [rootMid, rootLow, rootHigh].filter(
    n => n >= MIN_NOTE && n <= MAX_NOTE
  );
  return Math.random() < 0.75
    ? _.minBy(options, r => Math.abs(r - last))
    : _.sample(options);
}

// Beethoven's chord progression probabilities

// 0 = I, 1 = ii, etc.
var chordProgressions = new Tone.CtrlMarkov({
  0: [
    { value: 1, probability: 0.1 },
    { value: 2, probability: 0.01 },
    { value: 3, probability: 0.13 },
    { value: 4, probability: 0.52 },
    { value: 5, probability: 0.02 },
    { value: 6, probability: 0.22 }
  ],
  1: [
    { value: 0, probability: 0.06 },
    { value: 2, probability: 0.02 },
    { value: 3, probability: 0.0 },
    { value: 4, probability: 0.87 },
    { value: 5, probability: 0.0 },
    { value: 6, probability: 0.05 }
  ],
  2: [
    { value: 0, probability: 0.0 },
    { value: 1, probability: 0.0 },
    { value: 3, probability: 0.0 },
    { value: 4, probability: 0.67 },
    { value: 5, probability: 0.33 },
    { value: 6, probability: 0.0 }
  ],
  3: [
    { value: 0, probability: 0.33 },
    { value: 1, probability: 0.03 },
    { value: 2, probability: 0.07 },
    { value: 4, probability: 0.4 },
    { value: 5, probability: 0.03 },
    { value: 6, probability: 0.13 }
  ],
  4: [
    { value: 0, probability: 0.56 },
    { value: 1, probability: 0.22 },
    { value: 2, probability: 0.01 },
    { value: 3, probability: 0.04 },
    { value: 5, probability: 0.07 },
    { value: 6, probability: 0.11 }
  ],
  5: [
    { value: 0, probability: 0.06 },
    { value: 1, probability: 0.44 },
    { value: 2, probability: 0.0 },
    { value: 3, probability: 0.06 },
    { value: 4, probability: 0.11 },
    { value: 6, probability: 0.33 }
  ],
  6: [
    { value: 0, probability: 0.8 },
    { value: 1, probability: 0.0 },
    { value: 2, probability: 0.0 },
    { value: 3, probability: 0.03 },
    { value: 4, probability: 0.0 },
    { value: 5, probability: 0.0 }
  ]
});
chordProgressions.value = 0;

let temperature = 1.3;

// Using the Improv RNN pretrained model from https://github.com/tensorflow/magenta/tree/master/magenta/models/improv_rnn
let rnn = new mm.MusicRNN(
  'https://storage.googleapis.com/download.magenta.tensorflow.org/tfjs_checkpoints/music_rnn/chord_pitches_improv'
);

function detectChord(notes) {
  notes = notes.map(n => Tonal.Note.pc(Tonal.Note.fromMidi(n))).sort();
  return Tonal.PcSet.modes(notes)
    .map((mode, i) => {
      const tonic = Tonal.Note.name(notes[i]);
      const names = Tonal.Dictionary.chord.names(mode);
      return names.length ? tonic + names[0] : null;
    })
    .filter(x => x);
}

let lastGenerated;
function generateChord(chordDegree, key, mode) {
  let chords = detectChord(getPitchChord(chordDegree, key, mode));
  let chord = _.first(chords) || 'Cm';
  console.log('chord', chord);
  let last = key;
  if (lastGenerated) {
    for (let i = lastGenerated.length - 1; i > 0; i--) {
      if (lastGenerated[i] > 0) {
        last = lastGenerated[i];
        break;
      }
    }
  }
  let seedSeq = toNoteSequence([
    getChordRootBasedOnLast(chordDegree, key, mode, last)
  ]);
  return rnn
    .continueSequence(seedSeq, STEPS_PER_CHORD, temperature, [chord])
    .then(seq => {
      lastGenerated = seq.notes.map(n => n.pitch);
      let result = [];
      let fromChord = { chordDegree, key, mode };
      for (let { pitch, quantizedStartStep } of seq.notes) {
        while (
          result.length === 0 ||
          _.last(result).indexInChord < quantizedStartStep - 1
        ) {
          result.push({
            note: -2,
            indexInChord:
              result.length === 0 ? 0 : _.last(result).indexInChord + 1,
            fromChord
          });
        }
        result.push({
          note: pitch,
          indexInChord: quantizedStartStep,
          fromChord
        });
      }
      return result;
    });
  /*
    for (let i = 0; i < chords.length - 1; i++) {
      let input = dl.Array1D.new(
        encodePitchChord(chords[i + 1]).concat(encodeMelodyNote(melody[i]))
      );
      let nextOutput = math.multiRNNCell(
        [lstm1, lstm2, lstm3],
        input.as2D(1, -1),
        state,
        output
      );

      state.forEach(s => s.dispose());
      output.forEach(o => o.dispose());
      state = nextOutput[0];
      output = nextOutput[1];
      state.forEach(s => keep(s));
      output.forEach(o => keep(o));

      let outputH = output[2];
      let weightedResult = math.matMul(outputH, lstm.fullyConnectedWeights);
      let logits = math.add(weightedResult, lstm.fullyConnectedBiases);
      let softmax = math.softmax(math.divide(logits.as1D(), temperature));

      let sampledOutput = math.multinomial(softmax, 1).asScalar();

      melody.push(decodeMelodyIndex(await sampledOutput.data()));
    }
    let fromChord = { chordDegree, key, mode };
    lastGenerated = melody;
    return melody.map((note, indexInChord) => ({
      note,
      indexInChord,
      fromChord
    }));
  });*/
}

function toNoteSequence(seq) {
  let notes = [];
  for (let i = 0; i < seq.length; i++) {
    if (seq[i] === -1 && notes.length) {
      _.last(notes).endTime = i * 0.5;
    } else if (seq[i] !== -2 && seq[i] !== -1) {
      if (notes.length && !_.last(notes).endTime) {
        _.last(notes).endTime = i * 0.5;
      }
      notes.push({
        pitch: seq[i],
        startTime: i * 0.5
      });
    }
  }
  if (notes.length && !_.last(notes).endTime) {
    _.last(notes).endTime = seq.length * 0.5;
  }
  return mm.sequences.quantizeNoteSequence(
    {
      ticksPerQuarter: 220,
      totalTime: seq.length * 0.5,
      quantizationInfo: {
        stepsPerQuarter: 1
      },
      timeSignatures: [
        {
          time: 0,
          numerator: 4,
          denominator: 4
        }
      ],
      tempos: [
        {
          time: 0,
          qpm: 120
        }
      ],
      notes
    },
    1
  );
}

// Impulse response from Hamilton Mausoleum http://www.openairlib.net/auralizationdb/content/hamilton-mausoleum
let reverb = new Tone.Convolver(
  'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/hm2_000_ortf_48k.mp3'
).toMaster();
reverb.wet = 0.4;

let samples = {
  C3: new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-C4.mp3'
  ),
  'D#3': new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-Ds2.mp3'
  ),
  'F#3': new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-Fs2.mp3'
  ),
  A3: new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-A2.mp3'
  ),
  C4: new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-C3.mp3'
  ),
  'D#4': new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-Ds3.mp3'
  ),
  'F#4': new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-Fs3.mp3'
  ),
  A4: new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-A3.mp3'
  ),
  C5: new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-C4.mp3'
  ),
  'D#5': new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-Ds4.mp3'
  ),
  'F#5': new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-Fs4.mp3'
  ),
  A5: new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-A4.mp3'
  ),
  C6: new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-C5.mp3'
  ),
  'D#6': new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-Ds5.mp3'
  ),
  'F#6': new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-Fs5.mp3'
  ),
  A6: new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/harp-A5.mp3'
  )
};
let bassSamples = {
  C0: new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/bass-C0.mp3'
  ),
  'D#0': new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/bass-Ds0.mp3'
  ),
  'F#0': new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/bass-Fs0.mp3'
  ),
  A0: new Tone.Buffer(
    'https://s3-us-west-2.amazonaws.com/s.cdpn.io/969699/bass-A0.mp3'
  )
};
let sampler = new Tone.Sampler(samples).connect(reverb);
let echoedSampler = new Tone.Sampler(samples)
  .connect(new Tone.PingPongDelay('16n', 0.8).connect(reverb))
  .connect(reverb);
let bassSampler = new Tone.Sampler(bassSamples).connect(
  new Tone.Gain(0.6).connect(reverb)
);
let bassLowSampler = new Tone.Sampler(bassSamples).connect(
  new Tone.Gain(0.25).connect(reverb)
);

function generateNext(time) {
  while (pendingActions.length) {
    let action = pendingActions.shift();
    let uiDelay = melodyLine.length * Tone.Time('16n').toSeconds();
    switch (action.type) {
      case 'keyChange':
        key = action.key;
        chordProgressions.value = 0;
        Tone.Draw.schedule(() => {
          setCurrentKeyInUI(key);
          action.onDone();
        }, time + uiDelay);
        break;
      case 'modeChange':
        mode = action.mode;
        chordProgressions.value = 0;
        Tone.Draw.schedule(() => {
          setCurrentModeInUI(mode);
          action.onDone();
        }, time + uiDelay);
        break;
    }
  }

  let chord = chordProgressions.value;
  chordProgressions.next();
  let mapKey = `${chord}-${key}-${mode}`;
  if (generatedChords.has(mapKey) && Math.random() < 0.6) {
    melodyLine = melodyLine.concat(generatedChords.get(mapKey));
    return Promise.resolve(true);
  } else {
    return generateChord(chord, key, mode).then(melody => {
      melodyLine = melodyLine.concat(melody);
      generatedChords.set(mapKey, melody);
    });
  }
}

let releasePrev,
  timeStep = 0;
function playNext(time) {
  if (timeStep++ % STEPS_PER_CHORD === STEPS_PER_CHORD - 5) {
    generateNext(time);
  }
  if (melodyLine.length === 0) {
    return;
  }
  let { fromChord, note, indexInChord } = melodyLine.shift();
  if (note !== -2 && note !== -1) {
    if (releasePrev) {
      releasePrev(time);
      releasePrev = null;
    }
    releasePrev = playNote(note, time);
  } else if (note === -1 && releasePrev) {
    releasePrev(time);
    releasePrev = null;
  }
  if (indexInChord === 0 || indexInChord === STEPS_PER_CHORD - 2) {
    let scale = buildScale(fromChord.key, fromChord.mode);
    let root = new Tone.Frequency(
      scale[fromChord.chordDegree] % 12 + 12,
      'midi'
    ).toNote();
    playBass(root, time, indexInChord === 0);
  }
}

function playNote(note, time) {
  if (musicOutput === 'internal') {
    playInternal(note, time);
  } else {
    playMIDI(note, time);
  }
}

function playBass(note, time, upBeat) {
  if (musicOutput === 'internal') {
    playInternalBass(note, time, upBeat);
  } else {
    playMIDIBass(note, time, upBeat);
  }
}

function playInternal(note, time) {
  let freq = Tone.Frequency(note, 'midi');
  let echoed = Math.random() < 0.05;
  let smplr = echoed ? echoedSampler : sampler;
  smplr.triggerAttack(freq, time);
  if (echoed) {
    for (let i = 0; i < 10; i++) {
      let t = time + Tone.Time('16n').toSeconds() * i;
      let amt = 1 / (i + 1);
      Tone.Draw.schedule(() => visualizePlay(note, amt), t);
    }
  } else {
    Tone.Draw.schedule(() => visualizePlay(note, 1), time);
  }
  return t => smplr.triggerRelease(freq, t);
}

function playInternalBass(note, time, upBeat) {
  if (upBeat) {
    bassSampler.triggerAttack(note, time);
  } else {
    bassLowSampler.triggerAttack(note, time);
  }
}

function playMIDI(note, time) {
  let delay = time - Tone.now();
  let playAt = delay > 0 ? `+${delay * 1000}` : undefined;
  let velocity = 0.8;
  currentMIDIOutput.playNote(note, 1, { velocity, time: playAt });
  Tone.Draw.schedule(() => visualizePlay(note, 1), time);
  return releaseTime => {
    let releaseDelay = releaseTime - Tone.now();
    let releaseAt = releaseDelay > 0 ? `+${releaseDelay * 1000}` : undefined;
    currentMIDIOutput.stopNote(note, 1, { time: releaseAt });
  };
}

function playMIDIBass(note, time, upBeat) {
  let delay = time - Tone.now();
  let playAt = delay > 0 ? `+${delay * 1000}` : undefined;
  let velocity = upBeat ? 0.8 : 0.6;
  let steps = upBeat ? STEPS_PER_CHORD - 2 : 2;
  let duration = steps * Tone.Time('16n').toSeconds() * 1000;
  if (currentMIDIOutput) {
    currentMIDIOutput.playNote(note, 2, { velocity, duration, time: playAt });
  }
}

let vis = document.querySelector('#vis');
let keyButtons = Array.from(document.querySelectorAll('.key'));
let modeButtons = Array.from(document.querySelectorAll('.mode'));
let outputMenu = document.querySelector('#output');

WebMidi.enable(function(err) {
  if (!err) {
    function syncOutputs() {
      let prevOptions = Array.from(outputMenu.querySelectorAll('option'));
      prevOptions.forEach(option => {
        if (
          option.value !== 'internal' &&
          !_.find(WebMidi.outputs, { id: option.value })
        ) {
          option.remove();
          if (musicOutput === option.value) {
            musicOutput = 'internal';
          }
        }
      });
      WebMidi.outputs.forEach(output => {
        if (!_.find(prevOptions, o => o.value === output.id)) {
          let option = document.createElement('option');
          option.value = output.id;
          option.textContent = `MIDI: ${output.name}`;
          outputMenu.appendChild(option);
        }
      });
    }
    syncOutputs();
    setInterval(syncOutputs, 5000);

    outputMenu.addEventListener('change', () => {
      musicOutput = outputMenu.value;
      if (musicOutput !== 'internal') {
        currentMIDIOutput = WebMidi.getOutputById(musicOutput);
      } else {
        currentMIDIOutput = null;
      }
    });
  }
});

let noteEls = _.range(MIN_NOTE, MAX_NOTE).map(note => {
  let el = document.createElement('note');
  el.classList.add('note');
  vis.appendChild(el);
  return el;
});

function visualizePlay(note, amount) {
  let noteIdx = note - MIN_NOTE;
  if (noteIdx >= 0 && noteIdx < noteEls.length) {
    let noteEl = noteEls[noteIdx];
    let playEl = document.createElement('div');
    let routeLength = vis.offsetHeight + 20;
    playEl.classList.add('play');
    playEl.style.opacity = amount;
    noteEl.appendChild(playEl);
    let pathAnimation = playEl.animate(
      [
        { transform: 'translateY(0)' },
        { transform: `translateY(-${routeLength}px)` }
      ],
      {
        duration: 60000,
        easing: 'linear'
      }
    );
    pathAnimation.onfinish = () => playEl.remove();
    playEl.animate([{ opacity: amount }, { opacity: 0 }], {
      duration: 60000,
      easing: 'ease-in',
      fill: 'forwards'
    });
  }
}

function setCurrentKeyInUI(key) {
  let keyNote = Tone.Frequency(key, 'midi').toNote();
  keyButtons.forEach(
    b =>
      b.value === keyNote
        ? b.classList.add('current')
        : b.classList.remove('current')
  );
  document.body.className = `key-${KEYS.indexOf(keyNote)}`;
}

function setCurrentModeInUI(mode) {
  let modeIndex = '' + MODES.indexOf(mode);
  modeButtons.forEach(
    b =>
      b.value === modeIndex
        ? b.classList.add('current')
        : b.classList.remove('current')
  );
}

keyButtons.forEach(keyButton =>
  keyButton.addEventListener('click', evt => {
    keyButton.classList.add('pending');
    pendingActions.push({
      type: 'keyChange',
      key: Tone.Frequency(evt.target.value).toMidi(),
      onDone: () => keyButton.classList.remove('pending')
    });
  })
);
modeButtons.forEach(modeButton =>
  modeButton.addEventListener('click', evt => {
    modeButton.classList.add('pending'),
      pendingActions.push({
        type: 'modeChange',
        mode: MODES[+evt.target.value],
        onDone: () => modeButton.classList.remove('pending')
      });
  })
);

let keyNote = Tone.Frequency(key, 'midi').toNote();
let modeIndex = '' + MODES.indexOf(mode);
keyButtons.find(k => k.value === keyNote).classList.add('current');
modeButtons.find(m => m.value === '' + modeIndex).classList.add('current');
document.body.className = `key-${KEYS.indexOf(keyNote)}`;

let bufferLoadPromise = new Promise(res => Tone.Buffer.on('load', res));
Promise.all([rnn.initialize(), bufferLoadPromise]).then(() => {
  document.querySelector('#loading').remove();
  generateNext(Tone.now());
  Tone.Transport.scheduleRepeat(playNext, '16n', '8n');
  Tone.Transport.start();
});
StartAudioContext(Tone.context, '#ui');
