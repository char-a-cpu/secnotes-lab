//1 - Importación de dependencias (Módulos ES)
import express from 'express'; //Trae el framework  Express para crear rutas y gestionar peticiones HTTP
import mongoose from 'mongoose';// Biblioteca para MongoDB
import cors from 'cors'; // Middleware apra controlar qué dominios externos pueden consultar la API
import dotenv from 'dotenv'; // Cargar variables de entorno desde el archivo '.env' a process.env
import authRoutes from './routes/auth.js' // Importar las rutas de auth.js
import noteRoutes from './routes/notes.js' // Importar las rutas de notes.js

//2 - Inicialización: Lee el archivo .env y almacena sus valores en memoria del proceso (process.env)
dotenv.config();


//3 - Creación de la aplicación
const app = express(); //Instancia el servidor Express para asociar el middleware y rutas HTTP
const PORT = process.env.PORT || 5000; //Define el puerto declarado en .env o el 5000 -> Asignación condicional 

//4 - Middlewares globales
app.use(cors()); // Habilita CORS para permitir que el frontend (port 5173) hable con este backend (port 5000)
app.use(express.json()); //Parsea el body de las peticiones en formato JSON a objetos JS accesbiles en req.body.

//5 - Prefijo de rutas
app.use('/api/auth',authRoutes)
app.use('/api/notes', noteRoutes);


//5 - Ruta Healthcheck
//Escucha peticiones tipo GET en la URL '/api/health'
app.get('/api/health', (req, res) => {
    //req = datos que entran (request) || res = datos que salen (response)
    res.json({status: 'ok', message: 'Servidor MERN en línea'}); //Responde codigo 200 OK y un req.message
});

//6 - Conexión a la base de datos
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        //Si fué exitosa:
        console.log(' Conectado a MongoDB');
        app.listen(PORT, ( ) => {
            //Pone el servidor a escuchar peticiones en la red en el puerto indicado
            console.log(`Servidor corriento en http://localhost:${PORT}`);
        })
    })
    .catch((err) => {
        //Si la base de datos no responde o falla la autenticación
        console.error('Error al conectar a MongoDB: ', err.message);
    })