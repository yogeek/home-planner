/** Lecture à voix haute (pour les enfants qui ne lisent pas encore) */
export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string): void {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR';
  u.rate = 0.92;
  u.pitch = 1.1;
  const fr = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('fr'));
  if (fr) u.voice = fr;
  window.speechSynthesis.speak(u);
}
