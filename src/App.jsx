import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box, AppBar, Toolbar, Typography, Button, IconButton, useMediaQuery, Menu, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import LogOutIcon from '@mui/icons-material/Logout';
import StorefrontIcon from '@mui/icons-material/Storefront';

import Login from './pages/Login';
import POSScreen from './pages/POS';
import CashierDashboard from './pages/CashierDashboard';
import AdminPanel from './pages/AdminPanel';
import SuperAdminPanel from './pages/SuperAdminPanel';
import ChangePasswordModal from './components/ChangePasswordModal';
import { NotificationProvider } from './context/NotificationContext';
import { apiFetch } from './utils/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [currentView, setCurrentView] = useState('pos'); // pos, cashier, admin, superadmin
  const [themeMode, setThemeMode] = useState('light');
  const [posFocusMode, setPosFocusMode] = useState(() => localStorage.getItem('pos_focus_mode') === 'true');

  const [anchorElNav, setAnchorElNav] = useState(null);
  const isMobile = useMediaQuery('(max-width:900px)');

  useEffect(() => {
    const validateAndSyncSession = async () => {
      const savedToken = localStorage.getItem('pos_token');
      const savedUser = localStorage.getItem('pos_user');
      if (!savedToken || !savedUser) {
        setToken('');
        setUser(null);
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        
        if (parsedUser.role === 'super_admin' || parsedUser.role === 'superadmin') {
          setCurrentView('superadmin');
        }

        // Validate session with backend server
        const res = await apiFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('pos_user', JSON.stringify(data.user));
          }
        } else if (res.status === 401 || res.status === 403) {
          console.warn('[Session Sync] Token or session invalid after backend deployment. Prompting re-login.');
          handleLogout();
        }
      } catch (e) {
        console.error('Session sync error:', e);
      }
    };

    validateAndSyncSession();

    const handleSessionExpired = () => {
      setToken('');
      setUser(null);
    };

    const handleTokenRefreshed = (e) => {
      if (e.detail?.token) {
        setToken(e.detail.token);
      }
      if (e.detail?.user) {
        setUser(e.detail.user);
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'pos_token' || e.key === 'pos_user' || e.key === 'pos_refresh_token') {
        validateAndSyncSession();
      }
    };

    window.addEventListener('auth_session_expired', handleSessionExpired);
    window.addEventListener('auth_token_refreshed', handleTokenRefreshed);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', validateAndSyncSession);

    return () => {
      window.removeEventListener('auth_session_expired', handleSessionExpired);
      window.removeEventListener('auth_token_refreshed', handleTokenRefreshed);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', validateAndSyncSession);
    };
  }, []);

  const muiTheme = createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: '#f97316',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#10b981'
      },
      background: {
        default: themeMode === 'light' ? '#f8fafc' : '#0f172a',
        paper: themeMode === 'light' ? '#ffffff' : '#1e293b'
      }
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
  });

  const toggleTheme = () => {
    setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout warning:', e);
    } finally {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_refresh_token');
      localStorage.removeItem('pos_user');
      setUser(null);
      setToken('');
    }
  };

  const handleFocusModeChange = (isFocus) => {
    setPosFocusMode(isFocus);
    localStorage.setItem('pos_focus_mode', isFocus ? 'true' : 'false');
  };

  if (!token || !user) {
    return (
      <NotificationProvider>
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          <Login onLoginSuccess={(u, t) => { setUser(u); setToken(t); }} />
        </ThemeProvider>
      </NotificationProvider>
    );
  }

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'superadmin';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <NotificationProvider>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />

        <ChangePasswordModal
          open={Boolean(user?.must_change_password)}
          onPasswordChanged={(updatedUser) => setUser(updatedUser)}
        />

        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
          {/* Header Bar */}
          {!posFocusMode && (
            <AppBar position="static" color="default" elevation={1} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 56, xl: 80 }, px: { xs: 1.5, xl: 4 } }}>
                
                {/* Brand Title */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, xl: 2 } }}>
                  <StorefrontIcon color="primary" sx={{ fontSize: { xs: 28, xl: 40 } }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', xl: '1.6rem' }, color: 'primary.main' }}>
                    {user?.restaurant_name || 'Restaurant POS'}
                  </Typography>
                </Box>

                {/* Navigation Menu */}
                {isMobile ? (
                  <>
                    <IconButton onClick={(e) => setAnchorElNav(e.currentTarget)} color="inherit">
                      <MenuIcon />
                    </IconButton>
                    <Menu
                      anchorEl={anchorElNav}
                      open={Boolean(anchorElNav)}
                      onClose={() => setAnchorElNav(null)}
                    >
                      <MenuItem onClick={() => { setCurrentView('pos'); setAnchorElNav(null); }}>POS Screen</MenuItem>
                      <MenuItem onClick={() => { setCurrentView('cashier'); setAnchorElNav(null); }}>Cashier Shift</MenuItem>
                      {isAdminOrManager && (
                        <MenuItem onClick={() => { setCurrentView('admin'); setAnchorElNav(null); }}>Admin Panel</MenuItem>
                      )}
                      {isSuperAdmin && (
                        <MenuItem onClick={() => { setCurrentView('superadmin'); setAnchorElNav(null); }}>Super Admin</MenuItem>
                      )}
                    </Menu>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', gap: { xs: 1, xl: 2.5 } }}>
                    <Button
                      variant={currentView === 'pos' ? 'contained' : 'text'}
                      onClick={() => setCurrentView('pos')}
                      sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                    >
                      POS Screen
                    </Button>
                    <Button
                      variant={currentView === 'cashier' ? 'contained' : 'text'}
                      onClick={() => setCurrentView('cashier')}
                      sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                    >
                      Cashier Shift
                    </Button>
                    {isAdminOrManager && (
                      <Button
                        variant={currentView === 'admin' ? 'contained' : 'text'}
                        onClick={() => setCurrentView('admin')}
                        sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                      >
                        Admin Panel
                      </Button>
                    )}
                    {isSuperAdmin && (
                      <Button
                        variant={currentView === 'superadmin' ? 'contained' : 'text'}
                        onClick={() => setCurrentView('superadmin')}
                        color="secondary"
                        sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', xl: '1.2rem' } }}
                      >
                        Super Admin
                      </Button>
                    )}
                  </Box>
                )}

                {/* User Profile & Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, xl: 3 } }}>
                  <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontSize: { xs: '0.875rem', xl: '1.2rem' } }}>{user?.name || 'User'}</Typography>
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: { xs: '0.75rem', xl: '1rem' } }}>
                      {user?.role || 'Staff'}
                    </Typography>
                  </Box>

                  <IconButton onClick={toggleTheme} color="inherit">
                    {themeMode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
                  </IconButton>

                  <IconButton onClick={handleLogout} color="error" title="End Session">
                    <LogOutIcon />
                  </IconButton>
                </Box>

              </Toolbar>
            </AppBar>
          )}

          {/* View Content */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            {currentView === 'pos' && (
              <POSScreen
                user={user}
                token={token}
                onLogout={handleLogout}
                isFocusMode={posFocusMode}
                onFocusModeChange={handleFocusModeChange}
              />
            )}
            {currentView === 'cashier' && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <CashierDashboard user={user} token={token} onLogout={handleLogout} />
              </Box>
            )}
            {currentView === 'admin' && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <AdminPanel token={token} />
              </Box>
            )}
            {currentView === 'superadmin' && (
              <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <SuperAdminPanel token={token} />
              </Box>
            )}
          </Box>
        </Box>
      </ThemeProvider>
    </NotificationProvider>
  );
}
