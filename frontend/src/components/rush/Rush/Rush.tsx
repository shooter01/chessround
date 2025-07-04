import React, { useState } from 'react';
import { Box } from '@mui/material';
import RushComponent from './RushComponent.tsx'; // Adjust the path if Board is located elsewhere
import ChessgroundApp from './../Board/Demo.tsx'; // Adjust the path if Board is located elsewhere
import { Route, Routes, Navigate } from 'react-router-dom';

export default function Rush() {
  return (
    <Routes>
      {/* При заходе на /rush/rush */}
      <Route index element={<RushComponent />} />

      {/* При заходе на /rush/rush/puzzle */}
      <Route path="/puzzle/*" element={<RushComponent />} />

      {/* Необязательно: редирект всего непрописанного на index */}
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
}
