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

---
## Conectar GitHub a GKE (CI/CD)

En vez de generar llaves privadas en archivos JSON, configuraremos una relación de confianza directa.
- Google Cloud confiará en el emisor de tokens OIDC de GitHub (***token.actions.githubusercontent.com***)
- Google Cloud verificará que las peticiones vengan únicamente del repositorio específico (***char-a-cpu/secnotes-lab***)
- GitHub Actions asumirá una cuenta de servicio de GCP con permisos mínimos necesarios (***Artifact Registry/GKE***) de forma temporal.

**Paso 1: Definir variables de entorno**
```
export PROJECT_ID=$(gcloud config get-value project)
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
export REPO="char-a-cpu/secnotes-lab"
export WORKLOAD_POOL="github-pool"
export WORKLOAD_PROVIDER="github-provider"
export SA_NAME="github-actions-sa"
```

**Paso 2: APIs necesarias**
```
gcloud services enable \
    iam.googleapis.com \
    cloudresourcemanager.googleapis.com \
    iamcredentials.googleapis.com \
    artifactregistry.googleapis.com \
    container.googleapis.com
```
**Paso 3: Crear el Workload Identity Pool**

- Es un contenedor para gestionar identidades externas
```
gcloud iam workload-identity-pools create $WORKLOAD_POOL \
    --project=$PROJECT_ID \
    --location="global" \
    --display-name="GitHub Actions Pool"
```
**Paso 4: Crear el Workload Identity Provider dentro del Pool**

- Se define que confiamos en GitHub Actions y mapeamos sus atributos(quién ejecuta la acción y desde qué repositorio)
- El parámetro *--atribute-condition* asgura que solamente el repo *char-a-cpu/secnotes-lab* pueda solicitar acceso a la cuenta de Google Cloud
```
gcloud iam workload-identity-pools providers create-oidc $WORKLOAD_PROVIDER \
    --project=$PROJECT_ID \
    --location="global" \
    --workload-identity-pool=$WORKLOAD_POOL \
    --display-name="GitHub Actions Provider" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository == '$REPO'"
```
**Paso 5: Crear Service Account**

- Representa la identidad que asumirá GitHub para trabajar dentro de la nube.

```
gcloud iam service-accounts create $SA_NAME \
    --project=$PROJECT_ID \
    --display-name="GitHub Actions CI/CD SA"
```
**Paso 6: Asignar roles mínimos a la SA (RBAC)**

- Permisos solamente para subir imagenes al Registry y desplegar en GKE

```
#Permiso para escribir imágenes Docker en Artifact Registry
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

# Permiso para interactuar con los recursos de Kubernetes en GKE
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/container.developer"
```
**Paso 7: Vincular la SA con el Workload Identity Pool**

- Permite que tokens provenientes del repositorio asuman la SA creada en GCP
```
gcloud iam service-accounts add-iam-policy-binding \
    "${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
    --project=$PROJECT_ID \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WORKLOAD_POOL}/attribute.repository/${REPO}"
```
**Paso 8: Obtener los valores necesarios para GitHub**
```
# 1. El nombre completo del Workload Identity Provider
echo "WORKLOAD_IDENTITY_PROVIDER:"
echo "projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WORKLOAD_POOL}/providers/${WORKLOAD_PROVIDER}"

# 2. El correo de la Service Account
echo ""
echo "SERVICE_ACCOUNT_EMAIL:"
echo "${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
```