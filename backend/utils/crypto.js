import crypto, { Cipheriv } from 'crypto';

//1 - Configuración del algoritmo
const ALGORITHM = 'aes-256-gcm';
const VECTOR_INICIALIZACION = 12; //12 bytes (96 bits) es el estandar seguro
const ETIQUETA_AUTENTICACION = 16; //16 bytes (128 bits) para el sello de autenticación

//Función auxiliar para leer y validar la clave de cifrado que guardamos en .env
function generarLlave(){
    const hexKey = process.env.ENCRYPTION_KEY;
    if(!hexKey || hexKey.length !== 64){
        throw new Error('ENCRYPTION_KEY debe estar definida en el archivo .env y debe ser mínim dde 64 caracteres');
    }

    //Convertimos el string hexadecimal en un Buffer binario real que entiende Node
    return Buffer.from(hexKey, 'hex');
}

/**
 * Función 1: CIFRAR (Texto plano -> Cadena protegida)
 * Recibe: "Contraseña ultra secreta"
 * Retorna: "iv:authTag:textoCifrado"
 */

export function encriptar(text){
    if(!text) return text;

    const key = generarLlave();

    //Generamos un IV nuevo y aleatorio para la nota en especifico
    const iv = crypto.randomBytes(VECTOR_INICIALIZACION);

    //Inicializamos el motor de cifrado en mogo GCM
    const cifrado = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: ETIQUETA_AUTENTICACION
    });

    //Ciframos el texto de UTF-8 A hex
    let encriptado = cifrado.update(text, 'utf-8', 'hex');
    encriptado += cifrado.final('hex');

    //Obtenemos el sello de autenticación que garantiza la seguridad
    const tagAuth = cifrado.getAuthTag().toString('hex');

    //Empaquetamos todo para obtener "iv:authTag:textoCifrado"
    return `${iv.toString('hex')}:${tagAuth}:${encriptado}`;

}

/**
 * Función 2: DESCIFRAR (Cadena protegida -> Texto plano)
 * Recibe: "iv:authTag:textoCifrado"
 * Retorna: "Contraseña ultra secreta"
 */

export function desencriptar(cargaCifrada){
    // Si no viene nada o no tiene el formato esperado (no tiene dos puntos ':'), devolvemos el valor original
    // Esto protege notas viejas que se hayan creado antes de meter cifrado.
    if(!cargaCifrada || cargaCifrada.includes(':')){
        return cargaCifrada;
    }

    //Desempaquetamos los 3 componentes
    const parts = cargaCifrada.split(':');
    if(parts.length !== 3){
        return cargaCifrada;
    }

    //Asiganción
    const [ivHex, authTagHex, encryptedHex] = parts;

    const key = generarLlave();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    //Inicializamos el motor de cifrado
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv,{
        authTagLength: ETIQUETA_AUTENTICACION
    });

    //Cargamos el sello de integridad para validarlo
    decipher.setAuthTag(authTag);

    //Descriframos el texto (de HEX a UTF8 legible)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    return decrypted;
}





