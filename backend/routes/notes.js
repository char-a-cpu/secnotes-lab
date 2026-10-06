import express from 'express';
import Note from '../models/Note.js';

const router = express.Router();

// ==========================================
// RUTA 1: Obtener todas las notas públicas y del usuario
// GET /api/notes
// ==========================================
router.get('/', async(req, res) => {
    try{
        //Buscamos todas las notas ordenadas de la más reciente a la más antigua
        const notes = await Note.find().sort({createdAt: -1});
        res.json(notes);
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

        //Instancia del documento con los datos 
        const newNote = new Note({
            title,
            content,
            author,
            userId,
            isPrivate: Boolean(isPrivate)
        });

        //Guardado en MongoDB Atlas
        const savedNote = await newNote.save();
        res.status(201).json(savedNote)
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