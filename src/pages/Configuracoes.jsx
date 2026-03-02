import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Button, Alert, Table, Badge, Spinner, InputGroup } from 'react-bootstrap';
import { Key, Save, CheckCircle, Users, UserPlus, Trash2, ShieldCheck, RefreshCw } from 'lucide-react';
import { Octokit } from "@octokit/rest";

const GithubConfig = ({ onSave }) => {
    const [token, setToken] = useState('');
    const [org, setOrg] = useState('PampaTec');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const savedToken = localStorage.getItem('pampatec_gh_token');
        const savedOrg = localStorage.getItem('pampatec_gh_org');
        if (savedToken) setToken(savedToken);
        if (savedOrg) setOrg(savedOrg);
    }, []);

    const handleSave = (e) => {
        e.preventDefault();
        localStorage.setItem('pampatec_gh_token', token);
        localStorage.setItem('pampatec_gh_org', org);
        setSaved(true);
        if (onSave) onSave();
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <Card className="shadow-sm border-0 mb-4 overflow-hidden" style={{ borderRadius: '15px' }}>
            <Card.Header className="bg-white border-bottom py-3">
                <h5 className="mb-0 d-flex align-items-center gap-2 text-primary">
                    <Key size={20} /> Configuração Global do GitHub
                </h5>
            </Card.Header>
            <Card.Body className="p-4">
                <Alert variant="info" className="small border-0 shadow-sm" style={{ backgroundColor: 'rgba(13, 110, 253, 0.05)', color: '#084298' }}>
                    <strong>Instrução:</strong> Configure o token da organização para permitir que o sistema gerencie membros e repositórios.
                </Alert>

                <Form onSubmit={handleSave}>
                    <div className="row">
                        <div className="col-md-5">
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-muted">ORGANIZAÇÃO GITHUB</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={org}
                                    onChange={(e) => setOrg(e.target.value)}
                                    placeholder="Ex: PampaTec"
                                    style={{ borderRadius: '10px' }}
                                    required
                                />
                            </Form.Group>
                        </div>
                        <div className="col-md-7">
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-muted">PERSONAL ACCESS TOKEN (PAT)</Form.Label>
                                <InputGroup>
                                    <Form.Control
                                        type="password"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        placeholder="ghp_xxxxxxxxxxxx"
                                        style={{ borderRadius: '10px 0 0 10px' }}
                                        required
                                    />
                                    <Button variant="primary" type="submit" style={{ borderRadius: '0 10px 10px 0' }}>
                                        <Save size={18} />
                                    </Button>
                                </InputGroup>
                            </Form.Group>
                        </div>
                    </div>
                </Form>

                {saved && (
                    <div className="mt-3 text-success d-flex align-items-center gap-1 small animate__animated animate__fadeIn">
                        <CheckCircle size={14} /> Configurações salvas localmente!
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

const ConsultantManagement = () => {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newUser, setNewUser] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const org = localStorage.getItem('pampatec_gh_org') || 'PampaTec';
    const token = localStorage.getItem('pampatec_gh_token');

    const fetchAdmins = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const octokit = new Octokit({ auth: token });
            const { data } = await octokit.rest.orgs.listMembers({
                org,
                role: 'admin'
            });
            setAdmins(data);
        } catch (err) {
            console.error(err);
            setError("Erro ao carregar consultores. Verifique se o token tem permissão 'read:org'.");
        } finally {
            setLoading(false);
        }
    }, [org, token]);

    useEffect(() => {
        fetchAdmins();
    }, [fetchAdmins]);

    const handleAddConsultant = async (e) => {
        e.preventDefault();
        if (!newUser || !token) return;

        setAdding(true);
        setError(null);
        setSuccess(null);

        try {
            const octokit = new Octokit({ auth: token });
            // Adicionar como admin
            await octokit.rest.orgs.setMembershipForUser({
                org,
                username: newUser,
                role: 'admin'
            });

            setSuccess(`Convite enviado com sucesso para @${newUser} como Admin!`);
            setNewUser('');
            fetchAdmins(); // Recarregar lista
        } catch (err) {
            console.error(err);
            setError(`Erro ao adicionar usuário: ${err.message || 'Usuário não encontrado ou erro de permissão'}`);
        } finally {
            setAdding(false);
        }
    };

    if (!token) {
        return (
            <Card className="shadow-sm border-0 p-5 text-center" style={{ borderRadius: '15px', backgroundColor: '#f8f9fa' }}>
                <Users size={48} className="text-muted mb-3 mx-auto" strokeWidth={1} />
                <h6 className="text-muted">Configure o Token do GitHub para gerenciar consultores.</h6>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm border-0 overflow-hidden" style={{ borderRadius: '15px' }}>
            <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 d-flex align-items-center gap-2 text-primary">
                    <Users size={20} /> Gestão de Consultores (Admins)
                </h5>
                <Button variant="link" size="sm" onClick={fetchAdmins} className="p-0 text-decoration-none">
                    <RefreshCw size={16} className={loading ? 'spin' : ''} /> Atualizar
                </Button>
            </Card.Header>
            <Card.Body className="p-4">
                <Form onSubmit={handleAddConsultant} className="mb-4 p-3 bg-light" style={{ borderRadius: '12px' }}>
                    <Form.Label className="small fw-bold text-muted mb-2">ADICIONAR NOVO CONSULTOR</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control
                            type="text"
                            placeholder="Usuário do GitHub"
                            value={newUser}
                            onChange={(e) => setNewUser(e.target.value)}
                            style={{ borderRadius: '10px' }}
                            required
                        />
                        <Button variant="success" type="submit" disabled={adding} style={{ borderRadius: '10px', whitespace: 'nowrap' }}>
                            {adding ? <Spinner size="sm" /> : <><UserPlus size={18} className="me-1" /> Adicionar</>}
                        </Button>
                    </div>
                    <Form.Text className="text-muted small">
                        O usuário receberá um convite para ser <strong>Admin</strong> da organização `{org}`.
                    </Form.Text>
                </Form>

                {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
                {success && <Alert variant="success" className="py-2 small">{success}</Alert>}

                <div className="table-responsive">
                    <Table hover borderless align="middle" className="mb-0">
                        <thead>
                            <tr className="border-bottom">
                                <th className="text-muted small fw-bold">CONSULTOR</th>
                                <th className="text-muted small fw-bold">PERMISSÃO</th>
                                <th className="text-end text-muted small fw-bold">AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && admins.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="text-center py-4">
                                        <Spinner animation="border" variant="primary" size="sm" />
                                    </td>
                                </tr>
                            ) : admins.map(user => (
                                <tr key={user.id} className="border-bottom-faint">
                                    <td>
                                        <div className="d-flex align-items-center gap-2">
                                            <img
                                                src={user.avatar_url}
                                                alt={user.login}
                                                className="rounded-circle shadow-sm"
                                                width="32"
                                                height="32"
                                            />
                                            <span className="fw-semibold">{user.login}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <Badge bg="soft-primary" className="text-primary d-inline-flex align-items-center gap-1" style={{ padding: '5px 10px', backgroundColor: 'rgba(13, 110, 253, 0.1)' }}>
                                            <ShieldCheck size={12} /> Admin
                                        </Badge>
                                    </td>
                                    <td className="text-end">
                                        <Button variant="outline-danger" size="sm" className="border-0 bg-transparent text-danger p-1" title="Remover acesso">
                                            <Trash2 size={16} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            </Card.Body>
        </Card>
    );
};

const Configuracoes = () => {
    // Estado para forçar re-render do componente de gestão quando salvar o token
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div className="container-fluid py-4" style={{ maxWidth: '800px' }}>
            <h2 className="mb-4 fw-bold">Configurações do Sistema</h2>
            <GithubConfig onSave={() => setRefreshKey(prev => prev + 1)} />
            <ConsultantManagement key={refreshKey} />

            <style>{`
                .border-bottom-faint { border-bottom: 1px solid rgba(0,0,0,0.03); }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Configuracoes;
