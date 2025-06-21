import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import axios from '../axiosConfig';
// import { useKeycloakContext } from '../context/KeycloakContext';
import App   from './rush/App.tsx';
// import RushLayout    from './rush/RushLayout.tsx';
import { Routes, Route, Navigate } from 'react-router-dom';

const ProtectedArea = () => {
  // const { keycloak } = useKeycloakContext();


  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Левое боковое меню */}

      <Grid container style={{ flex: 1 }}>
        <Grid item xs={8} >


<div style={{ flex: 1 }}>
        <Routes>
          {/* Главная страница */}
      
          <Route path="/*" element={<App   
          //  userId={keycloak.tokenParsed.sub} 
           />} />


          {/* Редирект на главную страницу по умолчанию */}
          {/* <Route path="*" element={<Navigate to="/" />} /> */}
        </Routes>
      </div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProtectedArea;
