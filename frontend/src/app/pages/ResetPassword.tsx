import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Lock, AlertCircle, CheckCircle, ArrowLeft, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { toast } from 'sonner@2.0.3';
import logoImage from 'figma:asset/244c2ba8753ee74fe56548105b9eef40883f7717.png';
import { resetPassword } from '../services/apiClient';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('La contraseña debe contener al menos una mayúscula');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('La contraseña debe contener al menos un número');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('La contraseña debe contener al menos un carácter especial');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      toast.success('Contraseña restablecida correctamente');
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('igual a la anterior')) {
        setError('La nueva contraseña no puede ser igual a la anterior.');
      } else if (msg.includes('expirado')) {
        setError('El enlace ha expirado. Solicitá uno nuevo desde "Olvidé mi contraseña".');
      } else if (msg.includes('inválido')) {
        setError('El enlace es inválido o ya fue utilizado.');
      } else {
        setError('Error al restablecer la contraseña. Intentá nuevamente.');
      }
      toast.error(msg.includes('igual a la anterior') ? 'La nueva contraseña no puede ser igual a la anterior' : 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#c8e3f5] dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold dark:text-white mb-2">Enlace inválido</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Este enlace de recuperación es inválido o está incompleto.
          </p>
          <button
            onClick={() => navigate('/recuperar-password')}
            className="w-full bg-[#00a6d6] text-white py-2.5 rounded-lg font-medium hover:bg-[#0095c0] transition-colors"
          >
            Solicitar nuevo enlace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#c8e3f5] dark:bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors">
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
              <h2 className="text-xl font-semibold mb-2 dark:text-white">Nueva contraseña</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Ingresá tu nueva contraseña.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.
                  </p>
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="Repetí la contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#00a6d6] text-white py-2.5 rounded-lg font-medium hover:bg-[#0095c0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Guardando...' : 'Restablecer contraseña'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
              </div>
              <h2 className="text-xl font-semibold mb-2 dark:text-white">Contraseña restablecida</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Tu contraseña fue actualizada correctamente. Ya podés iniciar sesión con tu nueva contraseña.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-[#00a6d6] text-white py-2.5 rounded-lg font-medium hover:bg-[#0095c0] transition-colors"
              >
                Ir al inicio de sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
