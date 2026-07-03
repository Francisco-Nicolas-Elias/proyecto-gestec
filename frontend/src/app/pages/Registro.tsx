import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Monitor, Mail, Lock, User, AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { registrarse } from '../services/apiClient';
import { useTheme } from '../components/ThemeContext';
import { toast } from 'sonner@2.0.3';
import logoImage from 'figma:asset/244c2ba8753ee74fe56548105b9eef40883f7717.png';

const DOMINIO = '@ies21.edu.ar';

export default function Registro() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (val: string) => {
    if (val && !val.endsWith(DOMINIO)) {
      setEmailError(`Solo se permiten emails ${DOMINIO}`);
    } else {
      setEmailError('');
    }
  };

  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (val: string) => {
    if (!val) { setPasswordError(''); return; }
    if (val.length < 8) { setPasswordError('Mínimo 8 caracteres'); return; }
    if (!/[A-Z]/.test(val)) { setPasswordError('Debe contener al menos una mayúscula'); return; }
    if (!/[0-9]/.test(val)) { setPasswordError('Debe contener al menos un número'); return; }
    if (!/[^A-Za-z0-9]/.test(val)) { setPasswordError('Debe contener al menos un carácter especial'); return; }
    setPasswordError('');
  };

  const validateConfirm = (val: string) => {
    if (val && val !== password) {
      setConfirmError('Las contraseñas no coinciden');
    } else {
      setConfirmError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith(DOMINIO)) {
      setEmailError(`Solo se permiten emails ${DOMINIO}`);
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      validatePassword(password);
      return;
    }
    if (password !== confirmPassword) {
      setConfirmError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await registrarse(nombre, email, password);
      setSuccess(true);
      toast.success('Registro exitoso. Revisá tu email.');
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

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
              <h2 className="text-xl font-semibold mb-2 dark:text-white">Crear cuenta</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Solo para personal con email <span className="font-medium text-[#00a6d6]">{DOMINIO}</span>
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="nombre"
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                      minLength={2}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="Juan García"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Correo institucional
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
                      onBlur={(e) => validateEmail(e.target.value)}
                      required
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${emailError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      placeholder={`usuario${DOMINIO}`}
                    />
                  </div>
                  {emailError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{emailError}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); validatePassword(e.target.value); }}
                      onBlur={(e) => validatePassword(e.target.value)}
                      required
                      minLength={8}
                      className={`w-full pl-10 pr-12 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${passwordError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {passwordError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{passwordError}</p>}
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); validateConfirm(e.target.value); }}
                      onBlur={(e) => validateConfirm(e.target.value)}
                      required
                      className={`w-full pl-10 pr-12 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#00a6d6] focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${confirmError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                      placeholder="Repetí tu contraseña"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {confirmError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{confirmError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || !!emailError || !!passwordError || !!confirmError}
                  className="w-full bg-[#00a6d6] text-white py-2.5 rounded-lg font-medium hover:bg-[#008bb8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
              </div>
              <h2 className="text-xl font-semibold mb-2 dark:text-white">¡Revisá tu email!</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Enviamos un enlace de verificación a{' '}
                <strong className="dark:text-white">{email}</strong>.{' '}
                Hacé clic en el enlace para activar tu cuenta.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-[#00a6d6] text-white py-2.5 rounded-lg font-medium hover:bg-[#008bb8] transition-colors"
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
