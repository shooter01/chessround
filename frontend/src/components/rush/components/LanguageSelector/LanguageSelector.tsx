import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, MenuItem, FormControl } from '@mui/material';

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const handleChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    const lng = e.target.value as string;
    i18n.changeLanguage(lng);
    window.localStorage.setItem('app-language', lng);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 80 }}>
      <Select value={i18n.language} onChange={handleChange} variant="standard" disableUnderline>
        <MenuItem value="en">EN</MenuItem>
        <MenuItem value="ru">RU</MenuItem>
      </Select>
    </FormControl>
  );
}
