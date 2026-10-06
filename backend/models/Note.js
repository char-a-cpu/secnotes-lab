/**
 * ESQUEMA DE NOTAS
 * -- userId ---
 * Almacena el _id de MongoDB del usuario que redactó la nota. Esto vincula la nota a un usuario específico.
 * -- isPrivae --
 * Nos servirá para probar si usuarios no autorizados pueden consultar información confidencial ajena.
 * 
 */
import mongoose from "mongoose";
const noteSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPrivate: {
        type: Boolean,
        default: false
    }
},{
    timestamps: true

});

const Note = mongoose.model('Note', noteSchema);
export default Note;