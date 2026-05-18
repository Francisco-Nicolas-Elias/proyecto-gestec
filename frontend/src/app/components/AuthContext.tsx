import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, Usuario } from '../services/apiClient';

interface AuthContextType {
  usuario: Usuario | null;
  setUsuario: (usuario: Usuario | null) => void;
  hasPermission: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setUsuario(user);
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
    <AuthContext.Provider value={{ usuario, setUsuario, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Fallback seguro cuando el componente se renderiza fuera del AuthProvider
    // (ej: preview de Figma Make o tests de componentes aislados)
    return {
      usuario: null,
      setUsuario: () => {},
      hasPermission: () => false,
    };
  }
  return context;
}