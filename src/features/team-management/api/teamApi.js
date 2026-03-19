/**
 * API Layer — Team Management Feature
 * Todas as chamadas ao GitHub da feature de gerenciamento de times estão aqui.
 */

const decodeBase64 = (b64) => {
    try {
        return decodeURIComponent(escape(atob(b64)));
    } catch {
        return atob(b64);
    }
};

const PROGRESS_STATUS_MAP = {
    Conclu: '✅ Concluída',
    andamento: '🔄 Em andamento',
};

const resolveStatus = (raw) => {
    if (raw.includes('Conclu')) return '✅ Concluída';
    if (raw.includes('andamento')) return '🔄 Em andamento';
    return '⬜ Pendente';
};

/**
 * Busca os dados completos de um repositório (repo info + colaboradores + progresso).
 */
export const fetchTeamData = async ({ octokit, org, repoName }) => {
    // Info do repo
    const { data: repo } = await octokit.repos.get({ owner: org, repo: repoName });

    // Colaboradores diretos
    const { data: collaborators } = await octokit.repos.listCollaborators({
        owner: org,
        repo: repoName,
        affiliation: 'direct',
    });

    // Convites pendentes
    let pendingInvites = [];
    try {
        const { data: invites } = await octokit.repos.listInvitations({ owner: org, repo: repoName });
        pendingInvites = invites;
    } catch {
        pendingInvites = [];
    }

    // Progresso BMC
    let progress = { hasProgress: false, steps: [], percentage: 0, currentStep: 0 };
    try {
        const { data: fileData } = await octokit.repos.getContent({
            owner: org,
            repo: repoName,
            path: 'PROGRESSO_BMC.md',
        });

        const content = decodeBase64(fileData.content);
        const progressMatch = content.match(/Etapa (\d+) de 9 \((\d+)%\)/i);
        const step = progressMatch ? parseInt(progressMatch[1]) : 0;
        const pct = progressMatch ? parseInt(progressMatch[2]) : 0;

        const stepRegex = /\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|/g;
        const steps = [];
        let m;
        while ((m = stepRegex.exec(content)) !== null) {
            const stepNum = parseInt(m[1]);
            if (stepNum >= 1 && stepNum <= 9) {
                steps.push({
                    number: stepNum,
                    name: m[2].trim(),
                    status: resolveStatus(m[3].trim()),
                    date: m[4].trim(),
                });
            }
        }

        progress = { hasProgress: true, steps, percentage: pct, currentStep: step };
    } catch {
        progress = { hasProgress: false, steps: [], percentage: 0, currentStep: 0 };
    }

    let hasConsolidatedBmc = false;
    try {
        await octokit.repos.getContent({
            owner: org,
            repo: repoName,
            path: 'BMC_CONSOLIDADO.md',
        });
        hasConsolidatedBmc = true;
    } catch {
        hasConsolidatedBmc = false;
    }

    return { repo, collaborators, pendingInvites, progress, hasConsolidatedBmc };
};

/** Verifica se um username existe no GitHub. */
export const validateUser = async ({ octokit, username }) => {
    const { data } = await octokit.users.getByUsername({ username: username.trim() });
    return {
        valid: true,
        username: data.login,
        name: data.name || data.login,
        avatarUrl: data.avatar_url,
    };
};

/** Adiciona colaborador ao repositório. */
export const addCollaborator = async ({ octokit, org, repoName, username }) => {
    await octokit.repos.addCollaborator({ owner: org, repo: repoName, username, permission: 'push' });
};

/** Remove colaborador do repositório. */
export const removeCollaborator = async ({ octokit, org, repoName, username }) => {
    await octokit.repos.removeCollaborator({ owner: org, repo: repoName, username });
};

/** Cancela um convite pendente. */
export const cancelInvite = async ({ octokit, org, repoName, invitationId }) => {
    await octokit.repos.deleteInvitation({ owner: org, repo: repoName, invitation_id: invitationId });
};

/** Altera o status ativo/inativo do time via tópicos. */
export const toggleTeamStatus = async ({ octokit, org, repoName, activate }) => {
    const { data: currentTopics } = await octokit.repos.getAllTopics({ owner: org, repo: repoName });
    let names = currentTopics.names || [];
    if (activate) {
        names = names.filter((t) => t !== 'pampatec-inativo');
    } else if (!names.includes('pampatec-inativo')) {
        names.push('pampatec-inativo');
    }
    if (!names.includes('pampatec-equipe')) names.push('pampatec-equipe');
    await octokit.repos.replaceAllTopics({ owner: org, repo: repoName, names });
};

/** Atualiza a descrição do repositório. */
export const updateDescription = async ({ octokit, org, repoName, description }) => {
    await octokit.repos.update({ owner: org, repo: repoName, description });
};

/** Adiciona a equipe com tópicos padrão. */
export const addTeamTopics = async ({ octokit, org, repoName, topics }) => {
    await octokit.repos.replaceAllTopics({
        owner: org,
        repo: repoName,
        names: topics
    });
};

/** Cria o repositório baseado num template. */
export const createTeamRepository = async ({ octokit, org, templateRepo, repoName, description }) => {
    await octokit.repos.createUsingTemplate({
        template_owner: org,
        template_repo: templateRepo,
        owner: org,
        name: repoName,
        private: true,
        description
    });
};

/** Atualiza variáveis no README.md do repositório recém-criado. */
export const updateReadmeVariables = async ({ octokit, org, repoName }) => {
    try {
        const { data: fileData } = await octokit.repos.getContent({
            owner: org,
            repo: repoName,
            path: 'README.md',
        });

        const content = decodeBase64(fileData.content);
        let newContent = content.replace(/NOME_DO_REPOSITORIO/g, repoName);

        if (content !== newContent) {
            await octokit.repos.createOrUpdateFileContents({
                owner: org,
                repo: repoName,
                path: 'README.md',
                message: 'docs: atualiza template com o nome do repositório',
                content: btoa(unescape(encodeURIComponent(newContent))),
                sha: fileData.sha,
            });
        }
    } catch (err) {
        console.warn('Não foi possível atualizar o README.md', err);
        throw err;
    }
};

/** Aguarda um repositório clonado via template ficar efetivamente disponível (com commits copiados). */
export const waitForRepositoryReady = async ({ octokit, org, repoName, maxAttempts = 20, intervalMs = 3000 }) => {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const { data } = await octokit.repos.get({ owner: org, repo: repoName });
            if (data && data.id) {
                try {
                    // Listar commits na API. Ao invés de conteúdo, isso previne o NotFound e
                    // também garante que a branch default foi definida e populada e evita 409 Conflict Empty Repo
                    await octokit.repos.listCommits({ owner: org, repo: repoName, per_page: 1 });
                    return true;
                } catch {
                    // Repositório ainda vazio (409 Conflict - Git Repository is empty)
                }
            }
        } catch {
            // Repo ainda não existe (404 Not Found)
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    return false;
};
