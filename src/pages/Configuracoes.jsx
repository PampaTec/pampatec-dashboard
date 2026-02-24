import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { Key, Save, CheckCircle } from 'lucide-react';

const GithubConfig = () => {
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
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <Card className="shadow-sm border-0 max-width-600 mx-auto mt-4">
            <Card.Header className="bg-white border-bottom py-3">
                <h5 className="mb-0 d-flex align-items-center gap-2">
                    <Key size={20} className="text-primary" /> Configuração do GitHub
                </h5>
            </Card.Header>
            <Card.Body className="p-4">
                <Alert variant="info" className="small">
                    Para que o sistema consiga criar repositórios e ler o progresso, você precisa de um
                    <strong> Personal Access Token (PAT)</strong> com escopo <code>repo</code> e <code>read:org</code>.
                </Alert>

                <Form onSubmit={handleSave}>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">Organização GitHub</Form.Label>
                        <Form.Control
                            type="text"
                            value={org}
                            onChange={(e) => setOrg(e.target.value)}
                            placeholder="Ex: PampaTec"
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-4">
                        <Form.Label className="fw-bold">Token de Acesso (PAT)</Form.Label>
                        <Form.Control
                            type="password"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxx"
                            required
                        />
                        <Form.Text className="text-muted">
                            O token fica salvo apenas no seu navegador (localStorage).
                        </Form.Text>
                    </Form.Group>

                    <div className="d-grid">
                        <Button variant="primary" type="submit" className="d-flex align-items-center justify-content-center gap-2">
                            <Save size={18} /> Salvar Configurações
                        </Button>
                    </div>
                </Form>

                {saved && (
                    <Alert variant="success" className="mt-4 py-2 d-flex align-items-center gap-2">
                        <CheckCircle size={18} /> Configurações salvas com sucesso!
                    </Alert>
                )}
            </Card.Body>
        </Card>
    );
};

export default GithubConfig;
