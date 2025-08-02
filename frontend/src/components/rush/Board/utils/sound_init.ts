import sound from '../../chessground/units/sound';

interface SoundOptions {
  volumeFactor?: number;
  soundTheme?: string;
  siteObj?: any;
}

/**
 * Явно инициализирует звуки на window.site.
 * Не делает ничего при простом импорте — надо вызвать.
 */
export function configureSiteSound(options: SoundOptions = {}) {
  const siteObj = options.siteObj || ((window as any).site = (window as any).site || {});
  siteObj.sound = sound;

  const volumeFactor =
    options.volumeFactor !== undefined
      ? options.volumeFactor
      : parseFloat(localStorage.getItem('app-volume-factor') || '1');
  const soundTheme = options.soundTheme || localStorage.getItem('app-sound-theme') || 'default';

  const soundBase = soundTheme === 'quake3' ? '/sound/quake' : '/sound';

  // если в sound есть метод для установки громкости — вызываем (иначе игнорируем)
  if (typeof siteObj.sound.setVolumeFactor === 'function') {
    siteObj.sound.setVolumeFactor(volumeFactor);
  }

  siteObj.sound.load('error', siteObj.sound.url(`${soundBase}/Error.mp3`));
  siteObj.sound.load('correct', siteObj.sound.url(`${soundBase}/Сorrect.mp3`));
  siteObj.sound.load('move', siteObj.sound.url(`${soundBase}/Move.mp3`));
  siteObj.sound.load('capture', siteObj.sound.url(`${soundBase}/Capture.mp3`));

  return siteObj.sound;
}
