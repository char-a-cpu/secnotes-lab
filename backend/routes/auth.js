import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';


//Crea un mini-enrutador modular para agrupar todas las rutas relacionads con autenticación en un archivo separado
const router = express.Router();

// ==========================================
// RUTA 1: Registro de Usuario (POST /api/auth/register)
// ==========================================
router.post('/register', async(req, res) => {
    try{
        //Destructuring: Extraemos los datos que el cliente envió en formato JSON en el body 
        const {username, email, password} = req.body;

        //Caso 1 - Verificación básica de campos vacíos
        if(!username || !email || !password){
            return res.status(400).json({error: 'Todos los campos son obligatorios'});
        }
        //Caso 2 - Verificar si el usuario o correo ya existen
        //Hace una consulta a Mongo para buscar si ya existe alguien con el correo o nombre de usuario
        const existingUser = await User.findOne({$or: [{username}, {email}]});
        //Si la consulta trae true
        if(existingUser){
            return res.status(400).json({error: 'El usuario o correo ya existen'});
        }

        //Solventar OWASP A02:2021 – Cryptographic Failures.
        //Generamos un salt con un factor de costo de 10 rondas
        const salt = await bcrypt.genSalt(10);

        //Generamos el hash seguro
        const hashedPassword = await bcrypt.hash(password, salt);

        //Caso 3: Pasó validaciones de los casos 1 y 2. Crea usuario
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch(error){
        res.status(500).json({error: 'Error en el servidor', details: error.message});
    }
});

// ==========================================
// RUTA 2: Login de Usuario (POST /api/auth/login)
// ==========================================
router.post('/login', async(req,res) => {
    try{
        const {username, password} = req.body;

        //FIX OWASP A02:2021: Buscar solamente por 'username'
        const user = await User.findOne({username});
        if(!user){
            return res.status(401).json({error: 'Credenciales inválidas'});
        }


        //Comparación segura en memoria contra el hash almacenado
        const textMatch = await bcrypt.compare(password, user.password);
        if(!textMatch){
            return res.status(401).json({message: 'Credenciales inválidas'});
        }

        //#2: Respuesta existosa
        res.json({
            message: 'Inicio de sesión exitoso',
            user:{
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch(error){
        res.status(500).json({error: 'Error en el servidor', details: error.message});
    }
})

export default router;

