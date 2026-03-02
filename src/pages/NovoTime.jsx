import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner, Row, Col, ListGroup, Badge } from 'react-bootstrap';
import { Rocket, CheckCircle, AlertCircle, Github, XCircle, Clock, UserCheck, Search, FileText } from 'lucide-react';
import { Octokit } from '@octokit/rest';
import { useNavigate } from 'react-router-dom';

// Helper: aguarda N milissegundos
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: aguarda o repositório estar totalmente pronto (polling)
const waitForRepoReady = async (octokit, owner, repo, maxAttempts = 10, intervalMs = 2000) => {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const { data } = await octokit.repos.get({ owner, repo });
            if (data && data.id) {
                try {
                    await octokit.repos.getContent({ owner, repo, path: '' });
                    return true;
                } catch {
                    // Conteúdo ainda não disponível
                }
            }
        } catch {
            // Repo ainda não existe/pronto
        }
        await sleep(intervalMs);
    }
    return false;
};

const REPO_NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 350;

const NovoTime = () => {
    const navigate = useNavigate();
    const [startupName, setStartupName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [collaborators, setCollaborators] = useState('');
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [operationLog, setOperationLog] = useState([]);
    const [validatedUsers, setValidatedUsers] = useState([]); // { username, valid, error?, avatarUrl? }
    const [validationDone, setValidationDone] = useState(false);
    const [createdRepoName, setCreatedRepoName] = useState('');

    const addLog = (entry) => {
        setOperationLog(prev => [...prev, entry]);
    };

    // ETAPA 1: Validar todos os usernames
    const handleValidate = async () => {
        const token = localStorage.getItem('pampatec_gh_token');
        if (!token) {
            setStatus({ type: 'danger', message: 'Token não configurado. Vá em Configurações primeiro.' });
            return;
        }

        const userList = collaborators.split(',').map(u => u.trim()).filter(u => u !== '');

        if (userList.length === 0) {
            // Sem colaboradores — pode prosseguir direto
            setValidatedUsers([]);
            setValidationDone(true);
            return;
        }

        setValidating(true);
        setStatus({ type: 'info', message: `Validando ${userList.length} username(s) no GitHub...` });
        setValidatedUsers([]);

        const octokit = new Octokit({ auth: token });
        const results = [];

        for (const username of userList) {
            try {
                const { data } = await octokit.users.getByUsername({ username });
                results.push({ username, valid: true, avatarUrl: data.avatar_url, name: data.name || username });
            } catch (err) {
                const reason = err.response?.status === 404
                    ? 'Usuário não encontrado no GitHub'
                    : err.message;
                results.push({ username, valid: false, error: reason });
            }
        }

        setValidatedUsers(results);
        setValidationDone(true);
        setValidating(false);

        const invalidCount = results.filter(r => !r.valid).length;
        if (invalidCount > 0) {
            setStatus({
                type: 'danger',
                message: `${invalidCount} username(s) inválido(s). Corrija antes de criar o repositório.`
            });
        } else {
            setStatus({
                type: 'success',
                message: `Todos os ${results.length} username(s) são válidos! Pode criar o repositório.`
            });
        }
    };

    // Resetar validação quando o campo de colaboradores mudar
    const handleCollaboratorsChange = (e) => {
        setCollaborators(e.target.value);
        setValidationDone(false);
        setValidatedUsers([]);
        setStatus({ type: '', message: '' });
    };

    // Verifica se pode prosseguir com a criação
    const canCreate = () => {
        if (!startupName.trim()) return false;
        if (loading || validating) return false;

        const userList = collaborators.split(',').map(u => u.trim()).filter(u => u !== '');

        // Se não há colaboradores, pode criar direto
        if (userList.length === 0) return true;

        // Se tem colaboradores, precisa ter validado e todos serem válidos
        if (!validationDone) return false;
        return validatedUsers.every(u => u.valid);
    };

    // ETAPA 2: Criar repositório e adicionar colaboradores validados
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Se tem colaboradores e não validou ainda, validar primeiro
        const userList = collaborators.split(',').map(u => u.trim()).filter(u => u !== '');
        if (userList.length > 0 && !validationDone) {
            await handleValidate();
            return;
        }

        // Se tem colaboradores inválidos, bloquear
        if (validatedUsers.some(u => !u.valid)) {
            setStatus({ type: 'danger', message: 'Corrija os usernames inválidos antes de prosseguir.' });
            return;
        }

        setLoading(true);
        setStatus({ type: '', message: '' });
        setOperationLog([]);

        const token = localStorage.getItem('pampatec_gh_token');
        const org = localStorage.getItem('pampatec_gh_org') || 'PampaTec';
        const templateRepo = 'jornada-pre-incubacao-template';

        if (!token) {
            setStatus({ type: 'danger', message: 'Token não configurado. Vá em Configurações primeiro.' });
            setLoading(false);
            return;
        }

        try {
            const octokit = new Octokit({ auth: token });

            // 1. Criar repositório a partir do template
            const repoName = startupName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '').substring(0, REPO_NAME_MAX_LENGTH);

            const repoDescription = projectDescription.trim()
                ? projectDescription.trim().substring(0, DESCRIPTION_MAX_LENGTH)
                : `Projeto de Pré-Incubação - Startup ${startupName}`;

            setStatus({ type: 'info', message: `Criando repositório '${repoName}'...` });
            addLog({ type: 'info', message: `Criando repositório '${repoName}' a partir do template...` });

            await octokit.repos.createUsingTemplate({
                template_owner: org,
                template_repo: templateRepo,
                owner: org,
                name: repoName,
                private: true,
                description: repoDescription
            });

            addLog({ type: 'success', message: `Repositório '${repoName}' criado com sucesso.` });

            // 2. Aguardar o repositório ficar pronto
            setStatus({ type: 'info', message: 'Aguardando o GitHub finalizar a cópia do template...' });
            addLog({ type: 'info', message: 'Aguardando a cópia do template ser concluída...' });

            const repoReady = await waitForRepoReady(octokit, org, repoName);

            if (!repoReady) {
                addLog({ type: 'warning', message: 'Template demorou mais que o esperado. Continuando...' });
            } else {
                addLog({ type: 'success', message: 'Repositório pronto com conteúdo do template.' });
            }

            // 3. Adicionar tópico identificador
            setStatus({ type: 'info', message: 'Adicionando identificação PampaTec...' });
            await octokit.repos.replaceAllTopics({
                owner: org,
                repo: repoName,
                names: ['pampatec-equipe']
            });
            addLog({ type: 'success', message: `Tópico 'pampatec-equipe' adicionado.` });

            // 4. Adicionar colaboradores (já validados)
            const validUsers = validatedUsers.filter(u => u.valid);
            const collabResults = { success: [], failed: [] };

            if (validUsers.length > 0) {
                setStatus({ type: 'info', message: `Adicionando ${validUsers.length} colaborador(es)...` });

                for (const user of validUsers) {
                    try {
                        await octokit.repos.addCollaborator({
                            owner: org,
                            repo: repoName,
                            username: user.username,
                            permission: 'push'
                        });
                        addLog({ type: 'success', message: `✅ Convite enviado para @${user.username}.` });
                        collabResults.success.push(user.username);
                    } catch (err) {
                        const errorMsg = err.response?.data?.message || err.message || 'Erro desconhecido';
                        addLog({ type: 'danger', message: `❌ Falha ao adicionar @${user.username}: ${errorMsg}` });
                        collabResults.failed.push({ username: user.username, reason: errorMsg });
                    }
                }
            }

            // 5. Mensagem final
            const successCount = collabResults.success.length;
            const failedCount = collabResults.failed.length;

            if (validUsers.length === 0) {
                setStatus({
                    type: 'success',
                    message: `Repositório '${repoName}' criado com sucesso!`
                });
            } else if (failedCount === 0) {
                setStatus({
                    type: 'success',
                    message: `Repositório '${repoName}' criado e ${successCount} convite(s) enviado(s)!`
                });
            } else {
                setStatus({
                    type: 'warning',
                    message: `Repositório criado. ${successCount} convite(s) OK, ${failedCount} falha(s). Use "Gerenciar" no Dashboard para corrigir.`
                });
            }

            setCreatedRepoName(repoName);
            setStartupName('');
            setProjectDescription('');
            setCollaborators('');
            setValidatedUsers([]);
            setValidationDone(false);

        } catch (err) {
            console.error(err);
            addLog({ type: 'danger', message: `Erro: ${err.response?.data?.message || err.message}` });
            setStatus({
                type: 'danger',
                message: `Erro: ${err.response?.data?.message || err.message || 'Falha ao criar repositório'}`
            });
        } finally {
            setLoading(false);
        }
    };

    const hasInvalidUsers = validatedUsers.some(u => !u.valid);
    const hasCollaborators = collaborators.split(',').map(u => u.trim()).filter(u => u !== '').length > 0;

    return (
        <div className="py-4">
            <Row className="justify-content-center">
                <Col md={10} lg={8}>
                    <div className="mb-4">
                        <h2 className="fw-bold text-dark mb-1">Cadastrar Novo Time</h2>
                        <p className="text-muted">Inicie a jornada de uma nova startup criando seu ambiente de trabalho.</p>
                    </div>

                    <Card className="shadow-sm border-0">
                        <Card.Body className="p-4">
                            {status.message && (
                                <Alert variant={status.type} className="d-flex align-items-center gap-2 mb-4">
                                    {status.type === 'success' ? <CheckCircle size={20} /> :
                                        status.type === 'danger' ? <XCircle size={20} /> :
                                            status.type === 'warning' ? <AlertCircle size={20} /> :
                                                status.type === 'info' ? <Spinner animation="border" size="sm" /> :
                                                    <AlertCircle size={20} />}
                                    {status.message}
                                </Alert>
                            )}

                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-bold d-flex align-items-center gap-2">
                                        <Rocket size={18} className="text-primary" /> Nome da Startup
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Ex: PampaTech Solutions"
                                        value={startupName}
                                        onChange={(e) => setStartupName(e.target.value.substring(0, REPO_NAME_MAX_LENGTH))}
                                        required
                                        disabled={loading}
                                        size="lg"
                                        maxLength={REPO_NAME_MAX_LENGTH}
                                    />
                                    <div className="d-flex justify-content-between mt-1">
                                        <Form.Text className="text-muted">
                                            Isso definirá o nome do repositório no GitHub.
                                        </Form.Text>
                                        <Form.Text className={startupName.length > REPO_NAME_MAX_LENGTH * 0.9 ? 'text-danger fw-bold' : 'text-muted'}>
                                            {startupName.length}/{REPO_NAME_MAX_LENGTH}
                                        </Form.Text>
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-bold d-flex align-items-center gap-2">
                                        <FileText size={18} className="text-primary" /> Descrição do Projeto
                                    </Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        placeholder="Descreva brevemente o projeto da startup (ex: Plataforma de gestão para pequenos produtores rurais)"
                                        value={projectDescription}
                                        onChange={(e) => setProjectDescription(e.target.value.substring(0, DESCRIPTION_MAX_LENGTH))}
                                        disabled={loading}
                                        maxLength={DESCRIPTION_MAX_LENGTH}
                                    />
                                    <div className="d-flex justify-content-between mt-1">
                                        <Form.Text className="text-muted">
                                            Será salva como descrição do repositório no GitHub.
                                        </Form.Text>
                                        <Form.Text className={projectDescription.length > DESCRIPTION_MAX_LENGTH * 0.9 ? 'text-danger fw-bold' : 'text-muted'}>
                                            {projectDescription.length}/{DESCRIPTION_MAX_LENGTH}
                                        </Form.Text>
                                    </div>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold d-flex align-items-center gap-2">
                                        <Github size={18} className="text-primary" /> Colaboradores (Usernames do GitHub)
                                    </Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        placeholder="joao_gh, maria_dev, dev_pampa"
                                        value={collaborators}
                                        onChange={handleCollaboratorsChange}
                                        disabled={loading}
                                    />
                                    <Form.Text className="text-muted">
                                        Separe os nomes por vírgula. Todos serão verificados antes da criação do repositório.
                                    </Form.Text>
                                </Form.Group>

                                {/* Botão de validação */}
                                {hasCollaborators && !validationDone && (
                                    <div className="mb-4">
                                        <Button
                                            variant="outline-primary"
                                            onClick={handleValidate}
                                            disabled={validating || loading}
                                            className="d-flex align-items-center gap-2"
                                        >
                                            {validating ? (
                                                <><Spinner animation="border" size="sm" /> Verificando...</>
                                            ) : (
                                                <><Search size={16} /> Verificar Usernames</>
                                            )}
                                        </Button>
                                    </div>
                                )}

                                {/* Resultado da validação */}
                                {validatedUsers.length > 0 && (
                                    <div className="mb-4">
                                        <h6 className="fw-bold text-muted small mb-2">
                                            <UserCheck size={14} className="me-1" /> Resultado da Verificação
                                        </h6>
                                        <ListGroup variant="flush" className="border rounded">
                                            {validatedUsers.map((user, i) => (
                                                <ListGroup.Item
                                                    key={i}
                                                    className="py-2 px-3 d-flex align-items-center gap-2"
                                                >
                                                    {user.valid ? (
                                                        <>
                                                            <img
                                                                src={user.avatarUrl}
                                                                alt={user.username}
                                                                className="rounded-circle"
                                                                width="24"
                                                                height="24"
                                                            />
                                                            <CheckCircle size={16} className="text-success" />
                                                            <span className="fw-semibold">@{user.username}</span>
                                                            {user.name && user.name !== user.username && (
                                                                <span className="text-muted small">({user.name})</span>
                                                            )}
                                                            <Badge bg="success" className="ms-auto">Válido</Badge>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XCircle size={16} className="text-danger" />
                                                            <span className="fw-semibold text-danger">@{user.username}</span>
                                                            <span className="text-muted small">— {user.error}</span>
                                                            <Badge bg="danger" className="ms-auto">Inválido</Badge>
                                                        </>
                                                    )}
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                        {hasInvalidUsers && (
                                            <div className="mt-2 small text-danger d-flex align-items-center gap-1">
                                                <AlertCircle size={14} />
                                                Corrija os usernames inválidos no campo acima e clique em "Verificar" novamente.
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="d-grid mt-4">
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        size="lg"
                                        disabled={!canCreate()}
                                        className="py-3 fw-bold"
                                    >
                                        {loading ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                Criando...
                                            </>
                                        ) : hasCollaborators && !validationDone ? (
                                            'Verificar e Criar'
                                        ) : (
                                            'Criar Ambiente de Trabalho'
                                        )}
                                    </Button>

                                    {hasCollaborators && !validationDone && (
                                        <div className="text-center mt-2 small text-muted">
                                            Os usernames serão verificados automaticamente antes da criação.
                                        </div>
                                    )}
                                </div>
                            </Form>

                            {/* Log de operações */}
                            {operationLog.length > 0 && (
                                <div className="mt-4">
                                    <h6 className="fw-bold text-muted d-flex align-items-center gap-2 mb-3">
                                        <Clock size={16} /> Log de Operações
                                    </h6>
                                    <ListGroup variant="flush" className="border rounded" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                        {operationLog.map((log, i) => (
                                            <ListGroup.Item
                                                key={i}
                                                className="py-2 px-3 d-flex align-items-start gap-2 small"
                                                style={{
                                                    borderLeft: `3px solid ${log.type === 'success' ? '#198754' :
                                                        log.type === 'danger' ? '#dc3545' :
                                                            log.type === 'warning' ? '#ffc107' :
                                                                '#0d6efd'
                                                        }`
                                                }}
                                            >
                                                {log.type === 'success' && <CheckCircle size={14} className="text-success mt-1 flex-shrink-0" />}
                                                {log.type === 'danger' && <XCircle size={14} className="text-danger mt-1 flex-shrink-0" />}
                                                {log.type === 'warning' && <AlertCircle size={14} className="text-warning mt-1 flex-shrink-0" />}
                                                {log.type === 'info' && <Spinner animation="border" size="sm" className="text-primary mt-1 flex-shrink-0" style={{ width: '14px', height: '14px' }} />}
                                                <span>{log.message}</span>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </div>
                            )}

                            {/* Botão de ir para gerenciar após criação */}
                            {createdRepoName && !loading && (
                                <div className="mt-4 text-center">
                                    <Button
                                        variant="outline-success"
                                        onClick={() => navigate(`/gerenciar-time/${createdRepoName}`)}
                                        className="d-flex align-items-center gap-2 mx-auto"
                                    >
                                        <UserCheck size={18} />
                                        Gerenciar Colaboradores de '{createdRepoName}'
                                    </Button>
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    <div className="mt-4 p-4 rounded bg-white border border-dashed text-center small text-muted">
                        <AlertCircle size={16} className="me-1 mb-1" />
                        Esta ação criará um repositório privado na organização <strong>PampaTec</strong>
                        usando o template <strong>jornada-pre-incubacao-template</strong> como base.
                        <br />
                        <UserCheck size={14} className="me-1 mt-1" />
                        Colaboradores adicionados receberão um <strong>convite por e-mail</strong> que precisam aceitar para ter acesso.
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default NovoTime;
