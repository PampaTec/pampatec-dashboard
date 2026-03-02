import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware para JSON
app.use(express.json());

// Servir arquivos estáticos do Vite
app.use(express.static(path.join(__dirname, 'dist')));

// API Placeholder
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'PampaTec Backend is running' });
});

// Todas as outras rotas servem o index.html do frontend (para React Router)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
