import React from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useKeycloak } from '@react-keycloak/web';
import ProtectedArea from './components/ProtectedArea';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import  './index.css'; // Импортируем стили

const App = () => {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) {
    return <div>Loading...</div>;
  }

  const handleLogin = () => {
    keycloak.login();
  };

  return (
    <Router>
      <div style={{ textAlign: 'center' }}>
    
        {keycloak.authenticated ? (
          <ProtectedArea />
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleLogin}
            style={{ margin: '10px' }}
          >
            Login
          </Button>
        )}
      </div>
    </Router>
  );
};

export default App;
