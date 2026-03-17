import { Octokit } from '@octokit/rest';

/**
 * Hook singleton para obter o cliente Octokit autenticado.
 * Lê o token do localStorage uma única vez por sessão.
 * @returns {{ octokit: Octokit, token: string|null, org: string }}
 */
export const useGithubClient = () => {
    const token = localStorage.getItem('pampatec_gh_token');
    const org = localStorage.getItem('pampatec_gh_org') || 'PampaTec';
    const octokit = token ? new Octokit({ auth: token }) : null;

    return { octokit, token, org };
};
