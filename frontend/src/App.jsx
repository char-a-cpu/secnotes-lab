import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  // --- Estados de Autenticación ---
  const [user, setUser] = useState(null); // Almacena el usuario autenticado
  const [isRegisterMode, setIsRegisterMode] = useState(false); // Alterna entre Login y Registro
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // --- Estados de Notas ---
  const [notes, setNotes] = useState([]);
  const [noteForm, setNoteForm] = useState({ title: '', content: '', isPrivate: false });

  // 1. Cargar sesión previa desde localStorage al iniciar
  useEffect(() => {
    const savedUser = localStorage.getItem('secUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // 2. Consultar notas cuando hay un usuario activo
  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  // Función para obtener las notas del backend
  const fetchNotes = async () => {
    try {
      const res = await axios.get('/api/notes');
      setNotes(res.data);
    } catch (err) {
      console.error('Error al cargar notas:', err);
    }
  };

  // 3. Manejo de Registro y Login
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await axios.post(endpoint, authForm);
      const authenticatedUser = res.data.user;

      // Guardamos la sesión
      setUser(authenticatedUser);
      // ⚠️ OWASP A02: Guardar información sensible sin cifrar en localStorage
      localStorage.setItem('secUser', JSON.stringify(authenticatedUser));
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Ocurrió un error en la solicitud');
    }
  };

  // 4. Cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('secUser');
    setUser(null);
    setNotes([]);
  };

  // 5. Manejo de Creación de Notas
  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!noteForm.title || !noteForm.content) return;

    try {
      const payload = {
        title: noteForm.title,
        content: noteForm.content,
        author: user.username,
        userId: user.id,
        isPrivate: noteForm.isPrivate
      };

      await axios.post('/api/notes', payload);
      setNoteForm({ title: '', content: '', isPrivate: false });
      fetchNotes(); // Refrescar la lista de notas
    } catch (err) {
      console.error('Error al crear la nota:', err);
    }
  };

  // 6. Eliminar Nota
  const handleDeleteNote = async (id) => {
    try {
      await axios.delete(`/api/notes/${id}`);
      fetchNotes();
    } catch (err) {
      console.error('Error al eliminar la nota:', err);
    }
  };

  // ==========================================
  // VISTA: Si no hay usuario autenticado (Login / Registro)
  // ==========================================
  if (!user) {
    return (
      <main style={styles.container}>
        <header>
          <h1>🛡️ SecNotes Lab</h1>
          <p>Laboratorio MERN para Análisis de Seguridad Web (OWASP)</p>
        </header>

        <section style={styles.card}>
          <h2>{isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>

          {authError && <div style={styles.errorBox}>{authError}</div>}

          <form onSubmit={handleAuthSubmit} style={styles.form}>
            <label style={styles.label}>Usuario:</label>
            <input
              type="text"
              required
              value={authForm.username}
              onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
              style={styles.input}
            />

            {isRegisterMode && (
              <>
                <label style={styles.label}>Correo Electrónico:</label>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  style={styles.input}
                />
              </>
            )}

            <label style={styles.label}>Contraseña:</label>
            <input
              type="password"
              required
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              style={styles.input}
            />

            <button type="submit" style={styles.primaryBtn}>
              {isRegisterMode ? 'Registrarme' : 'Entrar'}
            </button>
          </form>

          <footer style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setAuthError('');
              }}
              style={styles.linkBtn}
            >
              {isRegisterMode
                ? '¿Ya tienes cuenta? Inicia sesión aquí'
                : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </footer>
        </section>
      </main>
    );
  }

  // ==========================================
  // VISTA: Dashboard principal con notas
  // ==========================================
  return (
    <main style={styles.container}>
      <header style={styles.navbar}>
        <div>
          <h2>🛡️ SecNotes Lab</h2>
          <span>Sesión iniciada como: <strong>{user.username}</strong> ({user.role})</span>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Cerrar Sesión</button>
      </header>

      {/* Formulario de nueva nota */}
      <section style={styles.card}>
        <h3>Nueva Nota</h3>
        <form onSubmit={handleCreateNote} style={styles.form}>
          <input
            type="text"
            placeholder="Título de la nota"
            value={noteForm.title}
            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
            style={styles.input}
            required
          />
          <textarea
            placeholder="Escribe el contenido..."
            rows={3}
            value={noteForm.content}
            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
            style={styles.input}
            required
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="checkbox"
              checked={noteForm.isPrivate}
              onChange={(e) => setNoteForm({ ...noteForm, isPrivate: e.target.checked })}
            />
            Marcar como Privada / Confidencial
          </label>
          <button type="submit" style={styles.primaryBtn}>Publicar Nota</button>
        </form>
      </section>

      {/* Lista de Notas */}
      <section>
        <h3>Muro de Notas Registradas</h3>
        {notes.length === 0 ? (
          <p>No hay notas guardadas aún.</p>
        ) : (
          <div style={styles.grid}>
            {notes.map((note) => (
              <article key={note._id} style={styles.noteCard}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0 }}>{note.title}</h4>
                  {note.isPrivate && <span style={styles.badgePrivate}>Privada</span>}
                </header>

                <p style={{ marginTop: '0.8rem', whiteSpace: 'pre-wrap' }}>{note.content}</p>

                <footer style={styles.noteFooter}>
                  <small>Por: <strong>{note.author}</strong></small>
                  <button onClick={() => handleDeleteNote(note._id)} style={styles.deleteBtn}>
                    Eliminar
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// Estilos limpios inline para no depender de frameworks CSS externos
const styles = {
  container: { maxWidth: '750px', margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' },
  card: { background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' },
  form: { display: 'flex', flexDirection: 'column' },
  label: { marginBottom: '0.3rem', fontSize: '0.9rem', fontWeight: 'bold' },
  input: { padding: '0.6rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' },
  primaryBtn: { padding: '0.7rem', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  logoutBtn: { padding: '0.4rem 0.8rem', backgroundColor: '#e00', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  linkBtn: { background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', textDecoration: 'underline' },
  navbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' },
  errorBox: { background: '#ffebee', color: '#c62828', padding: '0.7rem', borderRadius: '4px', marginBottom: '1rem' },
  grid: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  noteCard: { background: 'white', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '1rem' },
  noteFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid #f0f0f0', paddingTop: '0.5rem' },
  deleteBtn: { padding: '0.3rem 0.6rem', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  badgePrivate: { background: '#faad14', color: '#fff', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }
};

export default App;