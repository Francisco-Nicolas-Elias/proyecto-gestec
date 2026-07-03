import { useState, useEffect, useRef } from 'react';
import { Bell, X, ClipboardList, History, CheckCheck, MapPin, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from './AuthContext';
import Modal from './Modal';
import {
  getTickets,
  sendNotificationEmail,
  getNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  type Notificacion,
} from '../services/apiClient';
import { toast } from 'sonner@2.0.3';

const DISMISSED_KEY = 'gestec_dismissed_notifications';

const getDismissed = (): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]')); } catch { return new Set(); }
};
const saveDismissed = (ids: Set<string>) => {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
};
const purgeDismissed = (activeIds: string[]) => {
  const current = getDismissed();
  const active = new Set(activeIds);
  const pruned = new Set([...current].filter(id => active.has(id)));
  saveDismissed(pruned);
  return pruned;
};

// Item del historial "Ver todas": una Notificacion del backend o un ticket nuevo
type AllNotifItem = Notificacion & { ticketId?: string };

export default function NotificationBell() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tareaNotifs, setTareaNotifs] = useState<Notificacion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAllModal, setShowAllModal] = useState(false);
  const [allNotifs, setAllNotifs] = useState<AllNotifItem[]>([]);
  const [loadingAllNotifs, setLoadingAllNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dismissedIds = useRef<Set<string>>(getDismissed());

  // Solo mostrar para administradores y operaciones
  const shouldShowNotifications = auth?.usuario?.rol === 'administrador' || auth?.usuario?.rol === 'operaciones';

  useEffect(() => {
    if (shouldShowNotifications) {
      loadNotifications();
      // Actualizar cada 30 segundos
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [shouldShowNotifications]);

  useEffect(() => {
    // Cerrar dropdown al hacer click fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      const [tickets, notifs] = await Promise.all([getTickets(), getNotificaciones()]);

      const todosNuevos = tickets.filter((t: any) => t.estado === 'nuevo');
      // Limpiar dismissed IDs que ya no son tickets 'nuevo' (resueltos, etc.)
      dismissedIds.current = purgeDismissed(todosNuevos.map((t: any) => t.id));
      const newTickets = todosNuevos.filter((t: any) => !dismissedIds.current.has(t.id));

      // Verificar si hay nuevos tickets desde la última carga
      const previousCount = notifications.length;
      const currentCount = newTickets.length;

      if (currentCount > previousCount && previousCount > 0) {
        // Hay nuevos reportes, enviar email
        const newReports = newTickets.slice(0, currentCount - previousCount);
        await sendNotificationEmail({
          to: auth?.usuario?.email || '',
          reportes: newReports,
          usuarioNombre: auth?.usuario?.nombre || '',
        });
      }

      setNotifications(newTickets);
      setTareaNotifs(notifs.filter((n) => !n.leida));
      setUnreadCount(newTickets.length + notifs.filter((n) => !n.leida).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleNotificationClick = (ticketId: string) => {
    dismissedIds.current.add(ticketId);
    saveDismissed(dismissedIds.current);
    const updated = notifications.filter((n) => n.id !== ticketId);
    setNotifications(updated);
    setUnreadCount(updated.length + tareaNotifs.length);
    navigate(`/tickets/${ticketId}`);
    setIsOpen(false);
  };

  const handleMarkAsRead = (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    dismissedIds.current.add(ticketId);
    saveDismissed(dismissedIds.current);
    const updated = notifications.filter((n) => n.id !== ticketId);
    setNotifications(updated);
    setUnreadCount(updated.length + tareaNotifs.length);
  };

  const handleTareaNotifClick = async (notif: Notificacion) => {
    const updated = tareaNotifs.filter((n) => n.id !== notif.id);
    setTareaNotifs(updated);
    setUnreadCount(notifications.length + updated.length);
    setIsOpen(false);
    navigate(notif.ticketId ? `/tickets/${notif.ticketId}` : '/tareas');
    try { await marcarNotificacionLeida(notif.id); } catch (error) { console.error('Error marcando notificación como leída:', error); }
  };

  const handleMarkTareaNotifAsRead = async (e: React.MouseEvent, notif: Notificacion) => {
    e.stopPropagation();
    const updated = tareaNotifs.filter((n) => n.id !== notif.id);
    setTareaNotifs(updated);
    setUnreadCount(notifications.length + updated.length);
    try { await marcarNotificacionLeida(notif.id); } catch (error) { console.error('Error marcando notificación como leída:', error); }
  };

  const handleMarkAllAsRead = async () => {
    notifications.forEach((n) => dismissedIds.current.add(n.id));
    saveDismissed(dismissedIds.current);
    setNotifications([]);
    const teniaTareaNotifs = tareaNotifs.length > 0;
    setTareaNotifs([]);
    setUnreadCount(0);
    if (teniaTareaNotifs) {
      try { await marcarTodasNotificacionesLeidas(); } catch (error) { console.error('Error marcando notificaciones como leídas:', error); }
    }
    toast.success('Notificaciones marcadas como leídas');
  };

  const formatFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const handleOpenAllNotifs = async () => {
    setIsOpen(false);
    setShowAllModal(true);
    setLoadingAllNotifs(true);
    try {
      const [allTickets, notifs] = await Promise.all([getTickets(), getNotificaciones()]);
      const ticketNotifs: AllNotifItem[] = allTickets.map((t: any) => {
        const lugar = t.activo ? `PC ${t.activo} · ${t.ubicacion}` : t.ubicacion;
        return {
          id: `ticket-${t.id}`,
          tipo: 'ticket_nuevo',
          mensaje: `${t.creador} reportó un ticket de ${t.tipo} en ${lugar}`,
          leida: t.estado !== 'nuevo' || dismissedIds.current.has(t.id),
          fecha: t.fechaCreacion,
          ticketId: t.id,
        };
      });
      const merged = [...ticketNotifs, ...notifs].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      );
      setAllNotifs(merged);
    } catch (error) {
      console.error('Error cargando historial de notificaciones:', error);
    } finally {
      setLoadingAllNotifs(false);
    }
  };

  const handleAllNotifClick = async (notif: AllNotifItem) => {
    // Ticket nuevo sintético (no persistido) — usa el flujo de "descartado" local, no el de leída
    if (notif.tipo === 'ticket_nuevo' && notif.ticketId) {
      dismissedIds.current.add(notif.ticketId);
      saveDismissed(dismissedIds.current);
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== notif.ticketId);
        setUnreadCount(updated.length + tareaNotifs.length);
        return updated;
      });
      setShowAllModal(false);
      navigate(`/tickets/${notif.ticketId}`);
      return;
    }
    if (!notif.leida) {
      setAllNotifs((prev) => prev.map((n) => (n.id === notif.id ? { ...n, leida: true } : n)));
      setTareaNotifs((prev) => {
        const updated = prev.filter((n) => n.id !== notif.id);
        setUnreadCount(notifications.length + updated.length);
        return updated;
      });
      try { await marcarNotificacionLeida(notif.id); } catch (error) { console.error('Error marcando notificación como leída:', error); }
    }
    setShowAllModal(false);
    if (notif.tareaId) navigate('/tareas');
    else if (notif.ticketId) navigate(`/tickets/${notif.ticketId}`);
  };

  if (!shouldShowNotifications) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 lg:right-6 z-50" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="text-gray-700 dark:text-gray-300" size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-14 right-0 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-[#00a6d6] text-white">
            <div>
              <h3 className="font-semibold">Notificaciones</h3>
              <p className="text-xs opacity-90">Tickets nuevos y tareas asignadas</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Acceso al historial completo */}
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleOpenAllNotifs}
              className="text-xs text-[#00a6d6] dark:text-[#00b8e6] hover:text-[#008bb8] dark:hover:text-[#00a6d6] font-medium flex items-center gap-1"
            >
              <History size={13} />
              Ver todas las notificaciones
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && tareaNotifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <Bell size={40} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay notificaciones nuevas</p>
              </div>
            ) : (
              <>
                {notifications.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-start border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <button
                      onClick={() => handleNotificationClick(ticket.id)}
                      className="flex-1 px-4 py-3 text-left min-w-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {ticket.titulo || ticket.tipo || `Ticket #${ticket.nro}`}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {ticket.descripcion}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <MapPin size={11} className="flex-shrink-0" />
                            <span className="truncate">
                              {ticket.activo ? `PC ${ticket.activo} · ${ticket.ubicacion}` : ticket.ubicacion}
                            </span>
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {ticket.creador}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(ticket.fechaCreacion).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleMarkAsRead(e, ticket.id)}
                      title="Marcar como leída"
                      className="flex-shrink-0 p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {tareaNotifs.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-start border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <button
                      onClick={() => handleTareaNotifClick(notif)}
                      className="flex-1 px-4 py-3 text-left min-w-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-2 h-2 bg-[#00a6d6] rounded-full mt-2"></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-gray-900 dark:text-white">
                            {notif.ticketId ? (
                              <AlertCircle size={14} className="flex-shrink-0 text-[#00a6d6]" />
                            ) : (
                              <ClipboardList size={14} className="flex-shrink-0 text-[#00a6d6]" />
                            )}
                            <p className="font-medium text-sm truncate">{notif.mensaje}</p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatFecha(notif.fecha)}
                          </p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={(e) => handleMarkTareaNotifAsRead(e, notif)}
                      title="Marcar como leída"
                      className="flex-shrink-0 p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          {(notifications.length > 0 || tareaNotifs.length > 0) && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#00a6d6] dark:text-[#00b8e6] hover:text-[#008bb8] dark:hover:text-[#00a6d6] font-medium"
              >
                Marcar todas como leídas
              </button>
              <button
                onClick={() => {
                  navigate(notifications.length > 0 ? '/tickets?estado=nuevo' : '/tareas');
                  setIsOpen(false);
                }}
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                {notifications.length > 0 ? 'Ver todos los tickets →' : 'Ver tareas asignadas →'}
              </button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showAllModal} onClose={() => setShowAllModal(false)} title="Historial de notificaciones" size="md">
        {loadingAllNotifs ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Cargando...</p>
        ) : allNotifs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Bell size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tenés notificaciones</p>
          </div>
        ) : (
          <div className="space-y-1">
            {allNotifs.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleAllNotifClick(notif)}
                className={`w-full flex items-start gap-3 px-3 py-3 text-left rounded-lg border transition-colors ${
                  notif.leida
                    ? 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    : 'border-[#00a6d6]/20 bg-[#00a6d6]/5 hover:bg-[#00a6d6]/10 dark:bg-[#00a6d6]/10 dark:hover:bg-[#00a6d6]/20'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {notif.leida ? (
                    <CheckCheck size={16} className="text-gray-400" />
                  ) : (
                    <div className="w-2 h-2 bg-[#00a6d6] rounded-full mt-1"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notif.leida ? 'text-gray-600 dark:text-gray-400' : 'font-medium text-gray-900 dark:text-white'}`}>
                    {notif.mensaje}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatFecha(notif.fecha)} · {notif.leida ? 'Leída' : 'No leída'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}