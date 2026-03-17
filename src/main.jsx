import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App.jsx';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Com Suspense ativo, erros são propagados para o Error Boundary
            throwOnError: true,
            staleTime: 30_000,
        },
    },
});

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    </StrictMode>
);
