import express from 'express';
import Note from '../models/Note.js';
import {encriptar, desencriptar} from '../utils/crypto.js';

const router = express.Router();

// ==========================================
// RUTA 1: Obtener todas las notas públicas y del usuario
// GET /api/notes
// ==========================================
router.get('/', async(req, res) => {
    try{
        //Buscamos todas las notas ordenadas de la más reciente a la más antigua, agregamos .lean() para obtener objetos JS manipulables
        const notes = await Note.find().sort({createdAt: -1}).lean();
        
        //Si una nota es privada, la desciframos antes de mandarla al frontend
        const notaProcesada = notes.map((note) => {
            if(note.isPrivate){
                try{
                    return{
                        ...note,
                        content: desencriptar(note.content) //Descifra: 'iv:tag:cifrado' de vuelta a texto plano
                    };
                }catch(err){
                    //Si la clavecambió o el texto fue manipulado por la DB
                    return{
                        ...note,
                        content: '[Error: No se pudo descifrar el contenido. Clave errónea o datos alterados]'
                    };
                }
            }
            //Si no es privada se entrega tal cual
            return note;
        })
    }catch(error){
        res.status(500).json({error: 'Error al consultar notas', details: error.message});
    }
});

// ==========================================
// RUTA 2: Crear una nueva nota
// POST /api/notes
// ==========================================
router.post('/', async(req, res) => {
    try{
        const {title, content, author, userId, isPrivate} = req.body;

        //Validación de campos indispensables
        if(!title || !content || !author || !userId){
            return res.status(400).json({error: 'Título, contenido y usuario son requeridos'});
        }

        const flagPrivada = Boolen(isPrivate);

        //Si el usuario marcó la nota como privada, ciframos el contenido antes de guardarla en la DB
        let contenidoFinal = content;
        if(flagPrivada){
            contenidoFinal = encriptar(content); //Convierte el texto plano en 'iv:tag:cifrado'
        }

        //Instancia del documento con los datos 
        const newNote = new Note({
            title,
            content: contenidoFinal,
            author,
            userId,
            isPrivate: flagPrivada
        });

        //Guardado en MongoDB Atlas
        const savedNote = await newNote.save();
        const responseData = savedNote.toObject();
        responseData.content = content;

        res.status(201).json(responseData);
    }catch(error){
        res.status(500).json({error: 'Error al crear nota', details: error.message});
    
    }
});

// ==========================================
// RUTA 3: Eliminar una nota
// DELETE /api/notes/:id
// ==========================================
router.delete('/:id', async(req, res) => {
    try{
        const {id} = req.params; //Extraemos el ID enviado en la URL
        const deletedNote = await Note.findByIdAndDelete(id);
        if(!deletedNote){
            return res.status(404).json({error: 'Nota no encontrada'})
        }

        res.json({message: 'Nota eliminada correctamente', id});
    }catch(error){
        res.status(500).json({error: 'Error al eliminar nota', details: error.message});
    }
});
export default router;