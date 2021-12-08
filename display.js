// Menu Setup Part 1
const NS1Button = document.getElementById('preloadedNS')
const NS2Button = document.getElementById('customNS')
const NSOptions = document.getElementById('preloadedOptions')
const pianoContainer = document.getElementById('pianoContainer')

NS1Button.onclick = () => { 
    console.log("show options");
    pianoContainer.setAttribute("hidden", "");
    NSOptions.removeAttribute("hidden"); }

NS2Button.onclick = () => { 
    console.log("show piano");
    NSOptions.setAttribute("hidden", "");
    pianoContainer.removeAttribute("hidden"); }

//Menu Setup Part 2

const inputChordsButton = document.getElementById('inputChords')
const noChordsButton = document.getElementById('noChords')
const chordSelector = document.getElementById('chordSelector')
const noChordSelector = document.getElementById('noChordsSelector')

noChordsButton.onclick = () => { 
    console.log("hide chords");
    chordSelector.setAttribute("hidden", "");
    noChordSelector.removeAttribute("hidden");}

inputChordsButton.onclick = () => { 
    console.log("show chords");
    chordSelector.removeAttribute("hidden");
    noChordSelector.setAttribute("hidden", "");}