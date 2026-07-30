import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAccessToken } from '../api/token';
import { useAuth } from '../hooks/useAuth';

export default function OAuthRedirectHandler() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('accessToken');
    if (token) {
      setAccessToken(token);
      import('../api/auth').then(({ getMe }) => {
        getMe().then(res => {
          setUser(res.data);
          navigate('/', { replace: true });
        });
      });
    }
  }, [setUser, navigate]);

  return null;
}
