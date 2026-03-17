import React, { useState, useCallback } from 'react';
import {
    Card, Button, Alert, Row, Col, ListGroup, Badge, Form, InputGroup, Table, Modal
} from 'react-bootstrap';
import {
    Users, UserPlus, UserMinus, CheckCircle, AlertCircle, XCircle, ArrowLeft,
    ExternalLink, Shield, RefreshCw, Search, Mail, Power, FileText, Edit3,
    Save, BarChart3
} from 'lucide-react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useTeamData, useRefreshTeam } from '../features/team-management/hooks/useTeamData';
import { useGithubClient } from '../hooks/useGithubClient';
import {
    validateUser,
    addCollaborator,
    removeCollaborator,
    cancelInvite,
    toggleTeamStatus,
    updateDescription,
} from '../features/team-management/api/teamApi';

const DESCRIPTION_MAX_LENGTH = 350;

// ─── Error Boundary ───────────────────────────────────────────────────────────

class TeamErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <Alert variant="danger" className="my-4">
                    Erro ao carregar dados do time: {this.state.error?.message}
                </Alert>
            );
        }
        return this.props.children;
    }
}

// ─── Componente principal de conteúdo (recebe dados via Suspense) ─────────────

const TeamContent = ({ repoName }) => {
    const { repo, collaborators, pendingInvites, progress } = useTeamData(repoName);
    const refreshTeam = useRefreshTeam(repoName);
    const { octokit, token, org } = useGithubClient();
    const navigate = useNavigate();
    const location = useLocation();

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(
        location.state?.successMessage || null
    );
    const [newUsername, setNewUsername] = useState('');
    const [validatingUser, setValidatingUser] = useState(false);
    const [userPreview, setUserPreview] = useState(null);
    const [adding, setAdding] = useState(false);
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [userToRemove, setUserToRemove] = useState(null);
    const [removing, setRemoving] = useState(false);
    const [editingDescription, setEditingDescription] = useState(false);
    const [descriptionText, setDescriptionText] = useState(repo.description || '');
    const [savingDescription, setSavingDescription] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);

    const isActive = !(repo.topics && repo.topics.includes('pampatec-inativo'));

    const handleRefresh = useCallback(async () => {
        setError(null);
        await refreshTeam();
    }, [refreshTeam]);

    const handleCheckUser = useCallback(async () => {
        if (!newUsername.trim() || !octokit) return;
        setValidatingUser(true);
        setUserPreview(null);
        try {
            const preview = await validateUser({ octokit, username: newUsername });
            setUserPreview({ valid: true, ...preview });
        } catch (err) {
            setUserPreview({
                valid: false,
                username: newUsername.trim(),
                error: err.status === 404 ? 'Usuário não encontrado no GitHub' : err.message,
            });
        } finally {
            setValidatingUser(false);
        }
    }, [newUsername, octokit]);

    const handleAddCollaborator = useCallback(async (e) => {
        e.preventDefault();
        if (!userPreview?.valid || !octokit) return;
        setAdding(true);
        setError(null);
        setSuccess(null);
        try {
            await addCollaborator({ octokit, org, repoName, username: userPreview.username });
            setSuccess(`Convite enviado para @${userPreview.username}!`);
            setNewUsername('');
            setUserPreview(null);
            await refreshTeam();
        } catch (err) {
            setError(`Erro ao adicionar @${userPreview.username}: ${err.response?.data?.message || err.message}`);
        } finally {
            setAdding(false);
        }
    }, [userPreview, octokit, org, repoName, refreshTeam]);

    const handleRemoveCollaborator = useCallback(async () => {
        if (!userToRemove || !octokit) return;
        setRemoving(true);
        setError(null);
        setSuccess(null);
        try {
            await removeCollaborator({ octokit, org, repoName, username: userToRemove.login });
            setSuccess(`@${userToRemove.login} foi removido do repositório.`);
            setShowRemoveModal(false);
            setUserToRemove(null);
            await refreshTeam();
        } catch (err) {
            setError(`Erro ao remover @${userToRemove.login}: ${err.response?.data?.message || err.message}`);
            setShowRemoveModal(false);
        } finally {
            setRemoving(false);
        }
    }, [userToRemove, octokit, org, repoName, refreshTeam]);

    const handleCancelInvite = useCallback(async (invitationId, username) => {
        if (!octokit) return;
        setError(null);
        setSuccess(null);
        try {
            await cancelInvite({ octokit, org, repoName, invitationId });
            setSuccess(`Convite para @${username} foi cancelado.`);
            await refreshTeam();
        } catch (err) {
            setError(`Erro ao cancelar convite: ${err.response?.data?.message || err.message}`);
        }
    }, [octokit, org, repoName, refreshTeam]);

    const handleToggleStatus = useCallback(async (activate) => {
        if (!octokit) return;
        setTogglingStatus(true);
        setError(null);
        setSuccess(null);
        try {
            await toggleTeamStatus({ octokit, org, repoName, activate });
            setSuccess(activate ? `Time '${repoName}' foi reativado!` : `Time '${repoName}' foi marcado como inativo.`);
            setShowDeactivateModal(false);
            await refreshTeam();
        } catch (err) {
            setError(`Erro ao alterar status: ${err.response?.data?.message || err.message}`);
            setShowDeactivateModal(false);
        } finally {
            setTogglingStatus(false);
        }
    }, [octokit, org, repoName, refreshTeam]);

    const handleSaveDescription = useCallback(async () => {
        if (!octokit) return;
        setSavingDescription(true);
        setError(null);
        setSuccess(null);
        try {
            await updateDescription({ octokit, org, repoName, description: descriptionText.trim().substring(0, DESCRIPTION_MAX_LENGTH) });
            setSuccess('Descrição do projeto atualizada com sucesso!');
            setEditingDescription(false);
            await refreshTeam();
        } catch (err) {
            setError(`Erro ao salvar descrição: ${err.response?.data?.message || err.message}`);
        } finally {
            setSavingDescription(false);
        }
    }, [octokit, org, repoName, descriptionText, refreshTeam]);

    return (
        <div className="py-4">
            <Row className="justify-content-center">
                <Col md={11} lg={9}>
                    {/* Header */}
                    <div className="d-flex align-items-center gap-3 mb-4">
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => navigate('/')}
                            className="d-flex align-items-center gap-1"
                        >
                            <ArrowLeft size={16} /> Voltar
                        </Button>
                        <div className="flex-grow-1">
                            <h2 className="fw-bold text-dark mb-0">Gerenciar Time</h2>
                            <p className="text-muted mb-0 small">
                                Repositório: <strong>{repoName}</strong>
                                {repo && (
                                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer"
                                        className="ms-2 text-primary text-decoration-none">
                                        <ExternalLink size={12} className="mb-1" /> Ver no GitHub
                                    </a>
                                )}
                            </p>
                        </div>
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={handleRefresh}
                            className="d-flex align-items-center gap-1"
                        >
                            <RefreshCw size={14} /> Atualizar
                        </Button>
                    </div>

                    {/* Alertas */}
                    {error && <Alert variant="danger" dismissible onClose={() => setError(null)} className="d-flex align-items-center gap-2"><XCircle size={18} /> {error}</Alert>}
                    {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="d-flex align-items-center gap-2"><CheckCircle size={18} /> {success}</Alert>}

                    {/* Card: Status */}
                    <Card className={`shadow-sm border-0 mb-4 ${isActive ? 'border-start border-success border-4' : 'border-start border-danger border-4'}`} style={{ borderRadius: '12px' }}>
                        <Card.Body className="p-4">
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-3">
                                    <div className={`rounded-circle d-flex align-items-center justify-content-center ${isActive ? 'bg-success' : 'bg-danger'} bg-opacity-10`}
                                        style={{ width: '48px', height: '48px' }}>
                                        <Power size={24} className={isActive ? 'text-success' : 'text-danger'} />
                                    </div>
                                    <div>
                                        <h5 className="mb-0 fw-bold">
                                            Status: {isActive
                                                ? <span className="text-success">Ativo</span>
                                                : <span className="text-danger">Inativo</span>}
                                        </h5>
                                        <p className="mb-0 text-muted small">
                                            {isActive
                                                ? 'Este time está ativo e aparece no painel principal.'
                                                : 'Este time está inativo. Não aparece no painel por padrão.'}
                                        </p>
                                    </div>
                                </div>
                                {isActive ? (
                                    <Button variant="outline-danger" onClick={() => setShowDeactivateModal(true)} disabled={togglingStatus} className="d-flex align-items-center gap-2">
                                        <Power size={16} /> Desativar Time
                                    </Button>
                                ) : (
                                    <Button variant="success" onClick={() => handleToggleStatus(true)} disabled={togglingStatus} className="d-flex align-items-center gap-2">
                                        <Power size={16} /> Reativar Time
                                    </Button>
                                )}
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Card: Descrição */}
                    <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                        <Card.Header className="bg-white border-bottom py-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <h5 className="mb-0 d-flex align-items-center gap-2 text-primary"><FileText size={20} /> Descrição do Projeto</h5>
                                {!editingDescription ? (
                                    <Button variant="outline-primary" size="sm" onClick={() => setEditingDescription(true)} className="d-flex align-items-center gap-1">
                                        <Edit3 size={14} /> Editar
                                    </Button>
                                ) : (
                                    <div className="d-flex gap-2">
                                        <Button variant="outline-secondary" size="sm"
                                            onClick={() => { setEditingDescription(false); setDescriptionText(repo?.description || ''); }}
                                            disabled={savingDescription}>Cancelar</Button>
                                        <Button variant="success" size="sm" disabled={savingDescription}
                                            onClick={handleSaveDescription} className="d-flex align-items-center gap-1">
                                            {savingDescription ? 'Salvando...' : <><Save size={14} /> Salvar</>}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card.Header>
                        <Card.Body className="p-4">
                            {editingDescription ? (
                                <>
                                    <Form.Control as="textarea" rows={3} placeholder="Descreva brevemente o projeto..."
                                        value={descriptionText}
                                        onChange={(e) => setDescriptionText(e.target.value.substring(0, DESCRIPTION_MAX_LENGTH))}
                                        disabled={savingDescription} maxLength={DESCRIPTION_MAX_LENGTH} />
                                    <div className="d-flex justify-content-between mt-1">
                                        <Form.Text className="text-muted">Será salva como descrição do repositório no GitHub.</Form.Text>
                                        <Form.Text className={descriptionText.length > DESCRIPTION_MAX_LENGTH * 0.9 ? 'text-danger fw-bold' : 'text-muted'}>
                                            {descriptionText.length}/{DESCRIPTION_MAX_LENGTH}
                                        </Form.Text>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    {repo?.description
                                        ? <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{repo.description}</p>
                                        : <p className="mb-0 text-muted fst-italic">Nenhuma descrição definida.</p>}
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Card: Progresso BMC */}
                    <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                        <Card.Header className="bg-white border-bottom py-3">
                            <div className="d-flex align-items-center justify-content-between">
                                <h5 className="mb-0 d-flex align-items-center gap-2 text-primary"><BarChart3 size={20} /> Progresso BMC</h5>
                                {progress.hasProgress && (
                                    <Button variant="outline-primary" size="sm"
                                        onClick={() => navigate(`/editar-progresso/${repoName}`)}
                                        className="d-flex align-items-center gap-1">
                                        <Edit3 size={14} /> Editar Progresso
                                    </Button>
                                )}
                            </div>
                        </Card.Header>
                        <Card.Body className="p-4">
                            {progress.hasProgress ? (
                                <>
                                    <div className="d-flex align-items-center gap-3 mb-3">
                                        <span className="fw-bold">Status Geral:</span>
                                        <span className="text-primary fw-bold">{progress.currentStep} de 9 ({progress.percentage}%)</span>
                                    </div>
                                    <div className="progress mb-3" style={{ height: '10px', borderRadius: '5px' }}>
                                        <div
                                            className={`progress-bar ${progress.percentage === 100 ? 'bg-success' : 'bg-primary'}`}
                                            style={{ width: `${progress.percentage}%` }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-3 text-muted">
                                    <FileText size={32} strokeWidth={1} className="mb-2 opacity-50" />
                                    <p className="mb-0">Arquivo PROGRESSO_BMC.md não encontrado.</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Card: Adicionar colaborador */}
                    <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                        <Card.Header className="bg-white border-bottom py-3">
                            <h5 className="mb-0 d-flex align-items-center gap-2 text-success"><UserPlus size={20} /> Adicionar Colaborador</h5>
                        </Card.Header>
                        <Card.Body className="p-4">
                            <Form onSubmit={handleAddCollaborator}>
                                <Form.Label className="small fw-bold text-muted mb-2">USERNAME DO GITHUB</Form.Label>
                                <InputGroup className="mb-3">
                                    <InputGroup.Text className="bg-light border-end-0">@</InputGroup.Text>
                                    <Form.Control
                                        type="text"
                                        placeholder="nome_do_usuario"
                                        value={newUsername}
                                        onChange={(e) => { setNewUsername(e.target.value); setUserPreview(null); }}
                                        disabled={adding}
                                    />
                                    <Button variant="outline-primary" onClick={handleCheckUser} disabled={!newUsername.trim() || validatingUser}>
                                        {validatingUser ? 'Verificando...' : <><Search size={16} /> Verificar</>}
                                    </Button>
                                </InputGroup>
                                {userPreview && (
                                    <div className={`p-3 rounded mb-3 ${userPreview.valid ? 'bg-success bg-opacity-10 border border-success border-opacity-25' : 'bg-danger bg-opacity-10 border border-danger border-opacity-25'}`}>
                                        {userPreview.valid ? (
                                            <div className="d-flex align-items-center gap-3">
                                                <img src={userPreview.avatarUrl} alt={userPreview.username} className="rounded-circle shadow-sm" width="40" height="40" />
                                                <div>
                                                    <div className="fw-bold">@{userPreview.username}</div>
                                                    {userPreview.name !== userPreview.username && <div className="small text-muted">{userPreview.name}</div>}
                                                </div>
                                                <Badge bg="success" className="ms-auto"><CheckCircle size={12} className="me-1" /> Usuário válido</Badge>
                                            </div>
                                        ) : (
                                            <div className="d-flex align-items-center gap-2 text-danger">
                                                <XCircle size={20} />
                                                <div><div className="fw-bold">@{userPreview.username}</div><div className="small">{userPreview.error}</div></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <Button variant="success" type="submit" disabled={!userPreview?.valid || adding} className="d-flex align-items-center gap-2">
                                    {adding ? 'Adicionando...' : <><UserPlus size={16} /> Enviar Convite</>}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>

                    {/* Card: Convites pendentes */}
                    {pendingInvites.length > 0 && (
                        <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                            <Card.Header className="bg-white border-bottom py-3">
                                <h5 className="mb-0 d-flex align-items-center gap-2 text-warning">
                                    <Mail size={20} /> Convites Pendentes
                                    <Badge bg="warning" text="dark" pill className="ms-1">{pendingInvites.length}</Badge>
                                </h5>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <Table hover borderless className="mb-0">
                                    <tbody>
                                        {pendingInvites.map((invite) => (
                                            <tr key={invite.id} className="align-middle">
                                                <td className="px-4 py-3">
                                                    <div className="d-flex align-items-center gap-2">
                                                        {invite.invitee?.avatar_url && (
                                                            <img src={invite.invitee.avatar_url} alt={invite.invitee.login} className="rounded-circle" width="32" height="32" />
                                                        )}
                                                        <div>
                                                            <span className="fw-semibold">@{invite.invitee?.login || 'Desconhecido'}</span>
                                                            <div className="small text-muted">Convidado em {new Date(invite.created_at).toLocaleDateString('pt-BR')}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><Badge bg="warning" text="dark" className="d-inline-flex align-items-center gap-1"><Mail size={12} /> Aguardando aceite</Badge></td>
                                                <td className="text-end px-4">
                                                    <Button variant="outline-danger" size="sm" onClick={() => handleCancelInvite(invite.id, invite.invitee?.login)}>
                                                        <XCircle size={14} className="me-1" /> Cancelar
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    )}

                    {/* Card: Colaboradores */}
                    <Card className="shadow-sm border-0" style={{ borderRadius: '12px' }}>
                        <Card.Header className="bg-white border-bottom py-3">
                            <h5 className="mb-0 d-flex align-items-center gap-2 text-primary">
                                <Users size={20} /> Colaboradores com Acesso
                                <Badge bg="primary" pill className="ms-1">{collaborators.length}</Badge>
                            </h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {collaborators.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <Users size={48} strokeWidth={1} className="mb-3 opacity-50" />
                                    <p className="mb-1">Nenhum colaborador direto encontrado.</p>
                                    <small>Adicione colaboradores usando o formulário acima.</small>
                                </div>
                            ) : (
                                <Table hover borderless className="mb-0">
                                    <thead>
                                        <tr className="border-bottom">
                                            <th className="text-muted small fw-bold px-4 py-3">USUÁRIO</th>
                                            <th className="text-muted small fw-bold py-3">PERMISSÃO</th>
                                            <th className="text-muted small fw-bold text-end px-4 py-3">AÇÕES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {collaborators.map((user) => (
                                            <tr key={user.id} className="align-middle">
                                                <td className="px-4 py-3">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <img src={user.avatar_url} alt={user.login} className="rounded-circle shadow-sm" width="36" height="36" />
                                                        <div>
                                                            <span className="fw-semibold">@{user.login}</span>
                                                            <a href={`https://github.com/${user.login}`} target="_blank" rel="noopener noreferrer" className="ms-2 text-muted small text-decoration-none">
                                                                <ExternalLink size={10} />
                                                            </a>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <Badge bg="light" text="dark" className="d-inline-flex align-items-center gap-1 border" style={{ padding: '5px 10px' }}>
                                                        <Shield size={12} />
                                                        {user.role_name || (user.permissions?.admin ? 'Admin' : user.permissions?.push ? 'Push' : 'Read')}
                                                    </Badge>
                                                </td>
                                                <td className="text-end px-4">
                                                    <Button variant="outline-danger" size="sm"
                                                        onClick={() => { setUserToRemove(user); setShowRemoveModal(true); }}
                                                        className="d-flex align-items-center gap-1 ms-auto">
                                                        <UserMinus size={14} /> Remover
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>

                </Col>
            </Row>

            {/* Modal: Confirmar remoção */}
            <Modal show={showRemoveModal} onHide={() => setShowRemoveModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">Confirmar Remoção</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Tem certeza que deseja remover <strong>@{userToRemove?.login}</strong> do repositório?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={() => setShowRemoveModal(false)}>Cancelar</Button>
                    <Button variant="danger" onClick={handleRemoveCollaborator} disabled={removing}>
                        {removing ? 'Removendo...' : <><UserMinus size={16} className="me-1" /> Remover</>}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal: Confirmar desativação */}
            <Modal show={showDeactivateModal} onHide={() => setShowDeactivateModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fw-bold">Desativar Time</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Deseja marcar o time <strong>{repoName}</strong> como inativo? Ele não aparecerá no painel principal.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={() => setShowDeactivateModal(false)}>Cancelar</Button>
                    <Button variant="danger" onClick={() => handleToggleStatus(false)} disabled={togglingStatus}>
                        {togglingStatus ? 'Processando...' : 'Desativar'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

// ─── Componente raiz com token guard ─────────────────────────────────────────

const GerenciarTime = () => {
    const { token } = useGithubClient();
    const navigate = useNavigate();
    const { repoName } = useParams();

    if (!token) {
        return (
            <div className="text-center py-5">
                <AlertCircle size={48} className="text-warning mb-3" />
                <h3>Token Não Configurado</h3>
                <p className="text-muted">Você precisa configurar seu Personal Access Token.</p>
                <Button as={Link} to="/configuracoes" variant="primary">Ir para Configurações</Button>
            </div>
        );
    }

    return (
        <TeamErrorBoundary>
            <TeamContent repoName={repoName} />
        </TeamErrorBoundary>
    );
};

export default GerenciarTime;
