import React, { useState, useCallback } from 'react';
import { Card, Button, Alert, Row, Col, Form, Table, Modal, ProgressBar } from 'react-bootstrap';
import { ArrowLeft, Save, XCircle, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProgress } from '../features/progress/hooks/useProgress';
import { useGithubClient } from '../hooks/useGithubClient';
import { saveProgress } from '../features/progress/api/progressApi';
import { STATUS_OPTIONS, SUMMARY_MAX_LENGTH } from '../features/progress/helpers/markdownParser';

// ─── Error Boundary ───────────────────────────────────────────────────────────

class ProgressErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            const is404 = this.state.error?.status === 404 || this.state.error?.message?.includes('404');
            return (
                <Alert variant="danger" className="my-4">
                    {is404 ? 'Arquivo PROGRESSO_BMC.md não encontrado neste repositório.' : `Erro: ${this.state.error?.message}`}
                </Alert>
            );
        }
        return this.props.children;
    }
}

// ─── Componente de conteúdo (recebe dados via Suspense) ──────────────────────

const ProgressContent = ({ repoName }) => {
    const progressData = useProgress(repoName);
    const { octokit, org } = useGithubClient();
    const navigate = useNavigate();

    const [localData, setLocalData] = useState(progressData);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'success' | 'error'
    const [saveError, setSaveError] = useState('');

    const completedCount = localData.steps.filter((s) => s.status === '✅ Concluída').length;
    const percentage = Math.round((completedCount / 9) * 100);

    const updateStep = useCallback((index, field, value) => {
        setLocalData((prev) => {
            const newSteps = [...prev.steps];
            newSteps[index] = { ...newSteps[index], [field]: value };
            if (field === 'status' && value === '✅ Concluída' && (!newSteps[index].date || newSteps[index].date === '-')) {
                newSteps[index].date = new Date().toLocaleDateString('pt-BR');
            }
            if (field === 'status' && value !== '✅ Concluída') {
                newSteps[index].date = '-';
            }
            return { ...prev, steps: newSteps };
        });
    }, []);

    const updateAnalysis = useCallback((field, value) => {
        setLocalData((prev) => ({ ...prev, analysis: { ...prev.analysis, [field]: value } }));
    }, []);

    const handleSave = useCallback(async () => {
        if (!octokit || !localData) return;
        setSaving(true);
        setSaveStatus('saving');
        setSaveError('');
        try {
            await saveProgress({ octokit, org, repoName, progressData: localData });
            setSaveStatus('success');
            setTimeout(() => {
                navigate(`/gerenciar-time/${repoName}`, {
                    state: { successMessage: 'Progresso do BMC atualizado com sucesso!' },
                });
            }, 1500);
        } catch (err) {
            setSaveStatus('error');
            setSaveError(
                err.status === 409
                    ? 'O arquivo foi modificado por outra pessoa. Recarregue e tente novamente.'
                    : `Erro ao salvar: ${err.response?.data?.message || err.message}`
            );
        } finally {
            setSaving(false);
        }
    }, [octokit, org, repoName, localData, navigate]);

    return (
        <div className="py-4">
            <Row className="justify-content-center">
                <Col md={11} lg={10}>
                    {/* Header */}
                    <div className="d-flex align-items-center gap-3 mb-4">
                        <Button variant="outline-secondary" size="sm"
                            onClick={() => navigate(`/gerenciar-time/${repoName}`)}
                            className="d-flex align-items-center gap-1">
                            <ArrowLeft size={16} /> Voltar
                        </Button>
                        <div className="flex-grow-1">
                            <h2 className="fw-bold text-dark mb-0">Editar Progresso</h2>
                            <p className="text-muted mb-0 small">Repositório: <strong>{repoName}</strong></p>
                        </div>
                    </div>

                    {/* Barra de progresso resumida */}
                    <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                        <Card.Body className="p-4">
                            <div className="d-flex align-items-center gap-3 mb-2">
                                <BarChart3 size={22} className="text-primary" />
                                <h5 className="mb-0 fw-bold">Status Geral</h5>
                                <span className="ms-auto fw-bold text-primary">{completedCount} de 9 ({percentage}%)</span>
                            </div>
                            <ProgressBar now={percentage} variant={percentage === 100 ? 'success' : 'primary'} style={{ height: '12px', borderRadius: '6px' }} />
                        </Card.Body>
                    </Card>

                    {/* Tabela de etapas editável */}
                    <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
                        <Card.Header className="bg-white border-bottom py-3">
                            <h5 className="mb-0 d-flex align-items-center gap-2 text-primary">📋 Etapas do BMC</h5>
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
                                    {localData.steps.map((step, index) => (
                                        <tr key={step.number} className="align-middle">
                                            <td className="text-center px-3 fw-bold text-muted">{step.number}</td>
                                            <td className="px-3"><span className="fw-semibold">{step.name}</span></td>
                                            <td className="px-3">
                                                <Form.Select size="sm" value={step.status}
                                                    onChange={(e) => updateStep(index, 'status', e.target.value)}
                                                    style={{ minWidth: '160px' }}>
                                                    {STATUS_OPTIONS.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </Form.Select>
                                            </td>
                                            <td className="px-3">
                                                <Form.Control type="date" size="sm"
                                                    value={step.date !== '-' && step.date ? step.date.split('/').reverse().join('-') : ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val) {
                                                            const [y, m, d] = val.split('-');
                                                            updateStep(index, 'date', `${d}/${m}/${y}`);
                                                        } else {
                                                            updateStep(index, 'date', '-');
                                                        }
                                                    }}
                                                    disabled={step.status !== '✅ Concluída'} />
                                            </td>
                                            <td className="px-3">
                                                <Form.Control as="textarea" rows={1} size="sm"
                                                    placeholder="Breve resumo..."
                                                    value={step.summary === '-' ? '' : step.summary}
                                                    onChange={(e) => updateStep(index, 'summary', e.target.value.substring(0, SUMMARY_MAX_LENGTH) || '-')}
                                                    maxLength={SUMMARY_MAX_LENGTH}
                                                    style={{ resize: 'vertical', minHeight: '34px' }} />
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
                            <h5 className="mb-0 d-flex align-items-center gap-2 text-primary">🔍 Análise Crítica Final</h5>
                        </Card.Header>
                        <Card.Body className="p-4">
                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">STATUS</Form.Label>
                                        <Form.Select value={localData.analysis.status} onChange={(e) => updateAnalysis('status', e.target.value)}>
                                            {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">VISÃO SISTÊMICA</Form.Label>
                                        <Form.Control as="textarea" rows={2} placeholder="Descreva a visão sistêmica..."
                                            value={localData.analysis.vision === '-' ? '' : localData.analysis.vision}
                                            onChange={(e) => updateAnalysis('vision', e.target.value || '-')} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">ELO MAIS FRACO</Form.Label>
                                        <Form.Control as="textarea" rows={2} placeholder="Qual o elo mais fraco?"
                                            value={localData.analysis.weakLink === '-' ? '' : localData.analysis.weakLink}
                                            onChange={(e) => updateAnalysis('weakLink', e.target.value || '-')} />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label className="small fw-bold text-muted">EXPERIMENTO MVP</Form.Label>
                                        <Form.Control as="textarea" rows={2} placeholder="Descreva o experimento MVP..."
                                            value={localData.analysis.mvpExperiment === '-' ? '' : localData.analysis.mvpExperiment}
                                            onChange={(e) => updateAnalysis('mvpExperiment', e.target.value || '-')} />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Botões de ação */}
                    <div className="d-flex justify-content-end gap-3 mb-4">
                        <Button variant="outline-secondary" onClick={() => navigate(`/gerenciar-time/${repoName}`)} className="px-4">
                            Cancelar
                        </Button>
                        <Button variant="success" onClick={handleSave} disabled={saving} className="d-flex align-items-center gap-2 px-4">
                            <Save size={16} /> Salvar Progresso
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* Modal de Salvamento */}
            <Modal show={saveStatus !== null}
                onHide={() => { if (saveStatus === 'error') setSaveStatus(null); }}
                centered backdrop="static" keyboard={false}>
                <Modal.Body className="text-center py-5">
                    {saveStatus === 'saving' && (
                        <>
                            <div className="spinner-border text-primary mb-4" style={{ width: '3rem', height: '3rem' }} />
                            <h5 className="mt-2 fw-bold">Salvando no GitHub...</h5>
                            <p className="text-muted mb-3">Aguarde, estamos salvando o progresso no repositório.</p>
                            <ProgressBar animated now={100} variant="primary" style={{ height: '4px' }} />
                        </>
                    )}
                    {saveStatus === 'success' && (
                        <>
                            <div className="rounded-circle d-flex align-items-center justify-content-center bg-success bg-opacity-10 mx-auto mb-3" style={{ width: '72px', height: '72px' }}>
                                <CheckCircle size={40} className="text-success" />
                            </div>
                            <h5 className="fw-bold text-success">Progresso salvo com sucesso!</h5>
                            <p className="text-muted">Redirecionando...</p>
                        </>
                    )}
                    {saveStatus === 'error' && (
                        <>
                            <div className="rounded-circle d-flex align-items-center justify-content-center bg-danger bg-opacity-10 mx-auto mb-3" style={{ width: '72px', height: '72px' }}>
                                <XCircle size={40} className="text-danger" />
                            </div>
                            <h5 className="fw-bold text-danger">Erro ao salvar</h5>
                            <p className="text-muted mb-3">{saveError}</p>
                            <div className="d-flex justify-content-center gap-2">
                                <Button variant="outline-secondary" onClick={() => setSaveStatus(null)}>Fechar</Button>
                                <Button variant="primary" onClick={handleSave}>Tentar novamente</Button>
                            </div>
                        </>
                    )}
                </Modal.Body>
            </Modal>
        </div>
    );
};

// ─── Componente raiz com token guard ─────────────────────────────────────────

const EditarProgresso = () => {
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
        <ProgressErrorBoundary>
            <ProgressContent repoName={repoName} />
        </ProgressErrorBoundary>
    );
};

export default EditarProgresso;
