import { useCallback, useEffect, useRef, useState } from 'react';

function combineText(transcript, interim) {
  if (!interim) return transcript;
  if (!transcript) return interim;
  return `${transcript} ${interim}`.replace(/\s+/g, ' ').trim();
}

export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined'
    && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

/**
 * Browser speech-to-text — same approach as the original Voice Dump.
 * Words appear live in the text field while you speak.
 */
export default function useSpeechToText() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const wantListeningRef = useRef(false);
  const transcriptRef = useRef('');
  const interimRef = useRef('');
  const supported = isSpeechRecognitionSupported();

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    interimRef.current = interim;
  }, [interim]);

  useEffect(() => {
    if (!supported) return undefined;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text;
        else interimText += text;
      }

      if (finalText) {
        const next = combineText(transcriptRef.current, finalText);
        transcriptRef.current = next;
        setTranscript(next);
      }
      interimRef.current = interimText;
      setInterim(interimText);
      setError(null);
    };

    recognition.onerror = (event) => {
      const code = event?.error;
      if (code === 'aborted' || code === 'no-speech') return;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        wantListeningRef.current = false;
        setListening(false);
        setError('Microphone permission blocked. Allow mic access for this site and try again.');
        return;
      }
      // Keep listening intent for transient errors; onend may restart.
    };

    recognition.onend = () => {
      // Commit any leftover interim text.
      if (interimRef.current.trim()) {
        const next = combineText(transcriptRef.current, interimRef.current);
        transcriptRef.current = next;
        setTranscript(next);
        interimRef.current = '';
        setInterim('');
      }

      if (!wantListeningRef.current) {
        setListening(false);
        return;
      }

      // Chrome often ends sessions after a pause — restart until user stops.
      try {
        recognition.start();
        setListening(true);
      } catch {
        window.setTimeout(() => {
          if (!wantListeningRef.current) return;
          try {
            recognition.start();
            setListening(true);
          } catch {
            wantListeningRef.current = false;
            setListening(false);
          }
        }, 200);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      wantListeningRef.current = false;
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [supported]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    setListening(false);
    if (interimRef.current.trim()) {
      const next = combineText(transcriptRef.current, interimRef.current);
      transcriptRef.current = next;
      setTranscript(next);
      interimRef.current = '';
      setInterim('');
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const start = useCallback(() => {
    if (!supported || !recognitionRef.current) {
      setError('Voice input needs Chrome or Safari. You can still type your answer.');
      return;
    }
    setError(null);
    wantListeningRef.current = true;
    setListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      // Already started
    }
  }, [supported]);

  const toggle = useCallback(() => {
    if (!supported) {
      setError('Voice input needs Chrome or Safari. You can still type your answer.');
      return;
    }
    if (wantListeningRef.current || listening) stop();
    else start();
  }, [supported, listening, start, stop]);

  const reset = useCallback(() => {
    transcriptRef.current = '';
    interimRef.current = '';
    setTranscript('');
    setInterim('');
    setError(null);
  }, []);

  const setText = useCallback((value) => {
    const next = value ?? '';
    transcriptRef.current = next;
    interimRef.current = '';
    setTranscript(next);
    setInterim('');
  }, []);

  return {
    supported,
    listening,
    transcribing: false,
    elapsedSec: 0,
    transcript,
    interim,
    displayText: combineText(transcript, interim),
    error,
    start,
    stop,
    toggle,
    reset,
    setText,
  };
}
