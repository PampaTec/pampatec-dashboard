import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useGithubClient } from '../../../hooks/useGithubClient';
import { fetchReposWithProgress } from '../api/githubApi';

/**
 * Hook: busca repositórios com progresso via Suspense-first.
 * Não retorna isLoading — o Suspense cuida do estado de carregamento.
 */
export const useRepos = () => {
    const { octokit, token, org } = useGithubClient();

    const { data: repos } = useSuspenseQuery({
        queryKey: ['repos', org, token],
        queryFn: () => {
            if (!token || !octokit) throw new Error('TOKEN_MISSING');
            return fetchReposWithProgress({ octokit, org });
        },
        staleTime: 30_000, // 30s cache
        retry: 1,
    });

    return { repos };
};

/**
 * Hook: invalida o cache de repos para forçar refetch.
 */
export const useRefreshRepos = () => {
    const queryClient = useQueryClient();
    const { org } = useGithubClient();
    return () => queryClient.invalidateQueries({ queryKey: ['repos', org] });
};
