import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Mail, AlertCircle, CheckCircle, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { toast } from 'sonner@2.0.3';
import logoImage from 'figma:asset/244c2ba8753ee74fe56548105b9eef40883f7717.png';

export default function RecuperarPassword() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simular llamada a API para enviar email de recuperación
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setSuccess(true);
      toast.success('Correo de recuperación enviado');
    } catch (err: any) {
      setError('Error al enviar el correo de recuperación');
      toast.error('Error al procesar la solicitud');
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

        {/* Recovery Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Volver al inicio de sesión
          </button>

          {!success ? (
            <>
              <h2 className="text-xl font-semibold mb-2 dark:text-white">Recuperar Contraseña</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="usuario@institucion.edu"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
              </div>
              <h2 className="text-xl font-semibold mb-2 dark:text-white">Correo Enviado</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Hemos enviado un enlace de recuperación a <strong className="dark:text-white">{email}</strong>. 
                Por favor revisa tu bandeja de entrada y sigue las instrucciones.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
