/**
 * Helpers puros de parsing/building do PROGRESSO_BMC.md.
 * Sem dependências externas — totalmente testáveis.
 */

export const STEP_NAMES = [
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

export const STATUS_OPTIONS = [
    { value: '⬜ Pendente', label: '⬜ Pendente' },
    { value: '🔄 Em andamento', label: '🔄 Em andamento' },
    { value: '✅ Concluída', label: '✅ Concluída' },
];

export const SUMMARY_MAX_LENGTH = 200;

/** Decode seguro de base64 com suporte a UTF-8 */
export const decodeBase64 = (b64) => {
    try {
        return decodeURIComponent(escape(atob(b64)));
    } catch {
        return atob(b64);
    }
};

/** Encode para base64 com suporte a UTF-8 */
export const encodeBase64 = (str) => btoa(unescape(encodeURIComponent(str)));

const resolveStatus = (raw) => {
    if (raw.includes('Conclu')) return '✅ Concluída';
    if (raw.includes('andamento')) return '🔄 Em andamento';
    return '⬜ Pendente';
};

/**
 * Parseia o conteúdo markdown do arquivo PROGRESSO_BMC.md
 * @param {string} content
 */
export function parseProgressMarkdown(content) {
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
        const teamMatch = content.match(/# 📊 Progresso BMC - (.+)/);
        if (teamMatch) data.teamName = teamMatch[1].trim();

        const startupMatch = content.match(/\*\*Startup:\*\* (.+)/);
        if (startupMatch) data.startup = startupMatch[1].trim();

        const startDateMatch = content.match(/\*\*Início:\*\* (.+)/);
        if (startDateMatch) data.startDate = startDateMatch[1].trim();

        const lastUpdateMatch = content.match(/\*\*Última atualização:\*\* (.+)/);
        if (lastUpdateMatch) data.lastUpdate = lastUpdateMatch[1].trim();

        const stepRegex = /\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g;
        let match;
        while ((match = stepRegex.exec(content)) !== null) {
            const stepNum = parseInt(match[1]);
            if (stepNum >= 1 && stepNum <= 9) {
                data.steps[stepNum - 1] = {
                    number: stepNum,
                    name: match[2].trim(),
                    status: resolveStatus(match[3].trim()),
                    date: match[4].trim(),
                    summary: match[5].trim(),
                };
            }
        }

        const analysisStatusMatch = content.match(/## 🔍 Análise Crítica Final[\s\S]*?\*\*Status:\*\* (.+)/);
        if (analysisStatusMatch) {
            data.analysis.status = resolveStatus(analysisStatusMatch[1].trim());
        }

        const visionMatch = content.match(/\*\*Visão Sistêmica:\*\* (.+)/);
        if (visionMatch) data.analysis.vision = visionMatch[1].trim();

        const weakMatch = content.match(/\*\*Elo Mais Fraco:\*\* (.+)/);
        if (weakMatch) data.analysis.weakLink = weakMatch[1].trim();

        const mvpMatch = content.match(/\*\*Experimento MVP:\*\* (.+)/);
        if (mvpMatch) data.analysis.mvpExperiment = mvpMatch[1].trim();

        const historySection = content.split('## 📝 Histórico de Sessões')[1];
        if (historySection) {
            const historyRegex = /\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g;
            let hMatch;
            let isHeader = true;
            while ((hMatch = historyRegex.exec(historySection)) !== null) {
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

/**
 * Constrói o conteúdo markdown a partir dos dados estruturados.
 * @param {object} data
 * @returns {string}
 */
export function buildProgressMarkdown(data) {
    const completedCount = data.steps.filter((s) => s.status === '✅ Concluída').length;
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
