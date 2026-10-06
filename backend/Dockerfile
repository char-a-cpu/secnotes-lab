# 1 - Imagen base oficial ligera basada en Alpine Linux
FROM node:20-alpine

#2 - Definir directorio de trabajo dentro del contenedor
WORKDIR /app

#3 - Copiar únicamente los manifiestos de dependencias primero
COPY package*.json ./

#4 - Instalar únicamente las dependencias necesarias para producción
RUN npm install --omit=dev

#5 - Copiar el resto del código fuente del backend
COPY . .

#6 - Informar el puerto que utilizará el contenedor
EXPOSE 5000

#7 - Comando de arranque del servidor
CMD ["node", "index.js"]