import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, Send } from 'lucide-react';

const AREA_HINTS = {
  overview: 'life balance, how an area feels, or job search updates',
  compass: 'thoughts on work and life meaning, or job search updates',
  work: 'interviews, applications, status changes, and next steps',
  health: 'energy, sleep, exercise, or job search updates',
  play: 'what brings you joy, or job search updates',
  love: 'relationships and connection, or job search updates',
};

export default function VoiceDump({ onSubmit, processing, currentArea = 'overview' }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef(null);
  const supported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const hint = AREA_HINTS[currentArea] || AREA_HINTS.overview;

  useEffect(() => {
    if (!supported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text;
        else interimText += text;
      }

      if (finalText) setTranscript((prev) => `${prev} ${finalText}`.trim());
      setInterim(interimText);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    return () => recognition.stop();
  }, [supported]);

  const toggleListening = () => {
    if (!supported || processing) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      setInterim('');
    } else {
      recognitionRef.current?.start();
      setListening(true);
    }
  };

  const handleSubmit = async () => {
    const text = `${transcript} ${interim}`.trim();
    if (!text || processing) return;
    if (listening) recognitionRef.current?.stop();
    setListening(false);
    setInterim('');
    await onSubmit(text);
    setTranscript('');
  };

  const displayText = `${transcript} ${interim}`.trim();
  const placeholder = listening
    ? 'Listening… keep talking'
    : supported
      ? 'Type or tap the mic — interviews, check-ins, reflections…'
      : 'Type your update (voice needs Chrome or Safari)';

  return (
    <section className="voice-panel voice-panel--global">
      <div className="voice-panel__header">
        <Sparkles size={20} />
        <div>
          <h2>Voice update</h2>
          <p>
            Ramble about {hint}. Job-related updates sync to your pipeline.
          </p>
        </div>
      </div>

      <div className={`voice-compose ${listening ? 'voice-compose--live' : ''}`}>
        <textarea
          className="voice-compose__input"
          placeholder={placeholder}
          value={displayText}
          onChange={(e) => {
            setTranscript(e.target.value);
            setInterim('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          rows={2}
          disabled={processing}
          aria-label="Your update"
        />

        <div className="voice-compose__actions">
          {supported && (
            <button
              type="button"
              className={`voice-compose__mic ${listening ? 'voice-compose__mic--active' : ''}`}
              onClick={toggleListening}
              disabled={processing}
              aria-label={listening ? 'Stop recording' : 'Start recording'}
              aria-pressed={listening}
            >
              {listening ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
            </button>
          )}

          <button
            type="button"
            className="voice-compose__send"
            onClick={handleSubmit}
            disabled={!displayText || processing}
            aria-label={processing ? 'Processing update' : 'Send update'}
          >
            {processing ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </section>
  );
}
