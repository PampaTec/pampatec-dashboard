import React, { lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import SuspenseLoader from './components/SuspenseLoader';

// Lazy loading de todas as páginas — conforme frontend-dev-guidelines
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NovoTime = lazy(() => import('./pages/NovoTime'));
const GerenciarTime = lazy(() => import('./pages/GerenciarTime'));
const EditarProgresso = lazy(() => import('./pages/EditarProgresso'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route
                        index
                        element={
                            <SuspenseLoader>
                                <Dashboard />
                            </SuspenseLoader>
                        }
                    />
                    <Route
                        path="novo-time"
                        element={
                            <SuspenseLoader>
                                <NovoTime />
                            </SuspenseLoader>
                        }
                    />
                    <Route
                        path="gerenciar-time/:repoName"
                        element={
                            <SuspenseLoader>
                                <GerenciarTime />
                            </SuspenseLoader>
                        }
                    />
                    <Route
                        path="editar-progresso/:repoName"
                        element={
                            <SuspenseLoader>
                                <EditarProgresso />
                            </SuspenseLoader>
                        }
                    />
                    <Route
                        path="configuracoes"
                        element={
                            <SuspenseLoader>
                                <Configuracoes />
                            </SuspenseLoader>
                        }
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
