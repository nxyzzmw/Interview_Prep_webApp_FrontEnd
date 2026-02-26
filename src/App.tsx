import { useState } from 'react';
import './App.css';
import Login from './pages/auth/login';
import Register from './pages/auth/register';
import Dashboard from './pages/tabs/dashboard';
import Profile from './pages/tabs/profile';
import ProtectedRouting from './routing/ProtectedRouting';
import type { AuthSession, UserRole } from './api/AxiosInstance';

type Tab = 'dashboard' | 'profile';
type AuthView = 'login' | 'register';

const TOKEN_KEY = 'accessToken';
const ROLE_KEY = 'userRole';
const NAME_KEY = 'userName';
const EMAIL_KEY = 'userEmail';

function App() {
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [role, setRole] = useState<UserRole>(() =>
    (localStorage.getItem(ROLE_KEY) as UserRole | null) || 'user',
  );
  const [name, setName] = useState<string>(() => localStorage.getItem(NAME_KEY) || 'User');
  const [email, setEmail] = useState<string>(() => localStorage.getItem(EMAIL_KEY) || '');
  const [authView, setAuthView] = useState<AuthView>('login');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const handleLoginSuccess = (session: AuthSession) => {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(ROLE_KEY, session.role);
    localStorage.setItem(NAME_KEY, session.profile.name);
    localStorage.setItem(EMAIL_KEY, session.profile.email);
    setAccessToken(session.token);
    setRole(session.role);
    setName(session.profile.name);
    setEmail(session.profile.email);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(EMAIL_KEY);
    setAccessToken(null);
    setRole('user');
    setName('User');
    setEmail('');
  };

  return (
    <main className="app-shell">
      <ProtectedRouting
        token={accessToken}
        fallback={
          authView === 'login' ? (
            <Login onLoginSuccess={handleLoginSuccess} onShowRegister={() => setAuthView('register')} />
          ) : (
            <Register onRegisterSuccess={handleLoginSuccess} onShowLogin={() => setAuthView('login')} />
          )
        }
      >
        <header className="top-nav">
          <div className="tabs">
            <button
              type="button"
              className={activeTab === 'dashboard' ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={activeTab === 'profile' ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
          </div>

          <button type="button" className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </header>

        {activeTab === 'profile' && accessToken ? (
          <Profile role={role} token={accessToken} name={name} email={email} />
        ) : (
          <Dashboard role={role} token={accessToken} name={name} />
        )}
      </ProtectedRouting>
    </main>
  );
}

export default App;
