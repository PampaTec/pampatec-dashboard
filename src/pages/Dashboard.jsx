import React, { useState, useEffect } from 'react';
import { Octokit } from '@octokit/rest';
import { Card, Table, Badge, ProgressBar, Alert, Spinner, Button, Row, Col } from 'react-bootstrap';
import { RefreshCw, ExternalLink, FileText, AlertCircle, Users, Eye, EyeOff, Power } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [repos, setRepos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tokenMissing, setTokenMissing] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('pampatec_gh_token');
        const org = localStorage.getItem('pampatec_gh_org') || 'PampaTec';

        if (!token) {
            setTokenMissing(true);
            setLoading(false);
            return;
        }

        try {
            const octokit = new Octokit({ auth: token });

            // 1. List repos from organization
            const { data: allRepos } = await octokit.repos.listForOrg({
                org: org,
                sort: 'updated',
                per_page: 100
            });

            // Filter: Only show repos with the 'pampatec-equipe' topic
            const filteredRepos = allRepos.filter(repo =>
                repo.topics && repo.topics.includes('pampatec-equipe')
            );

            // 2. For each repo, try to get PROGRESSO_BMC.md
            const reposWithProgress = await Promise.all(
                filteredRepos.map(async (repo) => {
                    try {
                        const { data: fileData } = await octokit.repos.getContent({
                            owner: org,
                            repo: repo.name,
                            path: 'PROGRESSO_BMC.md'
                        });

                        // Decode base64 content
                        let content;
                        try {
                            content = decodeURIComponent(escape(atob(fileData.content)));
                        } catch (e) {
                            content = atob(fileData.content);
                        }

                        // Basic parsing of the progress
                        // Looking for "Status Geral: Etapa X de 9 (XX%)"
                        const progressMatch = content.match(/Etapa (\d+) de 9 \((\d+)%\)/i);
                        const step = progressMatch ? parseInt(progressMatch[1]) : 0;
                        const percentage = progressMatch ? parseInt(progressMatch[2]) : 0;

                        return {
                            ...repo,
                            isActive: !(repo.topics && repo.topics.includes('pampatec-inativo')),
                            hasProgress: true,
                            currentStep: step,
                            percentage: percentage
                        };
                    } catch (e) {
                        return {
                            ...repo,
                            isActive: !(repo.topics && repo.topics.includes('pampatec-inativo')),
                            hasProgress: false,
                            percentage: 0
                        };
                    }
                })
            );

            setRepos(reposWithProgress);
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar dados do GitHub. Verifique seu token e organização.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [location.key]);

    if (tokenMissing) {
        return (
            <div className="text-center py-5">
                <AlertCircle size={48} className="text-warning mb-3" />
                <h3>Token Não Configurado</h3>
                <p className="text-muted">Você precisa configurar seu Personal Access Token para visualizar o dashboard.</p>
                <Button as={Link} to="/configuracoes" variant="primary">Ir para Configurações</Button>
            </div>
        );
    }

    const activeRepos = repos.filter(r => r.isActive);
    const inactiveRepos = repos.filter(r => !r.isActive);
    const displayedRepos = showInactive ? repos : activeRepos;

    return (
        <div className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark mb-1">Dashboard de Times</h2>
                    <p className="text-muted mb-0">
                        Monitoramento em tempo real do progresso do BMC.
                        {!loading && repos.length > 0 && (
                            <span className="ms-2">
                                <Badge bg="success" className="me-1">{activeRepos.length} ativo(s)</Badge>
                                {inactiveRepos.length > 0 && (
                                    <Badge bg="secondary">{inactiveRepos.length} inativo(s)</Badge>
                                )}
                            </span>
                        )}
                    </p>
                </div>
                <div className="d-flex gap-2">
                    {inactiveRepos.length > 0 && (
                        <Button
                            variant={showInactive ? 'secondary' : 'outline-secondary'}
                            onClick={() => setShowInactive(!showInactive)}
                            className="d-flex align-items-center gap-2"
                            size="sm"
                        >
                            {showInactive ? <EyeOff size={16} /> : <Eye size={16} />}
                            {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
                        </Button>
                    )}
                    <Button
                        variant="outline-primary"
                        onClick={fetchData}
                        disabled={loading}
                        className="d-flex align-items-center gap-2"
                    >
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        {loading ? 'Atualizando...' : 'Atualizar'}
                    </Button>
                </div>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3 text-muted">Buscando informações no GitHub...</p>
                </div>
            ) : (
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
                                                <small>Apenas repositórios com as etiquetas (topic) <code>pampatec-equipe</code> e <code>pampatec-ativo</code> são exibidos.</small>
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedRepos.map(repo => (
                                            <tr key={repo.id} className="align-middle" style={!repo.isActive ? { opacity: 0.55 } : {}}>
                                                <td className="px-4 py-3">
                                                    <div className="fw-bold text-dark">{repo.name}</div>
                                                    {repo.description && (
                                                        <div className="small text-muted text-truncate" style={{ maxWidth: '300px' }} title={repo.description}>
                                                            {repo.description}
                                                        </div>
                                                    )}
                                                    {repo.private && <Badge bg="secondary" className="ms-1 px-2">Privado</Badge>}
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
                                                            variant={repo.percentage === 100 ? "success" : "primary"}
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
                                                        <Button
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            href={repo.html_url}
                                                            target="_blank"
                                                            title="Ver código no GitHub"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </Button>
                                                        {repo.hasProgress && (
                                                            <Button
                                                                variant="outline-primary"
                                                                size="sm"
                                                                href={`${repo.html_url}/blob/main/PROGRESSO_BMC.md`}
                                                                target="_blank"
                                                                title="Ver progresso detalhado"
                                                            >
                                                                <FileText size={14} />
                                                            </Button>
                                                        )}
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
            )}

            <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};

export default Dashboard;
