import { Outlet, useNavigate, useLocation } from 'react-router';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Monitor,
  AlertCircle,
  Package,
  CheckSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Info,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { logout } from '../services/apiClient';
import { toast } from 'sonner@2.0.3';
import logoIES from 'figma:asset/244c2ba8753ee74fe56548105b9eef40883f7717.png';
import NotificationBell from './NotificationBell';

export default function MainLayout() {
  const { usuario, setUsuario, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setUsuario(null);
      navigate('/login');
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      permission: true,
    },
    {
      path: '/activos',
      label: 'Equipos',
      icon: Monitor,
      permission: hasPermission('activos'),
    },
    {
      path: '/tickets',
      label: 'Tickets',
      icon: AlertCircle,
      permission: hasPermission('tickets_crear'),
    },
    {
      path: '/stock',
      label: 'Stock',
      icon: Package,
      permission: hasPermission('stock'),
    },
    {
      path: '/tareas',
      label: 'Tareas',
      icon: CheckSquare,
      permission: hasPermission('tareas'),
    },
    {
      path: '/admin',
      label: 'Administración',
      icon: Settings,
      permission: hasPermission('admin'),
    },
    {
      path: '/informacion',
      label: 'Información',
      icon: Info,
      permission: true,
    },
  ].filter(item => item.permission);

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {sidebarOpen ? <X size={24} className="dark:text-white" /> : <Menu size={24} className="dark:text-white" />}
          </button>
          <h1 className="font-semibold text-lg dark:text-white">Sistema IT</h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Cambiar tema"
          >
            {theme === 'light' ? (
              <Moon className="text-gray-700" size={20} />
            ) : (
              <Sun className="text-yellow-400" size={20} />
            )}
          </button>
        </div>
      </div>

      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-30">
        <div className="relative flex flex-col items-center gap-3 px-4 py-5 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleTheme}
            className="absolute top-3 left-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Cambiar tema"
          >
            {theme === 'light' ? (
              <Moon className="text-gray-700" size={20} />
            ) : (
              <Sun className="text-yellow-400" size={20} />
            )}
          </button>
          <img src={logoIES} alt="Logo IES" className="w-16 h-16 object-contain" />
          <div className="text-center">
            <h1 className="font-bold text-lg dark:text-white">GESTEC</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Gestión de Equipos Tecnológicos</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-[#e6f7fc] dark:bg-[#004d63]/30 text-[#00a6d6] dark:text-[#00b8e6]'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#b3e7f7] dark:bg-[#004d63]/30 flex items-center justify-center">
              <span className="font-semibold text-[#00a6d6] dark:text-[#00b8e6]">
                {usuario?.nombre.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate dark:text-white">{usuario?.nombre}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{usuario?.rol.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 z-50 shadow-xl">
            <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <img src={logoIES} alt="Logo IES" className="w-7 h-7 object-contain" />
              <div>
                <h1 className="font-bold text-lg dark:text-white">GESTEC</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Gestión de Recursos</p>
              </div>
            </div>

            <nav className="px-3 py-4 space-y-1 h-[calc(100vh-200px)] overflow-y-auto">
              {menuItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <item.icon size={20} />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3 px-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#b3e7f7] dark:bg-[#004d63]/30 flex items-center justify-center">
                  <span className="font-semibold text-[#00a6d6] dark:text-[#00b8e6]">
                    {usuario?.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate dark:text-white">{usuario?.nombre}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{usuario?.rol.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen bg-[#e6f7fc] dark:bg-gray-900 relative overflow-hidden transition-colors">
        {/* Decorative SVG Background Waves */}
        <svg className="absolute top-0 left-0 w-full h-64 dark:opacity-20 pointer-events-none" viewBox="0 0 1440 320" preserveAspectRatio="none">
          {/* Top wave - darker cyan */}
          <path d="M0,96 C240,128 480,64 720,96 C960,128 1200,80 1440,100 L1440,0 L0,0 Z" fill="#00a6d6" opacity="0.15"></path>
          
          {/* Second wave - medium cyan */}
          <path d="M0,160 C360,192 720,128 1080,160 C1260,176 1350,168 1440,176 L1440,0 L0,0 Z" fill="#00b8e6" opacity="0.12"></path>
          
          {/* Third wave - light cyan */}
          <path d="M0,224 C480,256 960,192 1440,224 L1440,0 L0,0 Z" fill="#80d4f0" opacity="0.08"></path>
        </svg>
        
        {/* Notification Bell */}
        {(usuario?.rol === 'administrador' || usuario?.rol === 'operaciones') && (
          <NotificationBell />
        )}
        
        <div className="relative lg:pt-14">
          {/* Fecha fija - solo desktop, alineada con la campanita */}
          <div className="hidden lg:flex fixed top-4 left-[17rem] z-40 items-center gap-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-2.5">
            <span className="text-sm text-[#00a6d6]">📅</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {(() => {
                const d = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                return d.charAt(0).toUpperCase() + d.slice(1);
              })()}
            </span>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}