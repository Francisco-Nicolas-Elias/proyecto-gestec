import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, Usuario } from '../services/apiClient';
import * as http from '../services/http';

interface AuthContextType {
  usuario: Usuario | null;
  setUsuario: (usuario: Usuario | null) => void;
  hasPermission: (module: string) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      setUsuario(getCurrentUser());
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('gestec_token');
    if (!token) {
      setLoading(false);
      return;
    }

    http
      .get<Usuario>('/auth/me')
      .then((user) => setUsuario(user))
      .catch(() => {
        localStorage.removeItem('gestec_token');
        localStorage.removeItem('usuario');
      })
      .finally(() => setLoading(false));
  }, []);

  const hasPermission = (module: string): boolean => {
    if (!usuario) return false;

    const permissions: Record<string, string[]> = {
      activos: ['administrador', 'operaciones'],
      stock: ['administrador', 'operaciones'],
      tareas: ['administrador', 'operaciones'],
      admin: ['administrador'],
      tickets_gestion: ['administrador', 'operaciones'],
      tickets_crear: ['administrador', 'operaciones', 'docente_empleado'],
    };

    return permissions[module]?.includes(usuario.rol) ?? false;
  };

  return (
    <AuthContext.Provider value={{ usuario, setUsuario, hasPermission, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return {
      usuario: null,
      setUsuario: () => {},
      hasPermission: () => false,
      loading: false,
    };
  }
  return context;
}
