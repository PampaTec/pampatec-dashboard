import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Alert, Spinner, Row, Col, ListGroup, Badge, Form, InputGroup, Table, Modal } from 'react-bootstrap';
import { Users, UserPlus, UserMinus, CheckCircle, AlertCircle, XCircle, ArrowLeft, ExternalLink, Shield, RefreshCw, Search, Mail, Power } from 'lucide-react';
import { Octokit } from '@octokit/rest';
import { useParams, useNavigate, Link } from 'react-router-dom';

const GerenciarTime = () => {
    const { repoName } = useParams();
    const navigate = useNavigate();

    const [collaborators, setCollaborators] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [repoInfo, setRepoInfo] = useState(null);

    // Adicionar colaborador
    const [newUsername, setNewUsername] = useState('');
    const [adding, setAdding] = useState(false);
    const [validatingUser, setValidatingUser] = useState(false);
    const [userPreview, setUserPreview] = useState(null); // { valid, username, name, avatarUrl, error }

    // Remover colaborador
    const [showRemoveModal, setShowRemoveModal] = useState(false);
    const [userToRemove, setUserToRemove] = useState(null);
    const [removing, setRemoving] = useState(false);

    // Status ativo/inativo
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);

    const org = localStorage.getItem('pampatec_gh_org') || 'PampaTec';
    const token = localStorage.getItem('pampatec_gh_token');

    // Carregar informações do repositório e colaboradores
    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);

        try {
            const octokit = new Octokit({ auth: token });

            // Info do repositório
            const { data: repo } = await octokit.repos.get({
                owner: org,
                repo: repoName
            });
            setRepoInfo(repo);

            // Colaboradores diretos
            const { data: collabs } = await octokit.repos.listCollaborators({
                owner: org,
                repo: repoName,
                affiliation: 'direct'
            });
            setCollaborators(collabs);

            // Convites pendentes
            try {
                const { data: invites } = await octokit.repos.listInvitations({
                    owner: org,
                    repo: repoName
                });
                setPendingInvites(invites);
            } catch {
                setPendingInvites([]);
            }

        } catch (err) {
            console.error(err);
            setError(`Erro ao carregar dados: ${err.response?.data?.message || err.message}`);
        } finally {
            setLoading(false);
        }
    }, [org, token, repoName]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Verificar username antes de adicionar
    const handleCheckUser = async () => {
        if (!newUsername.trim() || !token) return;

        setValidatingUser(true);
        setUserPreview(null);

        try {
            const octokit = new Octokit({ auth: token });
            const { data } = await octokit.users.getByUsername({ username: newUsername.trim() });
            setUserPreview({
                valid: true,
                username: data.login,
                name: data.name || data.login,
                avatarUrl: data.avatar_url
            });
        } catch (err) {
            setUserPreview({
                valid: false,
                username: newUsername.trim(),
                error: err.response?.status === 404 ? 'Usuário não encontrado no GitHub' : err.message
            });
        } finally {
            setValidatingUser(false);
        }
    };

    // Adicionar colaborador
    const handleAddCollaborator = async (e) => {
        e.preventDefault();
        if (!userPreview?.valid || !token) return;

        setAdding(true);
        setError(null);
        setSuccess(null);

        try {
            const octokit = new Octokit({ auth: token });

            await octokit.repos.addCollaborator({
                owner: org,
                repo: repoName,
                username: userPreview.username,
                permission: 'push'
            });

            setSuccess(`Convite enviado para @${userPreview.username}! O usuário precisa aceitar o convite.`);
            setNewUsername('');
            setUserPreview(null);
            fetchData(); // Recarregar lista
        } catch (err) {
            setError(`Erro ao adicionar @${userPreview.username}: ${err.response?.data?.message || err.message}`);
        } finally {
            setAdding(false);
        }
    };

    // Remover colaborador
    const handleRemoveCollaborator = async () => {
        if (!userToRemove || !token) return;

        setRemoving(true);
        setError(null);
        setSuccess(null);

        try {
            const octokit = new Octokit({ auth: token });

            await octokit.repos.removeCollaborator({
                owner: org,
                repo: repoName,
                username: userToRemove.login
            });

            setSuccess(`@${userToRemove.login} foi removido do repositório.`);
            setShowRemoveModal(false);
            setUserToRemove(null);
            fetchData();
        } catch (err) {
            setError(`Erro ao remover @${userToRemove.login}: ${err.response?.data?.message || err.message}`);
            setShowRemoveModal(false);
        } finally {
            setRemoving(false);
        }
    };

    // Cancelar convite pendente
    const handleCancelInvite = async (invitationId, username) => {
        if (!token) return;
        setError(null);
        setSuccess(null);

        try {
            const octokit = new Octokit({ auth: token });

            await octokit.repos.deleteInvitation({
                owner: org,
                repo: repoName,
                invitation_id: invitationId
            });

            setSuccess(`Convite para @${username} foi cancelado.`);
            fetchData();
        } catch (err) {
            setError(`Erro ao cancelar convite: ${err.response?.data?.message || err.message}`);
        }
    };

    // Ativar/Desativar time (adiciona ou remove o tópico 'pampatec-inativo')
    const isActive = repoInfo ? !(repoInfo.topics && repoInfo.topics.includes('pampatec-inativo')) : true;

    const handleToggleStatus = async (activate) => {
        if (!token) return;
        setTogglingStatus(true);
        setError(null);
        setSuccess(null);

        try {
            const octokit = new Octokit({ auth: token });

            // Pega os tópicos atuais
            const { data: currentTopics } = await octokit.repos.getAllTopics({
                owner: org,
                repo: repoName
            });

            let newTopics = currentTopics.names || [];

            if (activate) {
                // Remover 'pampatec-inativo'
                newTopics = newTopics.filter(t => t !== 'pampatec-inativo');
            } else {
                // Adicionar 'pampatec-inativo' se não existir
                if (!newTopics.includes('pampatec-inativo')) {
                    newTopics.push('pampatec-inativo');
                }
            }

            // Garantir que 'pampatec-equipe' sempre esteja presente
            if (!newTopics.includes('pampatec-equipe')) {
                newTopics.push('pampatec-equipe');
            }

            await octokit.repos.replaceAllTopics({
                owner: org,
                repo: repoName,
                names: newTopics
            });

            setSuccess(activate
                ? `Time '${repoName}' foi reativado com sucesso!`
                : `Time '${repoName}' foi marcado como inativo.`
            );
            setShowDeactivateModal(false);
            fetchData(); // Recarregar dados
        } catch (err) {
            setError(`Erro ao alterar status: ${err.response?.data?.message || err.message}`);
            setShowDeactivateModal(false);
        } finally {
            setTogglingStatus(false);
        }
    };

    // Sem token configurado
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
        <div className="py-4">
            <Row className="justify-content-center">
                <Col md={11} lg={9}>

                    {/* Header com navegação */}
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
                                {repoInfo && (
                                    <a href={repoInfo.html_url} target="_blank" rel="noopener noreferrer"
                                        className="ms-2 text-primary text-decoration-none">
                                        <ExternalLink size={12} className="mb-1" /> Ver no GitHub
                                    </a>
                                )}
                            </p>
                        </div>
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={fetchData}
                            disabled={loading}
                            className="d-flex align-items-center gap-1"
                        >
                            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Atualizar
                        </Button>
                    </div>

                    {/* Alertas */}
                    {error && (
                        <Alert variant="danger" dismissible onClose={() => setError(null)} className="d-flex align-items-center gap-2">
                            <XCircle size={18} /> {error}
                        </Alert>
                    )}
                    {success && (
                        <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="d-flex align-items-center gap-2">
                            <CheckCircle size={18} /> {success}
                        </Alert>
                    )}

                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-3 text-muted">Carregando informações do repositório...</p>
                        </div>
                    ) : (
                        <>
                            {/* Card: Status do Time */}
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
                                                    Status: {isActive ? (
                                                        <span className="text-success">Ativo</span>
                                                    ) : (
                                                        <span className="text-danger">Inativo</span>
                                                    )}
                                                </h5>
                                                <p className="mb-0 text-muted small">
                                                    {isActive
                                                        ? 'Este time está ativo e aparece no painel principal.'
                                                        : 'Este time está inativo. Não aparece no painel principal por padrão.'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        {isActive ? (
                                            <Button
                                                variant="outline-danger"
                                                onClick={() => setShowDeactivateModal(true)}
                                                disabled={togglingStatus}
                                                className="d-flex align-items-center gap-2"
                                            >
                                                {togglingStatus ? (
                                                    <><Spinner animation="border" size="sm" /> Processando...</>
                                                ) : (
                                                    <><Power size={16} /> Desativar Time</>
                                                )}
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="success"
                                                onClick={() => handleToggleStatus(true)}
                                                disabled={togglingStatus}
                                                className="d-flex align-items-center gap-2"
                                            >
                                                {togglingStatus ? (
                                                    <><Spinner animation="border" size="sm" /> Reativando...</>
                                                ) : (
                                                    <><Power size={16} /> Reativar Time</>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Card: Adicionar novo colaborador */}
                            <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                                <Card.Header className="bg-white border-bottom py-3">
                                    <h5 className="mb-0 d-flex align-items-center gap-2 text-success">
                                        <UserPlus size={20} /> Adicionar Colaborador
                                    </h5>
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
                                                onChange={(e) => {
                                                    setNewUsername(e.target.value);
                                                    setUserPreview(null);
                                                }}
                                                disabled={adding}
                                            />
                                            <Button
                                                variant="outline-primary"
                                                onClick={handleCheckUser}
                                                disabled={!newUsername.trim() || validatingUser}
                                            >
                                                {validatingUser ? (
                                                    <Spinner animation="border" size="sm" />
                                                ) : (
                                                    <><Search size={16} /> Verificar</>
                                                )}
                                            </Button>
                                        </InputGroup>

                                        {/* Preview do usuário */}
                                        {userPreview && (
                                            <div className={`p-3 rounded mb-3 ${userPreview.valid ? 'bg-success bg-opacity-10 border border-success border-opacity-25' : 'bg-danger bg-opacity-10 border border-danger border-opacity-25'}`}>
                                                {userPreview.valid ? (
                                                    <div className="d-flex align-items-center gap-3">
                                                        <img
                                                            src={userPreview.avatarUrl}
                                                            alt={userPreview.username}
                                                            className="rounded-circle shadow-sm"
                                                            width="40"
                                                            height="40"
                                                        />
                                                        <div>
                                                            <div className="fw-bold">@{userPreview.username}</div>
                                                            {userPreview.name !== userPreview.username && (
                                                                <div className="small text-muted">{userPreview.name}</div>
                                                            )}
                                                        </div>
                                                        <Badge bg="success" className="ms-auto">
                                                            <CheckCircle size={12} className="me-1" /> Usuário válido
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <div className="d-flex align-items-center gap-2 text-danger">
                                                        <XCircle size={20} />
                                                        <div>
                                                            <div className="fw-bold">@{userPreview.username}</div>
                                                            <div className="small">{userPreview.error}</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <Button
                                            variant="success"
                                            type="submit"
                                            disabled={!userPreview?.valid || adding}
                                            className="d-flex align-items-center gap-2"
                                        >
                                            {adding ? (
                                                <><Spinner animation="border" size="sm" /> Adicionando...</>
                                            ) : (
                                                <><UserPlus size={16} /> Enviar Convite</>
                                            )}
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
                                                {pendingInvites.map(invite => (
                                                    <tr key={invite.id} className="align-middle">
                                                        <td className="px-4 py-3">
                                                            <div className="d-flex align-items-center gap-2">
                                                                {invite.invitee?.avatar_url && (
                                                                    <img
                                                                        src={invite.invitee.avatar_url}
                                                                        alt={invite.invitee.login}
                                                                        className="rounded-circle"
                                                                        width="32"
                                                                        height="32"
                                                                    />
                                                                )}
                                                                <div>
                                                                    <span className="fw-semibold">@{invite.invitee?.login || 'Desconhecido'}</span>
                                                                    <div className="small text-muted">
                                                                        Convidado em {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <Badge bg="warning" text="dark" className="d-inline-flex align-items-center gap-1">
                                                                <Mail size={12} /> Aguardando aceite
                                                            </Badge>
                                                        </td>
                                                        <td className="text-end px-4">
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => handleCancelInvite(invite.id, invite.invitee?.login)}
                                                            >
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

                            {/* Card: Colaboradores ativos */}
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
                                                {collaborators.map(user => (
                                                    <tr key={user.id} className="align-middle">
                                                        <td className="px-4 py-3">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <img
                                                                    src={user.avatar_url}
                                                                    alt={user.login}
                                                                    className="rounded-circle shadow-sm"
                                                                    width="36"
                                                                    height="36"
                                                                />
                                                                <div>
                                                                    <span className="fw-semibold">@{user.login}</span>
                                                                    <a href={`https://github.com/${user.login}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="ms-2 text-muted small text-decoration-none">
                                                                        <ExternalLink size={10} />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <Badge
                                                                bg="light"
                                                                text="dark"
                                                                className="d-inline-flex align-items-center gap-1 border"
                                                                style={{ padding: '5px 10px' }}
                                                            >
                                                                <Shield size={12} />
                                                                {user.role_name || (user.permissions?.admin ? 'Admin' : user.permissions?.push ? 'Push' : 'Read')}
                                                            </Badge>
                                                        </td>
                                                        <td className="text-end px-4">
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setUserToRemove(user);
                                                                    setShowRemoveModal(true);
                                                                }}
                                                                className="d-flex align-items-center gap-1 ms-auto"
                                                            >
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
                        </>
                    )}
                </Col>
            </Row>

            {/* Modal de confirmação de remoção */}
            <Modal show={showRemoveModal} onHide={() => setShowRemoveModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="d-flex align-items-center gap-2 text-danger">
                        <UserMinus size={22} /> Confirmar Remoção
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {userToRemove && (
                        <div className="text-center">
                            <img
                                src={userToRemove.avatar_url}
                                alt={userToRemove.login}
                                className="rounded-circle shadow-sm mb-3"
                                width="64"
                                height="64"
                            />
                            <p>
                                Deseja remover <strong>@{userToRemove.login}</strong> do repositório <strong>{repoName}</strong>?
                            </p>
                            <p className="text-muted small">
                                O usuário perderá acesso imediatamente e precisará de um novo convite para acessar novamente.
                            </p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="secondary" onClick={() => setShowRemoveModal(false)} disabled={removing}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={handleRemoveCollaborator} disabled={removing}
                        className="d-flex align-items-center gap-2">
                        {removing ? (
                            <><Spinner animation="border" size="sm" /> Removendo...</>
                        ) : (
                            <><UserMinus size={16} /> Confirmar Remoção</>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal de confirmação de desativação */}
            <Modal show={showDeactivateModal} onHide={() => setShowDeactivateModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="d-flex align-items-center gap-2 text-danger">
                        <Power size={22} /> Desativar Time
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="text-center">
                        <div className="rounded-circle d-flex align-items-center justify-content-center bg-danger bg-opacity-10 mx-auto mb-3" style={{ width: '64px', height: '64px' }}>
                            <Power size={32} className="text-danger" />
                        </div>
                        <p>
                            Deseja desativar o time <strong>{repoName}</strong>?
                        </p>
                        <p className="text-muted small">
                            O repositório <strong>não será excluído</strong> e todo o progresso será preservado.
                            O time deixará de aparecer no painel principal e poderá ser <strong>reativado a qualquer momento</strong>.
                        </p>
                    </div>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="secondary" onClick={() => setShowDeactivateModal(false)} disabled={togglingStatus}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={() => handleToggleStatus(false)} disabled={togglingStatus}
                        className="d-flex align-items-center gap-2">
                        {togglingStatus ? (
                            <><Spinner animation="border" size="sm" /> Desativando...</>
                        ) : (
                            <><Power size={16} /> Confirmar Desativação</>
                        )}
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

export default GerenciarTime;
