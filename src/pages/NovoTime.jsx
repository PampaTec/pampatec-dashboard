import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { Users, Rocket, CheckCircle, AlertCircle, Github } from 'lucide-react';
import { Octokit } from '@octokit/rest';

const NovoTime = () => {
    const [startupName, setStartupName] = useState('');
    const [collaborators, setCollaborators] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

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

            // 1. Create repo from template
            // Repo name should be URL friendly
            const repoName = startupName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

            setStatus({ type: 'info', message: `Criando repositório '${repoName}' a partir do template...` });

            await octokit.repos.createUsingTemplate({
                template_owner: org,
                template_repo: templateRepo,
                owner: org,
                name: repoName,
                private: true, // Standard for teams
                description: `Projeto de Pré-Incubação - Startup ${startupName}`
            });

            // 1.1 Add Topic identifier
            setStatus({ type: 'info', message: `Identificando repositório como equipe PampaTec...` });
            await octokit.repos.replaceAllTopics({
                owner: org,
                repo: repoName,
                names: ['pampatec-equipe']
            });

            // 2. Add collaborators
            const userList = collaborators.split(',').map(u => u.trim()).filter(u => u !== '');

            if (userList.length > 0) {
                setStatus({ type: 'info', message: `Repositório criado! Adicionando ${userList.length} colaboradores...` });

                for (const username of userList) {
                    try {
                        await octokit.repos.addCollaborator({
                            owner: org,
                            repo: repoName,
                            username: username,
                            permission: 'push'
                        });
                    } catch (err) {
                        console.error(`Erro ao adicionar ${username}:`, err);
                    }
                }
            }

            setStatus({
                type: 'success',
                message: `Sucesso! O repositório '${repoName}' foi criado e os convites foram enviados.`
            });
            setStartupName('');
            setCollaborators('');

        } catch (err) {
            console.error(err);
            setStatus({
                type: 'danger',
                message: `Erro: ${err.response?.data?.message || err.message || 'Falha ao criar repositório'}`
            });
        } finally {
            setLoading(false);
        }
    };

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
                                        onChange={(e) => setStartupName(e.target.value)}
                                        required
                                        disabled={loading}
                                        size="lg"
                                    />
                                    <Form.Text className="text-muted">
                                        Isso definirá o nome do repositório no GitHub.
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label className="fw-bold d-flex align-items-center gap-2">
                                        <Github size={18} className="text-primary" /> Colaboradores (Usernames do GitHub)
                                    </Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        placeholder="joao_gh, maria_dev, dev_pampa"
                                        value={collaborators}
                                        onChange={(e) => setCollaborators(e.target.value)}
                                        disabled={loading}
                                    />
                                    <Form.Text className="text-muted">
                                        Separe os nomes por vírgula. Eles receberão um convite por e-mail.
                                    </Form.Text>
                                </Form.Group>

                                <div className="d-grid mt-5">
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        size="lg"
                                        disabled={loading || !startupName}
                                        className="py-3 fw-bold"
                                    >
                                        {loading ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                Processando...
                                            </>
                                        ) : (
                                            'Criar Ambiente de Trabalho'
                                        )}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>

                    <div className="mt-4 p-4 rounded bg-white border border-dashed text-center small text-muted">
                        <AlertCircle size={16} className="me-1 mb-1" />
                        Esta ação criará um repositório privado na organização <strong>PampaTec</strong>
                        usando o template <strong>jornada-pre-incubacao-template</strong> como base.
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default NovoTime;
