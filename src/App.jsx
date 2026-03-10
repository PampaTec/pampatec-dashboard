import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NovoTime from './pages/NovoTime';
import GerenciarTime from './pages/GerenciarTime';
import EditarProgresso from './pages/EditarProgresso';
import Configuracoes from './pages/Configuracoes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="novo-time" element={<NovoTime />} />
          <Route path="gerenciar-time/:repoName" element={<GerenciarTime />} />
          <Route path="editar-progresso/:repoName" element={<EditarProgresso />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
