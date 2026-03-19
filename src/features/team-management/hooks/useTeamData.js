import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useGithubClient } from '../../../hooks/useGithubClient';
import { fetchTeamData } from '../api/teamApi';

/**
 * Hook: busca dados de um time via Suspense-first.
 */
export const useTeamData = (repoName) => {
    const { octokit, token, org } = useGithubClient();

    const { data } = useSuspenseQuery({
        queryKey: ['team', org, repoName, token],
        queryFn: () => {
            if (!token || !octokit) throw new Error('TOKEN_MISSING');
            return fetchTeamData({ octokit, org, repoName });
        },
        staleTime: 15_000,
        retry: 1,
    });

    return data; // { repo, collaborators, pendingInvites, progress, hasConsolidatedBmc }
};

/**
 * Hook: invalida o cache do time para forçar refetch após mutações.
 */
export const useRefreshTeam = (repoName) => {
    const queryClient = useQueryClient();
    const { org } = useGithubClient();
    return () => queryClient.invalidateQueries({ queryKey: ['team', org, repoName] });
};
