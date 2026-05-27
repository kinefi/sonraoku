import { useState, useEffect, useCallback } from 'react';
import * as Speech from 'expo-speech';
import { stripTags } from '@/lib/utils';

export function useArticleSpeech(htmlContent: string | null, lang: string | null) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const stopSpeech = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  const toggleSpeech = useCallback(() => {
    if (isSpeaking) {
      stopSpeech();
      return;
    }

    if (!htmlContent) return;

    const plainText = stripTags(htmlContent);
    if (!plainText) return;

    setIsSpeaking(true);
    Speech.speak(plainText, {
      language: lang || 'tr',
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [isSpeaking, htmlContent, lang, stopSpeech]);

  useEffect(() => {
    return () => { Speech.stop(); };
  }, []);

  return { isSpeaking, toggleSpeech, stopSpeech };
}