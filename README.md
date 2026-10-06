# Guía instalación de APP Demo para OWASP
---
## Dockerizar el Backend (Node.js + Express)

**Crear el archivo .dockerignore del backend**
Objetivo -> Evitar que se copien archivos innecesarios o secretos dentro de la imagen.

```
En la ruta /lab-mern/backend/.dockerignore

node_modules
npm-debug.log
.env
.git

```

- node_modules: Evitar copiar módulos locales compilados en nuestra máquina anfitriona; se deben instalar limpiamente dentro del contenedor Linux
- .env (**Crítico para OWASP A05/A02**):Nunca se deben empaquetar archivos con credenciales en una imagen de Docker.

**Crear el Dockerfile**
```
# 1 - Imagen base oficial ligera basada en Alpine Linux
FROM node:20-alpine

#2 - Definir directorio de trabajo dentro del contenedor
WORKDIR /app

#3 - Copiar únicamente los manifiestos de dependencias primero
COPY package*.json ./

#4 - Instalar únicamente las dependencias necesarias para producción
RUN npm install --omit=dev

#5 - Copiar el resto del código fuente del backend
COPY ..

#6 - Informar el puerto que utilizará el contenedor
EXPOSE 5000

#7 - Comando de arranque del servidor
CMD ["node", "index.js"]

```
---
## Dockerizar el Frontend (React + Nginx)
Multi-Stage Build
- Una etapa con Node.js compila el código React a HTML/CSS estático.
- Usar Nginx, para servir los archivos compilados y hacer de proxy inverso hacia el backend

**Crear el archivo .dockerignore**
```
node_modules
dist
.git
```

**Configuración de Nginx**
Sirve la Single Page Application (SPA) y reenvía peticiones que empiecen con */api/* hacia el backend de Kubernetes.
```
nginx.conf

server {
    #1 - Puerto a escuchar (HTTP stándar)
    listen 80;

    #2 - Configuración para servir la SPA de React
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        # Si la ruta no existe físicamente, redirige a index.html (React Router)
        try_files $uri $uri/ /index.html;
    }
    #3 - Proxy inverso: Reevia el tráfico de la API a GKE
    location /api/ {
        #'backend-service' es el Service Discovery de GKE
        proxy_pass http://backend-service:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }


}
```
### Crear Dockerfile
```
# ==========================================
# ETAPA 1: Construcción (Build Stage)
# ==========================================

#Crea un contenedor temporal etiquetado como 'builder'. Al finalizar la etapa, todo el entorno pesado de Node y node_modules se desecha
FROM node:20-alpine AS builder

WORKDIR /app

#Copiar manifestos e instalar dependencias completas (Incluye Vite)
COPY package*.json ./
RUN npm install

#Copiar código fuente y compilar la aplicación React a archivos estáticos
COPY . .

#Vite empaqueta todo el código de React en la carpeta optimizada /app/dist
RUN npm run build

# ==========================================
# ETAPA 2: Producción con Nginx
# ==========================================

#Inicia una imagen limpia pequeña que únicamente tiene Nginx
FROM nginx:alpine

#Extrae archivos estáticos resultantes del build. La imagen final no tiene herramientas de desarrollo, código fuente crudo ni dependencias de npm reduciendo drasticamente el peso y vulnerabilidades
COPY --from=builder /app/dist /usr/share/nginx/html

#Reemplazar la configuración por defecto de Nginx con la nuestra
COPY nginx.conf /etc/nginx/conf.d/default.conf

#Exponer el puerto HTTP
EXPOSE 80

#Iniciar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]



```