import React, { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import axios from '../axiosConfig';
// import { useKeycloakContext } from '../context/KeycloakContext';
import App   from './rush/App.tsx';
import Login   from './rush/Login.tsx';
// import RushLayout    from './rush/RushLayout.tsx';
import { Routes, Route, Navigate } from 'react-router-dom';

const ProtectedArea = () => {
  // const { keycloak } = useKeycloakContext();


  return (
        <Routes>
          <Route path="/*" element={<App   
          //  userId={keycloak.tokenParsed.sub} 
           />} />
          <Route path="/*" element={<Login    />} />
        </Routes>
  );
};

export default ProtectedArea;
