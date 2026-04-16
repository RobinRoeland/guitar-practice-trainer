import { useState, useEffect, useRef } from "react";
import usePitchDetection from "../hooks/usePitchDetection";
import "./ChordTrainer.css";

const CHORDS = {
  C: ["C", "E", "G"],
  G: ["G", "B", "D"],
  D: ["D", "F#", "A"],
  A: ["A", "C#", "E"],
  E: ["E", "G#", "B"],
  Am: ["A", "C", "E"],
  Em: ["E", "G", "B"],
  Dm: ["D", "F", "A"],
};

function getRandomChord() {
  return CHORDS[Math.floor(Math.random() * CHORDS.length)];
}

function playChordSound(chord) {
  const audio = new Audio(`/sounds/${chord}.mp3`);
  audio.currentTime = 0; // restart if spammed
  audio.play().catch(() => {
    // avoids crash if browser blocks autoplay
  });
}

export default function ChordTrainer() {
  const [currentChord, setCurrentChord] = useState("C");

  const detectedNote = usePitchDetection();
  const detectedNotesRef = useRef(new Set());

  function isChordCorrect(chordName) {
    const requiredNotes = CHORDS[chordName];
    const playedNotes = detectedNotesRef.current;

    return requiredNotes.every((note) => playedNotes.has(note));
  }

  const getNextChord = () => {
    let next = getRandomChord();

    while (next === currentChord) {
      next = getRandomChord();
    }

    return next;
  };

  const handleNextChord = () => {
    const next = getNextChord();
    setCurrentChord(getNextChord());
    playChordSound(next);
  };

  useEffect(() => {
    if (detectedNote) {
      detectedNotesRef.current.add(detectedNote);
      console.log("Detected:", detectedNote);
    }
  }, [detectedNote]);

  return (
    <div className="trainer-container">
      <h1 className="trainer-title">Chord Trainer</h1>

      <div className="chord-card">
        <span className="chord-text">{currentChord}</span>
      </div>

      <img
        className="chord-image"
        src={`/chords/${currentChord}.png`}
        alt={`${currentChord} chord`}
      />

      <button
        className="check-button"
        onClick={() => {
            if (isChordCorrect(currentChord)) {
            alert("✅ Correct!");
            handleNextChord();
            } else {
            alert("❌ Try again");
            }

            detectedNotesRef.current.clear(); // reset for next attempt
        }}
        >
        Check Chord
      </button>

      <div>
        Detected Notes: {[...detectedNotesRef.current].join(", ")}
      </div>
    </div>
  );
}