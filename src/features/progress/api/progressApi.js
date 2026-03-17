/**
 * API Layer — Progress Feature
 * Todas as chamadas ao GitHub relacionadas ao PROGRESSO_BMC.md.
 */
import { decodeBase64, encodeBase64, parseProgressMarkdown, buildProgressMarkdown } from '../helpers/markdownParser';

/**
 * Busca e parseia o PROGRESSO_BMC.md de um repositório.
 */
export const fetchProgress = async ({ octokit, org, repoName }) => {
    const { data: fileData } = await octokit.repos.getContent({
        owner: org,
        repo: repoName,
        path: 'PROGRESSO_BMC.md',
    });

    const content = decodeBase64(fileData.content);
    const parsed = parseProgressMarkdown(content);
    return { ...parsed, fileSha: fileData.sha };
};

/**
 * Salva o progresso editado no GitHub, adicionando uma entrada no histórico.
 */
export const saveProgress = async ({ octokit, org, repoName, progressData }) => {
    const today = new Date().toLocaleDateString('pt-BR');

    const editedSteps = progressData.steps
        .filter((s) => s.status !== '⬜ Pendente')
        .map((s) => `Etapa ${s.number}`)
        .join(', ') || 'Nenhuma';

    const updatedData = {
        ...progressData,
        history: [
            ...progressData.history,
            { date: today, steps: editedSteps, notes: 'Editado via Dashboard' },
        ],
    };

    const markdownContent = buildProgressMarkdown(updatedData);

    // Obter sha atualizado para evitar conflitos
    let currentSha = progressData.fileSha;
    try {
        const { data: currentFile } = await octokit.repos.getContent({
            owner: org,
            repo: repoName,
            path: 'PROGRESSO_BMC.md',
        });
        currentSha = currentFile.sha;
    } catch {
        // Usar sha original se falhar
    }

    await octokit.repos.createOrUpdateFileContents({
        owner: org,
        repo: repoName,
        path: 'PROGRESSO_BMC.md',
        message: `📊 Atualizar progresso BMC via Dashboard (${today})`,
        content: encodeBase64(markdownContent),
        sha: currentSha,
    });
};
