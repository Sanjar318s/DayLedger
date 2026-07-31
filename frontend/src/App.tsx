import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import Layout from './components/Layout';
import OAuthRedirectHandler from './components/OAuthRedirectHandler';
import UnreadNotificationSound from './components/UnreadNotificationSound';
import CallModal from './components/CallModal';
import { useAuth } from './hooks/useAuth';
import { useSocketEvents } from './hooks/useSocketEvents';
import { usePerfMode } from './hooks/usePerfMode';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const EntryFormPage = lazy(() => import('./pages/EntryFormPage'));
const EntryViewPage = lazy(() => import('./pages/EntryViewPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const SettingsReports = lazy(() => import('./pages/SettingsReports'));
const SettingsCategories = lazy(() => import('./pages/SettingsCategories'));
const SettingsLanguage = lazy(() => import('./pages/SettingsLanguage'));
const SettingsAccount = lazy(() => import('./pages/SettingsAccount'));
const SettingsSound = lazy(() => import('./pages/SettingsSound'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const SharedEntriesPage = lazy(() => import('./pages/SharedEntriesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

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
  const { reducedMotion } = usePerfMode();

  useSocketEvents();

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [setUser]);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <OAuthRedirectHandler />
      <UnreadNotificationSound />
      <CallModal />
      <AnimatePresence mode="wait">
        <Suspense fallback={<PageFallback />}>
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
        </Suspense>
      </AnimatePresence>
    </MotionConfig>
  );
}
