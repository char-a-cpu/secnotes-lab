# ==========================================
# ETAPA 1: Construcción (Build Stage)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos e instalar dependencias completas (incluye Vite)
COPY package*.json ./
RUN npm install

# Copiar código fuente y compilar la aplicación React a archivos estáticos
COPY . .
RUN npm run build

# ==========================================
# ETAPA 2: Producción con Nginx
# ==========================================
FROM nginx:alpine

# Copiar los archivos compilados en la etapa 'builder' hacia la carpeta web de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Reemplazar la configuración por defecto de Nginx con la nuestra
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto HTTP estándar
EXPOSE 80

# Iniciar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]