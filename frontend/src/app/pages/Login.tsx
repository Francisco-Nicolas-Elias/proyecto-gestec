import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Monitor, Mail, Lock, AlertCircle, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { login } from '../services/apiClient';
import { useAuth } from '../components/AuthContext';
import { useTheme } from '../components/ThemeContext';
import { toast } from 'sonner@2.0.3';
import logoImage from 'figma:asset/244c2ba8753ee74fe56548105b9eef40883f7717.png';

export default function Login() {
  const navigate = useNavigate();
  const { setUsuario } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setLoading(true);

    if (!email.toLowerCase().endsWith('@ies21.edu.ar')) {
      setEmailError('Este formato no se acepta, el correo debe ser @ies21.edu.ar');
      setPassword('');
      setLoading(false);
      return;
    }

    try {
      const usuario = await login(email, password);
      setUsuario(usuario);
      toast.success(`Bienvenido, ${usuario.nombre}`);
      navigate('/dashboard');
    } catch (err: any) {
      const msg: string = err?.message ?? 'Error al iniciar sesión';
      if (msg.includes('bloqueada')) {
        setEmailError(msg);
        setPassword('');
      } else if (msg.includes('correo') || msg.includes('registrado') || msg.toLowerCase().includes('email')) {
        setEmailError(msg);
        setPassword('');
      } else if (msg.includes('contraseña') || msg.includes('incorrecta') || msg.includes('requerida')) {
        setPasswordError(msg);
        setPassword('');
      } else {
        setEmailError(msg);
        setPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#c8e3f5] dark:bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
        aria-label="Cambiar tema"
      >
        {theme === 'light' ? (
          <Moon className="text-gray-700" size={24} />
        ) : (
          <Sun className="text-yellow-400" size={24} />
        )}
      </button>

      {/* Decorative SVG Background Waves */}
      <svg className="absolute top-0 left-0 w-full h-full dark:opacity-30" viewBox="0 0 1440 900" preserveAspectRatio="none">
        {/* Top wave - darker blue/purple */}
        <path d="M0,80 C240,120 480,40 720,80 C960,120 1200,60 1440,90 L1440,0 L0,0 Z" fill="#5b9bd5" opacity="0.4"></path>
        
        {/* Second wave - medium blue */}
        <path d="M0,180 C360,220 720,140 1080,180 C1260,200 1350,190 1440,200 L1440,0 L0,0 Z" fill="#7dc5e8" opacity="0.5"></path>
        
        {/* Third wave - light blue/lavender */}
        <path d="M0,280 C480,320 960,240 1440,280 L1440,900 L0,900 Z" fill="#d4e4f7" opacity="0.6"></path>
      </svg>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-4">
            <img src={logoImage} alt="GESTEC Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GESTEC</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Gestión de Equipos Tecnológicos</p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          <h2 className="text-xl font-semibold mb-6 dark:text-white">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${emailError ? 'text-red-400' : 'text-gray-400'}`} size={20} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                  required
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${emailError ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-[#00a6d6]'}`}
                  placeholder="usuario@institucion.edu"
                />
              </div>
              {emailError && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 ${passwordError ? 'text-red-400' : 'text-gray-400'}`} size={20} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                  required
                  className={`w-full pl-10 pr-12 py-2.5 border rounded-lg focus:ring-2 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${passwordError ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-[#00a6d6]'}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00a6d6] text-white py-2.5 rounded-lg font-medium hover:bg-[#008bb8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              onClick={() => navigate('/registro')}
              className="text-sm text-[#00a6d6] dark:text-[#00b8e6] hover:text-[#008bb8] dark:hover:text-[#00a6d6]"
            >
              Crear usuario
            </button>
            <button
              onClick={() => navigate('/recuperar-password')}
              className="text-sm text-[#00a6d6] dark:text-[#00b8e6] hover:text-[#008bb8] dark:hover:text-[#00a6d6]"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}