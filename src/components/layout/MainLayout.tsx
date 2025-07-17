import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';

// Ícones SVG para o menu e para fechar
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const navItems = [
  { name: 'Dashboard', path: '/' },
  { name: 'Cadastrar Veículo', path: '/register-vehicle' },
  { name: 'Verificar Veículo', path: '/verify-vehicle' },
  { name: 'Alertas', path: '/view-alerts' },
];

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  const handleLogout = () => {
    signOut(auth);
    navigate('/login');
  };

  const currentPage = navItems.find(item => item.path === location.pathname)?.name || 'SARA';

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Sidebar para Mobile (Drawer) e Desktop (Fixo) */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 p-4 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-10">
            <h1 className="text-2xl font-bold">SARA</h1>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1">
                <CloseIcon />
            </button>
        </div>
        
        <nav className="flex-grow">
          <ul>
            {navItems.map((item) => (
              <li key={item.name} className="mb-2">
                <NavLink
                  to={item.path}
                  onClick={() => setSidebarOpen(false)} // Fecha o menu ao navegar no mobile
                  className={({ isActive }) =>
                    `flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors ${
                      isActive ? 'bg-blue-600' : ''
                    }`
                  }
                >
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <button
          onClick={handleLogout}
          className="w-full p-2 mt-4 text-left text-red-400 rounded-lg hover:bg-red-800 hover:text-white transition-colors"
        >
          Sair
        </button>
      </aside>

      {/* Overlay para fechar o menu no mobile */}
      {isSidebarOpen && (
          <div 
              className="fixed inset-0 bg-black opacity-50 z-20 md:hidden"
              onClick={() => setSidebarOpen(false)}
          ></div>
      )}

      {/* Conteúdo Principal */}
      <div className="md:ml-64 flex flex-col flex-1">
        {/* Barra Superior para Mobile */}
        <header className="md:hidden sticky top-0 bg-gray-800 shadow-md p-4 flex justify-between items-center">
          <button onClick={() => setSidebarOpen(true)}>
            <MenuIcon />
          </button>
          <h2 className="text-xl font-semibold">{currentPage}</h2>
          <div></div> {/* Espaço para manter o título centralizado */}
        </header>
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
