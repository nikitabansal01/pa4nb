import OpenAI from 'openai';
import { toFile } from 'openai';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Whisper limit

export function isSpeechToTextConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Transcribe an audio buffer with OpenAI Whisper.
 * @param {{ buffer: Buffer, mimeType?: string, fileName?: string }} input
 */
export async function transcribeAudioBuffer({ buffer, mimeType = 'audio/webm', fileName = 'speech.webm' }) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error(
      'Voice transcription needs OPENAI_API_KEY on the server. Add it to .env and restart, or type your answer.'
    );
    error.status = 503;
    throw error;
  }

  if (!buffer?.length) {
    const error = new Error('No audio received. Hold the mic a moment longer and try again.');
    error.status = 400;
    throw error;
  }

  if (buffer.length > MAX_AUDIO_BYTES) {
    const error = new Error('Recording is too long. Try a shorter clip.');
    error.status = 400;
    throw error;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const file = await toFile(buffer, fileName, { type: mimeType });

  const result = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'en',
  });

  const text = String(result?.text || '').trim();
  return {
    text,
    mode: 'whisper',
  };
}
