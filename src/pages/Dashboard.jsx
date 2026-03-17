import React, { useState, useCallback, useMemo } from 'react';
import { Card, Table, Badge, ProgressBar, Button, Row, Col, Alert } from 'react-bootstrap';
import { RefreshCw, ExternalLink, Users, Eye, EyeOff, Power, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useRepos, useRefreshRepos } from '../features/dashboard/hooks/useRepos';
import { useGithubClient } from '../hooks/useGithubClient';

// ─── Componente de listagem de repos (recebe dados via hook Suspense) ─────────

const RepoList = () => {
    const { repos } = useRepos();
    const refreshRepos = useRefreshRepos();
    const navigate = useNavigate();
    const [showInactive, setShowInactive] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const activeRepos = useMemo(() => repos.filter((r) => r.isActive), [repos]);
    const inactiveRepos = useMemo(() => repos.filter((r) => !r.isActive), [repos]);
    const displayedRepos = useMemo(
        () => (showInactive ? repos : activeRepos),
        [showInactive, repos, activeRepos]
    );

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshRepos();
        setRefreshing(false);
    }, [refreshRepos]);

    const toggleInactive = useCallback(() => setShowInactive((prev) => !prev), []);

    return (
        <div className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark mb-1">Dashboard de Times</h2>
                    <p className="text-muted mb-0">
                        Monitoramento em tempo real do progresso do BMC.
                        <span className="ms-2">
                            <Badge bg="success" className="me-1">{activeRepos.length} ativo(s)</Badge>
                            {inactiveRepos.length > 0 && (
                                <Badge bg="secondary">{inactiveRepos.length} inativo(s)</Badge>
                            )}
                        </span>
                    </p>
                </div>
                <div className="d-flex gap-2">
                    {inactiveRepos.length > 0 && (
                        <Button
                            variant={showInactive ? 'secondary' : 'outline-secondary'}
                            onClick={toggleInactive}
                            className="d-flex align-items-center gap-2"
                            size="sm"
                        >
                            {showInactive ? <EyeOff size={16} /> : <Eye size={16} />}
                            {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
                        </Button>
                    )}
                    <Button
                        variant="outline-primary"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="d-flex align-items-center gap-2"
                    >
                        <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
                        {refreshing ? 'Atualizando...' : 'Atualizar'}
                    </Button>
                </div>
            </div>

            <Row className="g-4">
                <Col lg={12}>
                    <Card className="shadow-sm border-0">
                        <Table responsive hover className="mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="border-0 px-4 py-3">Startup / Repositório</th>
                                    <th className="border-0 py-3">Status</th>
                                    <th className="border-0 py-3">Progresso</th>
                                    <th className="border-0 py-3 text-center">Etapa</th>
                                    <th className="border-0 py-3 text-end px-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedRepos.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-5 text-muted">
                                            <p className="mb-1">Nenhum repositório ativo encontrado na organização.</p>
                                            <small>Apenas repositórios com as etiquetas <code>pampatec-equipe</code> são exibidos.</small>
                                        </td>
                                    </tr>
                                ) : (
                                    displayedRepos.map((repo) => (
                                        <tr
                                            key={repo.id}
                                            className="align-middle"
                                            style={!repo.isActive ? { opacity: 0.55 } : {}}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="fw-bold text-dark">{repo.name}</div>
                                                {repo.description && (
                                                    <div
                                                        className="small text-muted text-truncate"
                                                        style={{ maxWidth: '300px' }}
                                                        title={repo.description}
                                                    >
                                                        {repo.description}
                                                    </div>
                                                )}
                                                {repo.private && (
                                                    <Badge bg="secondary" className="ms-1 px-2">Privado</Badge>
                                                )}
                                            </td>
                                            <td>
                                                {repo.isActive ? (
                                                    <Badge pill bg="success" className="d-inline-flex align-items-center gap-1 px-3">
                                                        <Power size={10} /> Ativo
                                                    </Badge>
                                                ) : (
                                                    <Badge pill bg="danger" className="d-inline-flex align-items-center gap-1 px-3">
                                                        <Power size={10} /> Inativo
                                                    </Badge>
                                                )}
                                            </td>
                                            <td style={{ minWidth: '200px' }}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <ProgressBar
                                                        now={repo.percentage}
                                                        label={`${repo.percentage}%`}
                                                        className="flex-grow-1"
                                                        variant={repo.percentage === 100 ? 'success' : 'primary'}
                                                        style={{ height: '10px' }}
                                                    />
                                                    <span className="small fw-bold">{repo.percentage}%</span>
                                                </div>
                                                <div className="small text-muted mt-1">
                                                    Atualizado em {new Date(repo.updated_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                {repo.hasProgress ? (
                                                    <Badge pill bg="info" className="px-3">Etapa {repo.currentStep}</Badge>
                                                ) : (
                                                    <Badge pill bg="light" text="dark" className="px-3 border text-muted opacity-50">Sem BMC</Badge>
                                                )}
                                            </td>
                                            <td className="text-end px-4">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        onClick={() => navigate(`/gerenciar-time/${repo.name}`)}
                                                        title="Gerenciar colaboradores"
                                                    >
                                                        <Users size={14} className="me-1" /> Gerenciar
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Col>
            </Row>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

// ─── Token Guard — renderizado quando token não existe ────────────────────────

const TokenGuard = () => (
    <div className="text-center py-5">
        <AlertCircle size={48} className="text-warning mb-3" />
        <h3>Token Não Configurado</h3>
        <p className="text-muted">
            Você precisa configurar seu Personal Access Token para visualizar o dashboard.
        </p>
        <Button as={Link} to="/configuracoes" variant="primary">
            Ir para Configurações
        </Button>
    </div>
);

// ─── Error Boundary simples para capturar erro de token ──────────────────────

class DashboardErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            const isTokenError = this.state.error?.message === 'TOKEN_MISSING';
            if (isTokenError) return <TokenGuard />;
            return (
                <Alert variant="danger" className="my-4">
                    Erro ao carregar dados do GitHub. Verifique seu token e organização.
                </Alert>
            );
        }
        return this.props.children;
    }
}

// ─── Componente principal — sem isLoading, sem useEffect ─────────────────────

const Dashboard = () => {
    const { token } = useGithubClient();

    if (!token) return <TokenGuard />;

    return (
        <DashboardErrorBoundary>
            <RepoList />
        </DashboardErrorBoundary>
    );
};

export default Dashboard;
