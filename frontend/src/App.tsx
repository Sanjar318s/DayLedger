import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import EntryFormPage from './pages/EntryFormPage';
import EntryViewPage from './pages/EntryViewPage';
import SettingsPage from './pages/SettingsPage';
import SettingsReports from './pages/SettingsReports';
import SettingsCategories from './pages/SettingsCategories';
import SettingsLanguage from './pages/SettingsLanguage';
import SettingsAccount from './pages/SettingsAccount';
import SettingsSound from './pages/SettingsSound';
import AdminSettingsPage from './pages/AdminSettingsPage';
import FriendsPage from './pages/FriendsPage';
import ChatPage from './pages/ChatPage';
import SharedEntriesPage from './pages/SharedEntriesPage';
import ProfilePage from './pages/ProfilePage';
import OAuthRedirectHandler from './components/OAuthRedirectHandler';
import UnreadNotificationSound from './components/UnreadNotificationSound';
import CallModal from './components/CallModal';
import { useAuth } from './hooks/useAuth';
import { useSocketEvents } from './hooks/useSocketEvents';
import { useEffect } from 'react';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return children;
}

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

export default function App() {
  const { setUser } = useAuth();
  const location = useLocation();

  useSocketEvents();

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [setUser]);

  return (
    <>
      <OAuthRedirectHandler />
      <UnreadNotificationSound />
      <CallModal />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<motion.div {...pageTransition}><LoginPage /></motion.div>} />
          <Route path="/register" element={<motion.div {...pageTransition}><RegisterPage /></motion.div>} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<motion.div {...pageTransition}><DashboardPage /></motion.div>} />
            <Route path="entry/new" element={<motion.div {...pageTransition}><EntryFormPage /></motion.div>} />
            <Route path="entry/:id/edit" element={<motion.div {...pageTransition}><EntryFormPage /></motion.div>} />
            <Route path="entry/:id" element={<motion.div {...pageTransition}><EntryViewPage /></motion.div>} />
            <Route path="friends" element={<motion.div {...pageTransition}><FriendsPage /></motion.div>} />
            <Route path="chat" element={<motion.div {...pageTransition}><ChatPage /></motion.div>} />
            <Route path="shared" element={<motion.div {...pageTransition}><SharedEntriesPage /></motion.div>} />
            <Route path="profile/:publicId" element={<motion.div {...pageTransition}><ProfilePage /></motion.div>} />
            <Route path="settings" element={<SettingsPage />}>
              <Route path="reports" element={<SettingsReports />} />
              <Route path="categories" element={<SettingsCategories />} />
              <Route path="language" element={<SettingsLanguage />} />
              <Route path="account" element={<SettingsAccount />} />
              <Route path="sound" element={<SettingsSound />} />
              <Route path="admin" element={<motion.div {...pageTransition}><AdminSettingsPage /></motion.div>} />
              <Route index element={<Navigate to="reports" replace />} />
            </Route>
          </Route>
        </Routes>
      </AnimatePresence>
    </>
  );
}