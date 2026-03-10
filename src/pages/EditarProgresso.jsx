import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Alert, Spinner, Row, Col, Form, Table, Modal, ProgressBar } from 'react-bootstrap';
import { ArrowLeft, Save, XCircle, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { Octokit } from '@octokit/rest';
import { useParams, useNavigate } from 'react-router-dom';

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: '⬜ Pendente', label: '⬜ Pendente' },
    { value: '🔄 Em andamento', label: '🔄 Em andamento' },
    { value: '✅ Concluída', label: '✅ Concluída' },
];

const STEP_NAMES = [
    'Proposta de Valor',
    'Segmento de Clientes',
    'Relacionamento com Clientes',
    'Canais',
    'Fontes de Receita',
    'Parcerias Principais',
    'Recursos Principais',
    'Atividades-Chave',
    'Estrutura de Custos',
];

const SUMMARY_MAX_LENGTH = 200;

// ─── Parser: Markdown → Dados Estruturados ────────────────────────────────────

function parseProgressMarkdown(content) {
    const data = {
        teamName: '',
        startup: '',
        startDate: '',
        lastUpdate: '',
        steps: STEP_NAMES.map((name, i) => ({
            number: i + 1,
            name,
            status: '⬜ Pendente',
            date: '-',
            summary: '-',
        })),
        analysis: {
            status: '⬜ Pendente',
            vision: '-',
            weakLink: '-',
            mvpExperiment: '-',
        },
        history: [],
    };

    try {
        // Cabeçalho
        const teamMatch = content.match(/# 📊 Progresso BMC - (.+)/);
        if (teamMatch) data.teamName = teamMatch[1].trim();

        const startupMatch = content.match(/\*\*Startup:\*\* (.+)/);
        if (startupMatch) data.startup = startupMatch[1].trim();

        const startDateMatch = content.match(/\*\*Início:\*\* (.+)/);
        if (startDateMatch) data.startDate = startDateMatch[1].trim();

        const lastUpdateMatch = content.match(/\*\*Última atualização:\*\* (.+)/);
        if (lastUpdateMatch) data.lastUpdate = lastUpdateMatch[1].trim();

        // Tabela de etapas (linhas com | N | Etapa | Status | Data | Resumo |)
        const stepRegex = /\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g;
        let match;
        while ((match = stepRegex.exec(content)) !== null) {
            const stepNum = parseInt(match[1]);
            if (stepNum >= 1 && stepNum <= 9) {
                const rawStatus = match[3].trim();
                let status = '⬜ Pendente';
                if (rawStatus.includes('Conclu')) status = '✅ Concluída';
                else if (rawStatus.includes('andamento')) status = '🔄 Em andamento';

                data.steps[stepNum - 1] = {
                    number: stepNum,
                    name: match[2].trim(),
                    status: status,
                    date: match[4].trim(),
                    summary: match[5].trim(),
                };
            }
        }

        // Análise Crítica Final
        const analysisStatusMatch = content.match(/## 🔍 Análise Crítica Final[\s\S]*?\*\*Status:\*\* (.+)/);
        if (analysisStatusMatch) {
            const rawStatus = analysisStatusMatch[1].trim();
            if (rawStatus.includes('Conclu')) data.analysis.status = '✅ Concluída';
            else if (rawStatus.includes('andamento')) data.analysis.status = '🔄 Em andamento';
            else data.analysis.status = '⬜ Pendente';
        }

        const visionMatch = content.match(/\*\*Visão Sistêmica:\*\* (.+)/);
        if (visionMatch) data.analysis.vision = visionMatch[1].trim();

        const weakMatch = content.match(/\*\*Elo Mais Fraco:\*\* (.+)/);
        if (weakMatch) data.analysis.weakLink = weakMatch[1].trim();

        const mvpMatch = content.match(/\*\*Experimento MVP:\*\* (.+)/);
        if (mvpMatch) data.analysis.mvpExperiment = mvpMatch[1].trim();

        // Histórico de Sessões
        const historySection = content.split('## 📝 Histórico de Sessões')[1];
        if (historySection) {
            const historyRegex = /\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g;
            let hMatch;
            let isHeader = true;
            while ((hMatch = historyRegex.exec(historySection)) !== null) {
                // Pular cabeçalho e separador da tabela
                if (isHeader || hMatch[1].includes('---') || hMatch[1].includes('Data')) {
                    isHeader = false;
                    continue;
                }
                data.history.push({
                    date: hMatch[1].trim(),
                    steps: hMatch[2].trim(),
                    notes: hMatch[3].trim(),
                });
            }
        }
    } catch (e) {
        console.error('Erro ao parsear PROGRESSO_BMC.md:', e);
    }

    return data;
}

// ─── Builder: Dados → Markdown ────────────────────────────────────────────────

function buildProgressMarkdown(data) {
    const completedCount = data.steps.filter(s => s.status === '✅ Concluída').length;
    const percentage = Math.round((completedCount / 9) * 100);
    const today = new Date().toLocaleDateString('pt-BR');

    let md = `# 📊 Progresso BMC - ${data.teamName}\n\n`;
    md += `> **Startup:** ${data.startup}\n`;
    md += `> **Início:** ${data.startDate}\n`;
    md += `> **Última atualização:** ${today}\n\n`;
    md += `## Status Geral: Etapa ${completedCount} de 9 (${percentage}%)\n\n`;

    md += `| # | Etapa | Status | Data Conclusão | Resumo |\n`;
    md += `|---|-------|--------|----------------|--------|\n`;

    for (const step of data.steps) {
        md += `| ${step.number} | ${step.name} | ${step.status} | ${step.date} | ${step.summary} |\n`;
    }

    md += `\n## 🔍 Análise Crítica Final\n`;
    md += `- **Status:** ${data.analysis.status}\n`;
    md += `- **Visão Sistêmica:** ${data.analysis.vision}\n`;
    md += `- **Elo Mais Fraco:** ${data.analysis.weakLink}\n`;
    md += `- **Experimento MVP:** ${data.analysis.mvpExperiment}\n`;

    md += `\n## 📝 Histórico de Sessões\n`;
    md += `| Data | Etapas Trabalhadas | Observações |\n`;
    md += `|------|-------------------|-------------|\n`;

    for (const entry of data.history) {
        md += `| ${entry.date} | ${entry.steps} | ${entry.notes} |\n`;
    }

    md += '\n';
    return md;
}

// ─── Componente Principal ────────────────────────────────────────────────────

const EditarProgresso = () => {
    const { repoName } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fileSha, setFileSha] = useState(null);
    const [progressData, setProgressData] = useState(null);

    // Modal de salvamento
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'success' | 'error'
    const [saveError, setSaveError] = useState('');

    const org = localStorage.getItem('pampatec_gh_org') || 'PampaTec';
    const token = localStorage.getItem('pampatec_gh_token');

    // ─── Carregar PROGRESSO_BMC.md ─────────────────────────────────────────

    const fetchProgress = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);

        try {
            const octokit = new Octokit({ auth: token });
            const { data: fileData } = await octokit.repos.getContent({
                owner: org,
                repo: repoName,
                path: 'PROGRESSO_BMC.md',
            });

            setFileSha(fileData.sha);
            
            let content;
            try {
                content = decodeURIComponent(escape(atob(fileData.content)));
            } catch (e) {
                content = atob(fileData.content);
            }
            
            const parsed = parseProgressMarkdown(content);
            setProgressData(parsed);
        } catch (err) {
            if (err.status === 404) {
                setError('Arquivo PROGRESSO_BMC.md não encontrado neste repositório.');
            } else {
                setError(`Erro ao carregar progresso: ${err.response?.data?.message || err.message}`);
            }
        } finally {
            setLoading(false);
        }
    }, [org, token, repoName]);

    useEffect(() => {
        fetchProgress();
    }, [fetchProgress]);

    // ─── Handlers de edição ─────────────────────────────────────────────────

    const updateStep = useCallback((index, field, value) => {
        setProgressData(prev => {
            const newSteps = [...prev.steps];
            newSteps[index] = { ...newSteps[index], [field]: value };

            // Se status mudou para "Concluída" e data está vazia, preencher com hoje
            if (field === 'status' && value === '✅ Concluída' && (newSteps[index].date === '-' || !newSteps[index].date)) {
                newSteps[index].date = new Date().toLocaleDateString('pt-BR');
            }
            // Se status mudou para não-concluída, limpar data
            if (field === 'status' && value !== '✅ Concluída') {
                newSteps[index].date = '-';
            }

            return { ...prev, steps: newSteps };
        });
    }, []);

    const updateAnalysis = useCallback((field, value) => {
        setProgressData(prev => ({
            ...prev,
            analysis: { ...prev.analysis, [field]: value },
        }));
    }, []);

    // ─── Salvar no GitHub ──────────────────────────────────────────────────

    const handleSave = async () => {
        if (!token || !progressData) return;

        setSaving(true);
        setSaveStatus('saving');
        setSaveError('');

        try {
            const octokit = new Octokit({ auth: token });

            // Identificar etapas editadas para o histórico
            const editedSteps = progressData.steps
                .filter(s => s.status !== '⬜ Pendente')
                .map(s => `Etapa ${s.number}`)
                .join(', ') || 'Nenhuma';

            // Adicionar entrada no histórico de sessões
            const today = new Date().toLocaleDateString('pt-BR');
            const updatedData = {
                ...progressData,
                history: [
                    ...progressData.history,
                    { date: today, steps: editedSteps, notes: 'Editado via Dashboard' },
                ],
            };

            const markdownContent = buildProgressMarkdown(updatedData);

            // Obter sha atualizado (caso tenha mudado desde o carregamento)
            let currentSha = fileSha;
            try {
                const { data: currentFile } = await octokit.repos.getContent({
                    owner: org,
                    repo: repoName,
                    path: 'PROGRESSO_BMC.md',
                });
                currentSha = currentFile.sha;
            } catch {
                // Se falhar, usar sha original
            }

            await octokit.repos.createOrUpdateFileContents({
                owner: org,
                repo: repoName,
                path: 'PROGRESSO_BMC.md',
                message: `📊 Atualizar progresso BMC via Dashboard (${today})`,
                content: btoa(unescape(encodeURIComponent(markdownContent))),
                sha: currentSha,
            });

            setSaveStatus('success');

            // Redirecionar após 1.5s
            setTimeout(() => {
                navigate(`/gerenciar-time/${repoName}`, {
                    state: { successMessage: 'Progresso do BMC atualizado com sucesso!' },
                });
            }, 1500);
        } catch (err) {
            console.error('Erro ao salvar:', err);
            setSaveStatus('error');
            setSaveError(
                err.status === 409
                    ? 'O arquivo foi modificado por outra pessoa. Recarregue a página e tente novamente.'
                    : `Erro ao salvar: ${err.response?.data?.message || err.message}`
            );
        } finally {
            setSaving(false);
        }
    };

    // ─── Sem token ────────────────────────────────────────────────────────

    if (!token) {
        return (
            <div className="text-center py-5">
                <AlertCircle size={48} className="text-warning mb-3" />
                <h3>Token Não Configurado</h3>
                <p className="text-muted">Você precisa configurar seu Personal Access Token.</p>
                <Button onClick={() => navigate('/configuracoes')} variant="primary">Ir para Configurações</Button>
            </div>
        );
    }

    // ─── Contadores de progresso ──────────────────────────────────────────

    const completedCount = progressData ? progressData.steps.filter(s => s.status === '✅ Concluída').length : 0;
    const percentage = progressData ? Math.round((completedCount / 9) * 100) : 0;

    return (
        <div className="py-4">
            <Row className="justify-content-center">
                <Col md={11} lg={10}>

                    {/* Header */}
                    <div className="d-flex align-items-center gap-3 mb-4">
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => navigate(`/gerenciar-time/${repoName}`)}
                            className="d-flex align-items-center gap-1"
                        >
                            <ArrowLeft size={16} /> Voltar
                        </Button>
                        <div className="flex-grow-1">
                            <h2 className="fw-bold text-dark mb-0">Editar Progresso</h2>
                            <p className="text-muted mb-0 small">
                                Repositório: <strong>{repoName}</strong>
                            </p>
                        </div>
                    </div>

                    {/* Erro */}
                    {error && (
                        <Alert variant="danger" className="d-flex align-items-center gap-2">
                            <XCircle size={18} /> {error}
                        </Alert>
                    )}

                    {/* Loading */}
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-3 text-muted">Carregando progresso do BMC...</p>
                        </div>
                    ) : progressData ? (
                        <>
                            {/* Barra de progresso resumida */}
                            <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                                <Card.Body className="p-4">
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        <BarChart3 size={22} className="text-primary" />
                                        <h5 className="mb-0 fw-bold">Status Geral</h5>
                                        <span className="ms-auto fw-bold text-primary">{completedCount} de 9 ({percentage}%)</span>
                                    </div>
                                    <ProgressBar
                                        now={percentage}
                                        variant={percentage === 100 ? 'success' : 'primary'}
                                        style={{ height: '12px', borderRadius: '6px' }}
                                    />
                                </Card.Body>
                            </Card>

                            {/* Tabela de etapas editável */}
                            <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                                <Card.Header className="bg-white border-bottom py-3">
                                    <h5 className="mb-0 d-flex align-items-center gap-2 text-primary">
                                        📋 Etapas do BMC
                                    </h5>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    <Table responsive className="mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="border-0 px-3 py-3 text-center" style={{ width: '40px' }}>#</th>
                                                <th className="border-0 px-3 py-3" style={{ minWidth: '160px' }}>Etapa</th>
                                                <th className="border-0 px-3 py-3" style={{ minWidth: '170px' }}>Status</th>
                                                <th className="border-0 px-3 py-3" style={{ minWidth: '150px' }}>Data Conclusão</th>
                                                <th className="border-0 px-3 py-3" style={{ minWidth: '250px' }}>Resumo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {progressData.steps.map((step, index) => (
                                                <tr key={step.number} className="align-middle">
                                                    <td className="text-center px-3 fw-bold text-muted">{step.number}</td>
                                                    <td className="px-3">
                                                        <span className="fw-semibold">{step.name}</span>
                                                    </td>
                                                    <td className="px-3">
                                                        <Form.Select
                                                            size="sm"
                                                            value={step.status}
                                                            onChange={(e) => updateStep(index, 'status', e.target.value)}
                                                            style={{ minWidth: '160px' }}
                                                        >
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </Form.Select>
                                                    </td>
                                                    <td className="px-3">
                                                        <Form.Control
                                                            type="date"
                                                            size="sm"
                                                            value={step.date !== '-' && step.date
                                                                ? step.date.split('/').reverse().join('-') // DD/MM/YYYY → YYYY-MM-DD
                                                                : ''
                                                            }
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val) {
                                                                    const [y, m, d] = val.split('-');
                                                                    updateStep(index, 'date', `${d}/${m}/${y}`);
                                                                } else {
                                                                    updateStep(index, 'date', '-');
                                                                }
                                                            }}
                                                            disabled={step.status !== '✅ Concluída'}
                                                        />
                                                    </td>
                                                    <td className="px-3">
                                                        <Form.Control
                                                            as="textarea"
                                                            rows={1}
                                                            size="sm"
                                                            placeholder="Breve resumo..."
                                                            value={step.summary === '-' ? '' : step.summary}
                                                            onChange={(e) => updateStep(index, 'summary', e.target.value.substring(0, SUMMARY_MAX_LENGTH) || '-')}
                                                            maxLength={SUMMARY_MAX_LENGTH}
                                                            style={{ resize: 'vertical', minHeight: '34px' }}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>

                            {/* Análise Crítica Final */}
                            <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                                <Card.Header className="bg-white border-bottom py-3">
                                    <h5 className="mb-0 d-flex align-items-center gap-2 text-primary">
                                        🔍 Análise Crítica Final
                                    </h5>
                                </Card.Header>
                                <Card.Body className="p-4">
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold text-muted">STATUS</Form.Label>
                                                <Form.Select
                                                    value={progressData.analysis.status}
                                                    onChange={(e) => updateAnalysis('status', e.target.value)}
                                                >
                                                    {STATUS_OPTIONS.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold text-muted">VISÃO SISTÊMICA</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={2}
                                                    placeholder="Descreva a visão sistêmica do BMC..."
                                                    value={progressData.analysis.vision === '-' ? '' : progressData.analysis.vision}
                                                    onChange={(e) => updateAnalysis('vision', e.target.value || '-')}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold text-muted">ELO MAIS FRACO</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={2}
                                                    placeholder="Qual o elo mais fraco do modelo?"
                                                    value={progressData.analysis.weakLink === '-' ? '' : progressData.analysis.weakLink}
                                                    onChange={(e) => updateAnalysis('weakLink', e.target.value || '-')}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold text-muted">EXPERIMENTO MVP</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={2}
                                                    placeholder="Descreva o experimento MVP proposto..."
                                                    value={progressData.analysis.mvpExperiment === '-' ? '' : progressData.analysis.mvpExperiment}
                                                    onChange={(e) => updateAnalysis('mvpExperiment', e.target.value || '-')}
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>

                            {/* Botões de ação */}
                            <div className="d-flex justify-content-end gap-3 mb-4">
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => navigate(`/gerenciar-time/${repoName}`)}
                                    className="d-flex align-items-center gap-2 px-4"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="success"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="d-flex align-items-center gap-2 px-4"
                                >
                                    <Save size={16} /> Salvar Progresso
                                </Button>
                            </div>
                        </>
                    ) : null}
                </Col>
            </Row>

            {/* Modal de Salvamento */}
            <Modal
                show={saveStatus !== null}
                onHide={() => {
                    if (saveStatus === 'error') {
                        setSaveStatus(null);
                    }
                }}
                centered
                backdrop="static"
                keyboard={false}
            >
                <Modal.Body className="text-center py-5">
                    {saveStatus === 'saving' && (
                        <>
                            <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
                            <h5 className="mt-4 fw-bold">Salvando no GitHub...</h5>
                            <p className="text-muted mb-3">
                                Aguarde, estamos salvando o progresso no repositório do time.
                            </p>
                            <ProgressBar animated now={100} variant="primary" style={{ height: '4px' }} />
                        </>
                    )}
                    {saveStatus === 'success' && (
                        <>
                            <div className="rounded-circle d-flex align-items-center justify-content-center bg-success bg-opacity-10 mx-auto mb-3"
                                style={{ width: '72px', height: '72px' }}>
                                <CheckCircle size={40} className="text-success" />
                            </div>
                            <h5 className="fw-bold text-success">Progresso salvo com sucesso!</h5>
                            <p className="text-muted">Redirecionando...</p>
                        </>
                    )}
                    {saveStatus === 'error' && (
                        <>
                            <div className="rounded-circle d-flex align-items-center justify-content-center bg-danger bg-opacity-10 mx-auto mb-3"
                                style={{ width: '72px', height: '72px' }}>
                                <XCircle size={40} className="text-danger" />
                            </div>
                            <h5 className="fw-bold text-danger">Erro ao salvar</h5>
                            <p className="text-muted mb-3">{saveError}</p>
                            <div className="d-flex justify-content-center gap-2">
                                <Button variant="outline-secondary" onClick={() => setSaveStatus(null)}>
                                    Fechar
                                </Button>
                                <Button variant="primary" onClick={handleSave}>
                                    Tentar novamente
                                </Button>
                            </div>
                        </>
                    )}
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default EditarProgresso;
