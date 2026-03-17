import React, { Suspense } from 'react';
import { Spinner } from 'react-bootstrap';

const DefaultFallback = () => (
    <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" variant="primary" />
    </div>
);

/**
 * Wrapper de Suspense padrão do sistema.
 * Usado em todas as rotas e features para boundary de carregamento.
 */
const SuspenseLoader = ({ children, fallback }) => (
    <Suspense fallback={fallback ?? <DefaultFallback />}>
        {children}
    </Suspense>
);

export default SuspenseLoader;
