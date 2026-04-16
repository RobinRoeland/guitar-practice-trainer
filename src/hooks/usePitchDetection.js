import { useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";

export default function usePitchDetection() {
  const [note, setNote] = useState(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    let analyser, detector, dataArray;

    async function init() {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      source.connect(analyser);

      const bufferLength = analyser.fftSize;
      dataArray = new Float32Array(bufferLength);

      detector = PitchDetector.forFloat32Array(bufferLength);

      const detect = () => {
        analyser.getFloatTimeDomainData(dataArray);

        const [pitch, clarity] = detector.findPitch(
          dataArray,
          audioContext.sampleRate
        );

        if (clarity > 0.9 && pitch) {
          const noteName = getNoteFromFrequency(pitch);
          setNote(noteName);
        }

        requestAnimationFrame(detect);
      };

      detect();
    }

    init();

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  return note;
}

// 🎵 Convert frequency → note
function getNoteFromFrequency(freq) {
  const A4 = 440;
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  const n = Math.round(12 * Math.log2(freq / A4)) + 69;
  return notes[n % 12];
}