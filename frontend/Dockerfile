# Используем базовое изображение Node.js (последняя LTS-версия)
FROM node:20

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь код проекта
COPY . .

# Открываем порт для Vite (по умолчанию 5173)
EXPOSE 3000

# Запускаем Vite в режиме разработки
CMD ["npm", "run", "dev", "--", "--host"]