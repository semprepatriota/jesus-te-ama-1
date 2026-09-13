import { fail } from './policy.js';

export function audioDuration(audio) {
  const duration = audio?.end - Math.max(0, audio?.start);
  if (!Number.isFinite(duration) || duration <= 0) fail('NO_AUDIO', 'Nenhum intervalo de audio utilizavel foi encontrado.');
  return duration;
}

export function validAudioDuration(actual, expected) {
  return Number.isFinite(actual) && actual > 0 && Math.abs(actual - expected) <= .25;
}
