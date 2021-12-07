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
      console.log(chords);
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
  