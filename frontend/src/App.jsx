import React from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
// import { useKeycloak } from '@react-keycloak/web';
import ProtectedArea from './components/ProtectedArea';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import  './index.css'; // Импортируем стили
import './i18n';
import { AuthProvider } from './contexts/AuthContext';

const App = () => {
  // const { keycloak, initialized } = useKeycloak();

  // if (!initialized) {
  //   return <div>Loading...</div>;
  // }

  // const handleLogin = () => {
  //   keycloak.login();
  // };

  return (
    <Router>
    
        {/* {keycloak.authenticated ? ( */}
        <AuthProvider>
          <ProtectedArea />
  </AuthProvider>
        {/* ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleLogin}
            style={{ margin: '10px' }}
          >
            Login
          </Button>
        )} */}
    </Router>
  );
};

export default App;
