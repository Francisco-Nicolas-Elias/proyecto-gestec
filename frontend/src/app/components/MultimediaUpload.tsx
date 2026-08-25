import React, { useState, useRef, useEffect } from 'react';
import { Image, Video, Mic, Play, Pause, X, Upload, Loader2, FileAudio, ZoomIn, ZoomOut } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB, igual al límite del backend

export interface Adjunto {
  id: string;
  nombre: string;
  tipo: 'imagen' | 'video' | 'audio';
  url: string;
  tamano: string;
  subidoPor?: string;
  subidoPorRol?: string;
}

interface Props {
  adjuntos: Adjunto[];
  onChange: (adjuntos: Adjunto[]) => void;
  maxFiles?: number;
  readOnly?: boolean;
  /** Nombre del usuario logueado — para permitir borrar solo lo propio */
  currentUserName?: string;
  /** true si el usuario (operaciones/admin) puede borrar adjuntos de cualquiera */
  canManageAll?: boolean;
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
  currentUserName,
  canManageAll = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxNombre, setLightboxNombre] = useState<string>('');
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [videoModalNombre, setVideoModalNombre] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [lightboxUrl]);

  const handleZoomIn = () => setZoom((z) => Math.min(4, z + 0.5));
  const handleZoomOut = () => setZoom((z) => {
    const next = Math.max(1, z - 0.5);
    if (next === 1) setPan({ x: 0, y: 0 });
    return next;
  });
  const handleResetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleWheelZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => {
      const next = Math.min(4, Math.max(1, z - e.deltaY * 0.0015));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStartRef.current.panX + (e.clientX - dragStartRef.current.x),
      y: dragStartRef.current.panY + (e.clientY - dragStartRef.current.y),
    });
  };
  const handleImageMouseUp = () => setDragging(false);
  const handleImageDoubleClick = () => {
    if (zoom > 1) handleResetZoom();
    else setZoom(2);
  };
  const [duraciones, setDuraciones] = useState<Record<string, string>>({});
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  useEffect(() => {
    adjuntos.filter(a => a.tipo === 'audio' && !duraciones[a.id]).forEach(adj => {
      const audio = new Audio(adj.url);
      audio.addEventListener('loadedmetadata', () => {
        if (isFinite(audio.duration)) {
          setDuraciones(prev => ({ ...prev, [adj.id]: formatTime(Math.round(audio.duration)) }));
        }
      });
    });
  }, [adjuntos]);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const slots = maxFiles - adjuntos.length;
    if (slots <= 0) return;

    const tooLarge = files.find(f => f.size > MAX_FILE_SIZE);
    if (tooLarge) {
      toast.error(`"${tooLarge.name}" supera el límite de 50MB`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

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
      streamRef.current = stream;
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
    const audio = audioMapRef.current.get(id);
    if (audio) { audio.pause(); audioMapRef.current.delete(id); }
    if (playingId === id) setPlayingId(null);
    onChange(adjuntos.filter((a) => a.id !== id));
    setPendingRemoveId(null);
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

            {/* Controles de zoom */}
            <div className="absolute -top-3 left-0 z-10 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Alejar"
              >
                <ZoomOut size={18} />
              </button>
              <span className="px-2 py-1 text-xs text-white/80 bg-white/10 rounded-full min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Acercar"
              >
                <ZoomIn size={18} />
              </button>
            </div>

            <div
              className="w-full h-[82vh] flex items-center justify-center overflow-hidden"
              onWheel={handleWheelZoom}
            >
              <img
                src={lightboxUrl}
                alt={lightboxNombre}
                draggable={false}
                onMouseDown={handleImageMouseDown}
                onMouseMove={handleImageMouseMove}
                onMouseUp={handleImageMouseUp}
                onMouseLeave={handleImageMouseUp}
                onDoubleClick={handleImageDoubleClick}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
                }}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none transition-transform duration-100 ease-out"
              />
            </div>
            {lightboxNombre && (
              <p className="text-white/70 text-sm truncate max-w-xs">{lightboxNombre}</p>
            )}
          </div>
        </div>
      )}

      {/* Modal de reproducción de video */}
      {videoModalUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6"
          onClick={() => setVideoModalUrl(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full flex flex-col items-center gap-3"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVideoModalUrl(null)}
              className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors shadow-lg"
              aria-label="Cerrar reproductor"
            >
              <X size={20} />
            </button>
            <video
              src={videoModalUrl}
              controls
              autoPlay
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
            />
            {videoModalNombre && (
              <p className="text-white/70 text-sm truncate max-w-xs">{videoModalNombre}</p>
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
                <button
                  type="button"
                  onClick={() => { setVideoModalUrl(adj.url); setVideoModalNombre(adj.nombre); }}
                  className="relative w-12 h-10 rounded-md bg-gray-800 shrink-0 flex items-center justify-center hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  title="Reproducir video"
                >
                  <Play size={16} className="text-gray-200" />
                </button>
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
                  {adj.tipo}{adj.tipo === 'audio' && duraciones[adj.id] ? ` · ${duraciones[adj.id]}` : ''} · {adj.tamano}
                </p>
                {adj.subidoPor && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    Subido por {adj.subidoPor}
                  </p>
                )}
              </div>

              {/* Eliminar — solo quien lo subió, o operaciones/admin */}
              {!readOnly && (canManageAll || !adj.subidoPor || adj.subidoPor === currentUserName) && (
                pendingRemoveId === adj.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">¿Eliminar?</span>
                    <button
                      type="button"
                      onClick={() => handleRemove(adj.id)}
                      className="px-2 py-1 text-xs font-medium rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingRemoveId(null)}
                      className="px-2 py-1 text-xs font-medium rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingRemoveId(adj.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                )
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