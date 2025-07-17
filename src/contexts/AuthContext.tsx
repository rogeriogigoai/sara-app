import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// A correção crucial está aqui: "type User" em vez de apenas "User"
import { getAuth, type User } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  role: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = getAuth();
  const db = getFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setLoading(true);
      if (user) {
        // Usuário logado. Vamos buscar o perfil dele no Firestore.
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // Se o documento do usuário existe, pegamos o perfil.
          setRole(userDoc.data().role);
        } else {
          // Se não existir, definimos como 'user' padrão.
          setRole('user');
        }
        setUser(user);
      } else {
        // Usuário deslogado.
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  const value = { user, loading, role };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
