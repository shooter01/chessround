import axios from 'axios';
import keycloak from './keycloak'; // Исправленный импорт

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000', // Базовый URL API
});

axiosInstance.interceptors.request.use(
  async (config) => {
    if (keycloak.authenticated) {
      const token = keycloak.token; // Получаем токен
      config.headers.Authorization = `Bearer ${token}`; // Устанавливаем заголовок
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
