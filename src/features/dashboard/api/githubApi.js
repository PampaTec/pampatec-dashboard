/**
 * API Layer — Dashboard Feature
 * Todas as chamadas ao GitHub da feature de dashboard estão isoladas aqui.
 * Nenhum componente deve chamar Octokit diretamente.
 */

/**
 * Faz o decode seguro de conteúdo base64 retornado pela API do GitHub.
 * @param {string} b64 - conteúdo em base64
 * @returns {string}
 */
const decodeBase64 = (b64) => {
    try {
        return decodeURIComponent(escape(atob(b64)));
    } catch {
        return atob(b64);
    }
};

/**
 * Parseia o arquivo PROGRESSO_BMC.md e extrai etapa e percentual.
 * @param {string} content - conteúdo markdown já decodificado
 * @returns {{ step: number, percentage: number }}
 */
const parseProgress = (content) => {
    const match = content.match(/Etapa (\d+) de 9 \((\d+)%\)/i);
    return {
        step: match ? parseInt(match[1]) : 0,
        percentage: match ? parseInt(match[2]) : 0,
    };
};

/**
 * Busca todos os repositórios da feature dashboard com seus progressos.
 * @param {{ octokit: import('@octokit/rest').Octokit, org: string }} params
 * @returns {Promise<Array>}
 */
export const fetchReposWithProgress = async ({ octokit, org }) => {
    // 1. Listar repos da organização
    const { data: allRepos } = await octokit.repos.listForOrg({
        org,
        sort: 'updated',
        per_page: 100,
    });

    // 2. Filtrar apenas repos de equipe PampaTec
    const filteredRepos = allRepos.filter(
        (repo) => repo.topics && repo.topics.includes('pampatec-equipe')
    );

    // 3. Para cada repo, tentar buscar PROGRESSO_BMC.md
    const reposWithProgress = await Promise.all(
        filteredRepos.map(async (repo) => {
            try {
                const { data: fileData } = await octokit.repos.getContent({
                    owner: org,
                    repo: repo.name,
                    path: 'PROGRESSO_BMC.md',
                });

                const content = decodeBase64(fileData.content);
                const { step, percentage } = parseProgress(content);

                return {
                    ...repo,
                    isActive: !(repo.topics && repo.topics.includes('pampatec-inativo')),
                    hasProgress: true,
                    currentStep: step,
                    percentage,
                };
            } catch {
                return {
                    ...repo,
                    isActive: !(repo.topics && repo.topics.includes('pampatec-inativo')),
                    hasProgress: false,
                    percentage: 0,
                };
            }
        })
    );

    return reposWithProgress;
};
