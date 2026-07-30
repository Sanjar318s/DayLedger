import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SoundProvider } from './context/SoundContext';
import { ToastProvider } from './context/ToastContext';
import { LocaleProvider } from './context/LocaleContext';
import { CategoriesProvider } from './context/CategoriesContext';
import { ChatProvider } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import './index.css';
import './styles.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <SoundProvider>
              <ToastProvider>
                <LocaleProvider>
                  <CategoriesProvider>
                    <ChatProvider>
                      <CallProvider>
                        <App />
                      </CallProvider>
                    </ChatProvider>
                  </CategoriesProvider>
                </LocaleProvider>
              </ToastProvider>
            </SoundProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
