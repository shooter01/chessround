# Используем официальное изображение Node.js (последняя LTS-версия)
FROM node:lts

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --save-dev nodemon

RUN npm install pg --save-dev


# Копируем оставшийся код в контейнер
COPY . .

# Открываем порт приложения
EXPOSE 5000

# Запускаем сервер с использованием nodemon
CMD ["npx", "nodemon", "--legacy-watch", "index.js"]