import React, { useState, useRef } from 'react';
import { Image, Video, Mic, Play, Pause, X, Upload, Loader2, FileAudio, ZoomIn } from 'lucide-react';

export interface Adjunto {
  id: string;
  nombre: string;
  tipo: 'imagen' | 'video' | 'audio';
  url: string;
  tamano: string;
}

interface Props {
  adjuntos: Adjunto[];
  onChange: (adjuntos: Adjunto[]) => void;
  maxFiles?: number;
  readOnly?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(s: number): string {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function MultimediaUpload({
  adjuntos,
  onChange,
  maxFiles = 5,
  readOnly = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxNombre, setLightboxNombre] = useState<string>('');

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const slots = maxFiles - adjuntos.length;
    if (slots <= 0) return;

    setUploading(true);
    try {
      const nuevos: Adjunto[] = [];
      for (const file of files.slice(0, slots)) {
        const url = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = (ev) => res(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
        const tipo: Adjunto['tipo'] = file.type.startsWith('image/')
          ? 'imagen'
          : file.type.startsWith('video/')
          ? 'video'
          : 'audio';
        nuevos.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          nombre: file.name,
          tipo,
          url,
          tamano: formatSize(file.size),
        });
      }
      onChange([...adjuntos, ...nuevos]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        onChange([
          ...adjuntos,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            nombre: `Nota de voz ${hora}`,
            tipo: 'audio',
            url,
            tamano: formatSize(blob.size),
          },
        ]);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      alert('No se pudo acceder al micrófono. Verificá los permisos del navegador.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleRemove = (id: string) => {
    // Stop audio if playing
    const audio = audioMapRef.current.get(id);
    if (audio) { audio.pause(); audioMapRef.current.delete(id); }
    if (playingId === id) setPlayingId(null);
    onChange(adjuntos.filter((a) => a.id !== id));
  };

  const handleTogglePlay = (adj: Adjunto) => {
    let audio = audioMapRef.current.get(adj.id);
    if (!audio) {
      audio = new Audio(adj.url);
      audio.onended = () => setPlayingId(null);
      audioMapRef.current.set(adj.id, audio);
    }
    if (playingId === adj.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      if (playingId) audioMapRef.current.get(playingId)?.pause();
      audio.play().catch(() => {});
      setPlayingId(adj.id);
    }
  };

  const canAddMore = adjuntos.length < maxFiles;

  const typeIcon = (tipo: Adjunto['tipo']) => {
    if (tipo === 'imagen') return <Image size={14} className="text-blue-500" />;
    if (tipo === 'video') return <Video size={14} className="text-purple-500" />;
    return <FileAudio size={14} className="text-green-500" />;
  };

  return (
    <div className="space-y-3">
      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center gap-3"
            onClick={e => e.stopPropagation()}
          >
            {/* Botón cerrar anclado al contenedor, no al viewport */}
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors shadow-lg"
              aria-label="Cerrar visor"
            >
              <X size={20} />
            </button>
            <img
              src={lightboxUrl}
              alt={lightboxNombre}
              className="max-w-full max-h-[82vh] object-contain rounded-lg shadow-2xl"
            />
            {lightboxNombre && (
              <p className="text-white/70 text-sm truncate max-w-xs">{lightboxNombre}</p>
            )}
          </div>
        </div>
      )}

      {/* Lista de adjuntos */}
      {adjuntos.length > 0 && (
        <div className="space-y-2">
          {adjuntos.map((adj) => (
            <div
              key={adj.id}
              className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              {/* Miniatura / botón play */}
              {adj.tipo === 'imagen' && (
                <button
                  type="button"
                  onClick={() => { setLightboxUrl(adj.url); setLightboxNombre(adj.nombre); }}
                  className="relative w-12 h-10 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-600 shrink-0 group cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  title="Ver imagen ampliada"
                >
                  <img src={adj.url} alt={adj.nombre} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <ZoomIn size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              )}
              {adj.tipo === 'video' && (
                <div className="w-12 h-10 rounded-md bg-gray-800 shrink-0 flex items-center justify-center">
                  <Video size={18} className="text-gray-300" />
                </div>
              )}
              {adj.tipo === 'audio' && (
                <button
                  type="button"
                  onClick={() => handleTogglePlay(adj)}
                  className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                >
                  {playingId === adj.id ? (
                    <Pause size={15} className="text-green-600 dark:text-green-400" />
                  ) : (
                    <Play size={15} className="text-green-600 dark:text-green-400 ml-0.5" />
                  )}
                </button>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {typeIcon(adj.tipo)}
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{adj.nombre}</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                  {adj.tipo} · {adj.tamano}
                </p>
              </div>

              {/* Eliminar */}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemove(adj.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botones de carga (solo si no es readOnly) */}
      {!readOnly && canAddMore && (
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Imagen / Video / Audio */}
          <button
            type="button"
            disabled={uploading || isRecording}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-[#00a6d6] hover:text-[#00a6d6] dark:text-gray-300 dark:hover:border-[#00a6d6] dark:hover:text-[#00a6d6] transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            Imagen / Video
          </button>

          {/* Nota de voz */}
          {!isRecording ? (
            <button
              type="button"
              disabled={uploading}
              onClick={handleStartRecording}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-[#00a6d6] hover:text-[#00a6d6] dark:text-gray-300 dark:hover:border-[#00a6d6] dark:hover:text-[#00a6d6] transition-colors disabled:opacity-50"
            >
              <Mic size={14} />
              Nota de voz
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopRecording}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-red-400 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 animate-pulse"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-none" />
              Grabando {formatTime(recordingTime)} — Detener
            </button>
          )}
        </div>
      )}

      {adjuntos.length === 0 && readOnly && (
        <p className="text-xs text-gray-400 dark:text-gray-500 italic">Sin archivos adjuntos.</p>
      )}

      {!readOnly && adjuntos.length >= maxFiles && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Límite alcanzado ({maxFiles} archivos máximo).
        </p>
      )}
    </div>
  );
}