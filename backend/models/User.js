import mongoose from "mongoose";

//1 - Definición del esquema


/**
 * Estructura y reglas de los documentos de usuarios que se guardan en la BD
 * trim -> Limpia automaticamente espacios en blanco al inicio y final.
 * unique -> Crea un índice en MongoDB para evitar duplicidad
 * role -> Dfine el rol del usuario
 * timestamps -> Mongoose creará dos campos automáticos; 'createdAt' y 'updatedAt' útiles para auditoría forense en seguridad
 * -------------------------------------
 * RIESGO OWASP A02 (Crypthographic Failure)
 * password: { type: String, required: true }
 * Si un atacante accede a la BD o revisa logs puede ver las contraseñas sin hash (protección criptografica)
 * -----------------------------------------
 * 
 * 
 */
const userSchema = new mongoose.Schema({ 
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
       type: String,
       default: 'user'
    }
},
{
    timestamps: true
});

    
//2 - Creación del modelo
const User = mongoose.model('User', userSchema);
export default User;

