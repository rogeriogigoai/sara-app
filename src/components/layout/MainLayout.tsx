import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';

// --- Ícones ---
const MenuIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /> </svg> );
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> </svg> );

// --- Itens de Navegação ---
const navItems = [
  { name: 'Dashboard', path: '/', minPermission: 1 },
  { name: 'Cadastrar Veículo', path: '/register-vehicle', minPermission: 2 },
  { name: 'Verificar Veículo', path: '/verify-vehicle', minPermission: 2 },
  { name: 'Histórico de Verificações', path: '/verifications-history', minPermission: 3 },
  { name: 'Alertas', path: '/view-alerts', minPermission: 1 },
  { name: 'Gerenciar Usuários', path: '/manage-users', minPermission: 5 },
];
const profileNavItem = { name: 'Meu Perfil', path: '/profile', minPermission: 1 };

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const { permissionLevel } = useAuth();

  const handleLogout = () => {
    signOut(auth);
    navigate('/login');
  };

  const currentPage = [...navItems, profileNavItem].find(item => item.path === location.pathname)?.name || 'SARA';
  const accessibleNavItems = navItems.filter(item => permissionLevel && permissionLevel >= item.minPermission);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 p-4 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
            <h1 className="text-2xl font-bold">SARA</h1>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1"><CloseIcon /></button>
        </div>
        <nav className="flex-grow">
          <ul>
            {accessibleNavItems.map((item) => (
              <li key={item.name} className="mb-2">
                <NavLink to={item.path} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors ${isActive ? 'bg-blue-600' : ''}`}>
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-gray-700 pt-4">
            <NavLink to={profileNavItem.path} onClick={() => setSidebarOpen(false)} className={({ isActive }) => `flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors ${isActive ? 'bg-blue-600' : ''}`}>
                {profileNavItem.name}
            </NavLink>
            <button onClick={handleLogout} className="w-full p-2 mt-2 text-left text-red-400 rounded-lg hover:bg-red-800 hover:text-white transition-colors">
              Sair
            </button>
        </div>
      </aside>
      {isSidebarOpen && (<div className="fixed inset-0 bg-black opacity-50 z-20 md:hidden" onClick={() => setSidebarOpen(false)}></div>)}
      <div className="md:ml-64 flex flex-col flex-1">
        <header className="md:hidden sticky top-0 bg-gray-800 shadow-md p-4 flex justify-between items-center">
          <button onClick={() => setSidebarOpen(true)}><MenuIcon /></button>
          <h2 className="text-xl font-semibold">{currentPage}</h2>
          <div></div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
