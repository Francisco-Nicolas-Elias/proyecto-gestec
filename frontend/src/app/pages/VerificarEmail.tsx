import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CheckCircle, XCircle, Loader2, Sun, Moon } from 'lucide-react';
import { verificarEmail } from '../services/apiClient';
import { useTheme } from '../components/ThemeContext';
import logoImage from 'figma:asset/244c2ba8753ee74fe56548105b9eef40883f7717.png';

type Estado = 'cargando' | 'exito' | 'error';

export default function VerificarEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const [estado, setEstado] = useState<Estado>('cargando');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setEstado('error');
      setMensaje('El enlace de verificación es incompleto. Revisá el email e intentá nuevamente.');
      return;
    }
    verificarEmail(token)
      .then((res) => {
        setMensaje(res.message);
        setEstado('exito');
      })
      .catch((err: any) => {
        setMensaje(err.message || 'El enlace de verificación es inválido o ha expirado.');
        setEstado('error');
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#c8e3f5] dark:bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
        aria-label="Cambiar tema"
      >
        {theme === 'light' ? <Moon className="text-gray-700" size={24} /> : <Sun className="text-yellow-400" size={24} />}
      </button>

      <svg className="absolute top-0 left-0 w-full h-full dark:opacity-30" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <path d="M0,80 C240,120 480,40 720,80 C960,120 1200,60 1440,90 L1440,0 L0,0 Z" fill="#5b9bd5" opacity="0.4" />
        <path d="M0,180 C360,220 720,140 1080,180 C1260,200 1350,190 1440,200 L1440,0 L0,0 Z" fill="#7dc5e8" opacity="0.5" />
        <path d="M0,280 C480,320 960,240 1440,280 L1440,900 L0,900 Z" fill="#d4e4f7" opacity="0.6" />
      </svg>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-4">
            <img src={logoImage} alt="GESTEC Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GESTEC</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Gestión de Equipos Tecnológicos</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 text-center">
          {estado === 'cargando' && (
            <div className="py-4">
              <Loader2 className="animate-spin text-[#00a6d6] mx-auto mb-4" size={48} />
              <h2 className="text-xl font-semibold dark:text-white">Verificando tu cuenta...</h2>
            </div>
          )}

          {estado === 'exito' && (
            <div className="py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
              </div>
              <h2 className="text-xl font-semibold mb-2 dark:text-white">¡Cuenta verificada!</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{mensaje}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-[#00a6d6] text-white py-2.5 rounded-lg font-medium hover:bg-[#008bb8] transition-colors"
              >
                Iniciar sesión
              </button>
            </div>
          )}

          {estado === 'error' && (
            <div className="py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <XCircle className="text-red-600 dark:text-red-400" size={32} />
              </div>
              <h2 className="text-xl font-semibold mb-2 dark:text-white">Enlace inválido</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{mensaje}</p>
              <button
                onClick={() => navigate('/registro')}
                className="w-full bg-[#00a6d6] text-white py-2.5 rounded-lg font-medium hover:bg-[#008bb8] transition-colors"
              >
                Volver a registrarse
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
