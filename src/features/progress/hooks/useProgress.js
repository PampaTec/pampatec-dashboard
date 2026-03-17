import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useGithubClient } from '../../../hooks/useGithubClient';
import { fetchProgress } from '../api/progressApi';

/**
 * Hook: busca e parseia o PROGRESSO_BMC.md via Suspense-first.
 */
export const useProgress = (repoName) => {
    const { octokit, token, org } = useGithubClient();

    const { data } = useSuspenseQuery({
        queryKey: ['progress', org, repoName, token],
        queryFn: () => {
            if (!token || !octokit) throw new Error('TOKEN_MISSING');
            return fetchProgress({ octokit, org, repoName });
        },
        staleTime: 15_000,
        retry: 1,
    });

    return data; // objeto parseado do PROGRESSO_BMC.md + fileSha
};

/**
 * Hook: invalida o cache de progresso para forçar refetch.
 */
export const useRefreshProgress = (repoName) => {
    const queryClient = useQueryClient();
    const { org } = useGithubClient();
    return () => queryClient.invalidateQueries({ queryKey: ['progress', org, repoName] });
};
