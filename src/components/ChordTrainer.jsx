import React, { useState, useEffect, useRef } from "react";
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
  const INLAYS = [3, 5, 7, 9, 12];
  const STRING_COUNT = 6;
  const FRET_COUNT = 5; // show up to 5th fret

  const BOARD_WIDTH = 320;
  const BOARD_HEIGHT = 160;
  const PADDING_X = 24;
  const PADDING_Y = 16;
  

  const INNER_WIDTH = BOARD_WIDTH - PADDING_X * 2;
  const INNER_HEIGHT = BOARD_HEIGHT - PADDING_Y * 2;

  const STRING_GAP = INNER_WIDTH / (STRING_COUNT - 1);
  const FRET_GAP = INNER_HEIGHT / (FRET_COUNT - 1);

  const stringWidths = [3.5, 3, 2.5, 2, 1.8, 1.5]; // low → high E

  return (
    <div
      className="fretboard"
      style={{
        position: "relative",
        width: `${BOARD_WIDTH}px`,
        height: `${BOARD_HEIGHT}px`,
        overflow: "hidden",
        padding: `${PADDING_Y}px ${PADDING_X}px`,
        boxSizing: "border-box",
      }}
    >
      {/* 1. STRINGS */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          className="string-line"
          key={i}
          style={{
            position: "absolute",
            left: `${PADDING_X + i * STRING_GAP}px`,
            top: PADDING_Y,
            bottom: PADDING_Y,
            width: `${stringWidths[i]}px`,
            borderRadius: "2px",
            transform: "translateX(-50%)",
          }}
        />
      ))}

      {/* Open Strings and Don't Play */}
      {positions.map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${PADDING_X + i * STRING_GAP}px`,
            top: `${PADDING_Y - 12}px`,
            transform: "translateX(-50%)",
            fontSize: "12px",
            color: pos === "x" ? "#ff0000" : "#fff",
            fontFamily: "monospace",
          }}
        >
          {pos === "x" ? "x" : pos === 0 ? "0" : ""}
        </div>
      ))}

      {/* Fret Numbers */}
      {Array.from({ length: FRET_COUNT }).map((_, fret) => (
        <div
          key={fret}
          style={{
            position: "absolute",
            top: `${PADDING_Y + fret * FRET_GAP}px`,
            right: `${BOARD_WIDTH - 14}px`,
            transform: "translateY(-50%)",
            fontSize: "11px",
            color: "#888",
            fontFamily: "monospace",
          }}
        >
          {fret}
        </div>
      ))}

      {/* 2. FRETS */}
      {Array.from({ length: FRET_COUNT }).map((_, fret) => (
        <div
          key={fret}
          style={{
            position: "absolute",
            top: `${PADDING_Y + fret * FRET_GAP}px`,
            left: PADDING_X,
            right: PADDING_X,
            height: "1px",
            background: "#777",
          }}
        />
      ))}

      {/* 3. NOTES (chord dots) */}
      {positions.map((pos, stringIndex) => {
        if (pos === "x" || pos === 0) return null;

        const fret = Number(pos);

        return (
          <div
            className="note-dot"
            key={stringIndex}
            style={{
              position: "absolute",
              left: `${PADDING_X + stringIndex * STRING_GAP}px`,
              top: `${PADDING_Y + fret * FRET_GAP}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}

      {/* 4. INLAY DOTS */}
      {INLAYS.map((fret) => {
        const isDouble = fret === 12;

        return (
          <div
            key={fret}
            style={{
              position: "absolute",
              left: PADDING_X,
              right: PADDING_X,
              top: `${PADDING_Y + fret * FRET_GAP}px`,
              display: "flex",
              justifyContent: "center",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            {!isDouble ? (
              <div className="inlay-dot" />
            ) : (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div className="inlay-dot" />
                <div className="inlay-dot" />
              </div>
            )}
          </div>
        );
      })}
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

  function setNewChord(nextChord) {
    setCurrentChord(nextChord);
    playChordSound(nextChord);
    detectedNotesRef.current.clear();
  }

  const handleNextChord = () => {
    const nextChord = getNextChord(currentChord);
    setNewChord(nextChord);
    console.log("Chord:", nextChord);
    console.log("Positions:", CHORD_SHAPES[nextChord]);
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