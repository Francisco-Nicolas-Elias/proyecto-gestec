// Verifica el contenido real de un archivo subido mirando sus primeros bytes ("firma" del formato),
// en vez de confiar solo en el tipo que declara el navegador, que cualquiera puede falsificar.

const ascii = (buf: Buffer, desde: number, hasta: number) => buf.subarray(desde, hasta).toString('latin1');

/**
 * Devuelve los tipos MIME compatibles con el contenido del archivo, o null si el formato no es
 * ninguno de los permitidos (imagen JPEG/PNG/GIF/WebP, video MP4/MOV/WebM, audio MP3/WAV/OGG/WebM).
 */
export function tiposCompatibles(buf: Buffer): string[] | null {
  if (buf.length < 12) return null;

  // Imágenes
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return ['image/jpeg'];
  if (buf[0] === 0x89 && ascii(buf, 1, 4) === 'PNG' && buf[4] === 0x0d && buf[5] === 0x0a) return ['image/png'];
  if (ascii(buf, 0, 4) === 'GIF8') return ['image/gif'];

  // Contenedor RIFF: WebP (imagen) o WAV (audio)
  if (ascii(buf, 0, 4) === 'RIFF') {
    const formato = ascii(buf, 8, 12);
    if (formato === 'WEBP') return ['image/webp'];
    if (formato === 'WAVE') return ['audio/wav'];
    return null;
  }

  // Audio
  if (ascii(buf, 0, 4) === 'OggS') return ['audio/ogg'];
  if (ascii(buf, 0, 3) === 'ID3') return ['audio/mpeg'];
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return ['audio/mpeg']; // MP3 sin etiqueta ID3

  // WebM (Matroska/EBML): el mismo contenedor sirve para video y para audio grabado
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return ['video/webm', 'audio/webm'];

  // MP4 / MOV (ISO base media): "ftyp" en los bytes 4 a 8, y la marca indica si es QuickTime
  if (ascii(buf, 4, 8) === 'ftyp') return ascii(buf, 8, 12) === 'qt  ' ? ['video/quicktime'] : ['video/mp4'];

  return null;
}

const EXTENSION_POR_TIPO: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/webm': '.webm',
};

/** Extensión segura según el tipo ya verificado (nunca la del nombre que mandó el usuario). */
export function extensionPara(tipo: string): string {
  return EXTENSION_POR_TIPO[tipo] ?? '.bin';
}
