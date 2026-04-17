import { useState, useEffect, useRef } from "react";
import usePitchDetection from "../hooks/usePitchDetection";
import * as Tone from "tone";
import "./ChordTrainer.css";

const CHORDS = {
  C: ["C4", "E4", "G4"],
  G: ["G3", "B3", "D4"],
  D: ["D4", "F#4", "A4"],
  A: ["A3", "C#4", "E4"],
  E: ["E3", "G#3", "B3"],
  Am: ["A3", "C4", "E4"],
  Em: ["E3", "G3", "B3"],
  Dm: ["D4", "F4", "A4"],
};

const CHORD_SHAPES = {
  C: ["x", 3, 2, 0, 1, 0],
  G: [3, 2, 0, 0, 0, 3],
  D: ["x", "x", 0, 2, 3, 2],
  A: ["x", 0, 2, 2, 2, 0],
  E: [0, 2, 2, 1, 0, 0],
  Am: ["x", 0, 2, 2, 1, 0],
  Em: [0, 2, 2, 0, 0, 0],
  Dm: ["x", "x", 0, 2, 3, 1],
};

function ChordDiagram({ positions = [] }) {
  const strings = 6;
  const frets = 5;

  return (
    <div className="fretboard">
      {Array.from({ length: frets }).map((_, fretIndex) => (
        <div key={fretIndex} className="fret-row">
          {positions.map((pos, stringIndex) => {
            const isDot = pos === fretIndex + 1;

            return (
              <div key={stringIndex} className="string-cell">
                {isDot && <div className="dot" />}
                {pos === 0 && fretIndex === 0 && (
                  <div className="open">○</div>
                )}
                {pos === "x" && fretIndex === 0 && (
                  <div className="mute">x</div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function updateProgress(chord, correct) {
  const stats = JSON.parse(localStorage.getItem("progress")) || {};

  if (!stats[chord]) {
    stats[chord] = { attempts: 0, correct: 0 };
  }

  stats[chord].attempts += 1;
  if (correct) stats[chord].correct += 1;

  localStorage.setItem("progress", JSON.stringify(stats));
}

function getAccuracy(chord) {
  const stats = JSON.parse(localStorage.getItem("progress")) || {};
  if (!stats[chord]) return 0;

  return Math.round((stats[chord].correct / stats[chord].attempts) * 100);
}

function getRandomChord() {
  const keys = Object.keys(CHORDS);

  return keys[Math.floor(Math.random() * keys.length)];
}

function playChordSound(chord) {
  
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
      type: "triangle" // softer waveform
    },
    envelope: {
      attack: 0.02,   // slightly slower attack (finger pluck feel)
      decay: 0.4,
      sustain: 0.2,
      release: 1.2
    }
  }).toDestination();
  
  const filter = new Tone.Filter(1200, "lowpass").toDestination();
  synth.connect(filter);

  const reverb = new Tone.Reverb({
    decay: 2,
    wet: 0.3
  }).toDestination();
  synth.connect(reverb);

  function playChord(notes) {
    synth.triggerAttackRelease(notes, "2n");
  }

  synth.currentTime = 0; // restart if spammed
  playChord(CHORDS[chord]);
  console.log(`Playing chord: ${chord} - Notes: ${CHORDS[chord].join(", ")}`);
}

export default function ChordTrainer() {
  const [currentChord, setCurrentChord] = useState("C");

  const detectedNote = usePitchDetection();
  const detectedNotesRef = useRef(new Set());
  const evaluationTimeout = useRef(null);

  function isChordCorrect(chordName) {
    const requiredNotes = CHORDS[chordName];
    const playedNotes = detectedNotesRef.current;

    return requiredNotes.every((note) => playedNotes.has(note));
  }

  const getNextChord = (current) => {
    let next = getRandomChord();

    while (next === current) {
      next = getRandomChord();
    }

    return next;
  };

  function isChordCorrect(chordName, playedNotesSet) {
    const requiredNotes = CHORDS[chordName];

    return requiredNotes.every((note) =>
      playedNotesSet.has(note)
    );
  }
  
  const handleNextChord = () => {
    const nextChord = getNextChord(currentChord);
    setCurrentChord(nextChord);
    playChordSound(nextChord);
  };

  function evaluateChord() {
    const isCorrect = isChordCorrect(currentChord, detectedNotesRef.current);

    updateProgress(currentChord, isCorrect);

    setSession((prev) => {
      const nextCurrent = prev.current + 1;

      const isLast = nextCurrent >= prev.total;

      if (isLast) {
        alert(`Session done! Score: ${prev.correct + (isCorrect ? 1 : 0)}/${prev.total}`);
        resetSession();
      } else {
        handleNextChord();
      }

      return {
        ...prev,
        current: nextCurrent,
        correct: isCorrect ? prev.correct + 1 : prev.correct,
      };
    });

    detectedNotesRef.current.clear();
  }

  const [session, setSession] = useState({
    total: 5,
    current: 1,
    correct: 0,
  });
  
  function resetSession() {
    setSession({
      total: 5,
      current: 1,
      correct: 0,
    });
  }

  const noteBuffer = useRef([]);
  useEffect(() => {
    if (!detectedNote) return;

    detectedNotesRef.current.add(detectedNote);

    // reset debounce timer
    clearTimeout(evaluationTimeout.current);

    evaluationTimeout.current = setTimeout(() => {
      evaluateChord();
    }, 600); // 0.6s stability window
  }, [detectedNote]);
  
  return (
    <div className="trainer-container">
      <h1 className="trainer-title">Chord Trainer</h1>

      <div className="chord-card">
        <span className="chord-text">{currentChord}</span>
      </div>

      <ChordDiagram positions={CHORD_SHAPES[currentChord]} />

      <button
        className="next-button"
        onClick={() => {  
          handleNextChord();
          detectedNotesRef.current.clear(); // reset for next attempt
        }}
        >
        Next Chord
      </button>

      <div>
        Detected Notes: {[...detectedNotesRef.current].join(", ")}
      </div>

      <div className="accuracy">
        Accuracy: {getAccuracy(currentChord)}%
      </div>
    </div>
  );
}