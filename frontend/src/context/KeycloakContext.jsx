import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import { ReactKeycloakProvider } from '@react-keycloak/web';
import keycloak from '../keycloak';

const KeycloakContext = createContext(null);
export const useKeycloakContext = () => useContext(KeycloakContext);

const ErrorFallback = ({ message }) => (
  <div style={{ padding: 20, color: 'red' }}>
    <h2>Ошибка аутентификации</h2>
    <p>{message}</p>
    <button onClick={() => window.location.reload()}>Обновить страницу</button>
  </div>
);

export const KeycloakProvider = ({ children }) => {
  const [kcError, setKcError] = useState(null);

  const onKeycloakEvent = useCallback((event, error) => {
    console.log('KC event:', event, error);
    if (['onInitError', 'onAuthError', 'onAuthRefreshError'].includes(event)) {
      setKcError(error?.message || 'Ошибка авторизации (401)');
    }
  }, []);

  return (
    <ReactKeycloakProvider
      authClient={keycloak}
      initOptions={{
        onLoad: 'login-required',   // сразу перекидываем на логин, если нет сессии
        pkceMethod: 'S256',         // включаем PKCE
        checkLoginIframe: false,    // отключаем периодический iframe-чек, если нет silent-страницы
        // если хотите silent-check, добавьте здесь
        // silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      }}
      onEvent={onKeycloakEvent}
      LoadingComponent={<div>Загрузка аутентификации…</div>}
    >
      {kcError
        ? <ErrorFallback message={kcError}/>
        : (
          <KeycloakContext.Provider value={{ keycloak }}>
            {children}
          </KeycloakContext.Provider>
        )
      }
    </ReactKeycloakProvider>
  );
};
