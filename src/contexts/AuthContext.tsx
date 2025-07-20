import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, type User } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  permissionLevel: number | null; // Mudou de 'role' para 'permissionLevel'
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  permissionLevel: null,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = getAuth();
  const db = getFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [permissionLevel, setPermissionLevel] = useState<number | null>(null); // Estado atualizado
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setLoading(true);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // Agora busca pelo campo 'permission' e define como 0 se não existir
          setPermissionLevel(userDoc.data().permission || 0); 
        } else {
          setPermissionLevel(0); // Nível de permissão mais baixo
        }
        setUser(user);
      } else {
        setUser(null);
        setPermissionLevel(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db]);

  const value = { user, loading, permissionLevel };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
