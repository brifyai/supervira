import { NextPage } from 'next'

interface ErrorProps {
    statusCode?: number
}

const Error: NextPage<ErrorProps> = ({ statusCode }) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: '#f8fafc'
        }}>
            <h1 style={{ fontSize: '6rem', fontWeight: 700, margin: 0, color: '#3b82f6' }}>
                {statusCode || 'Error'}
            </h1>
            <p style={{ fontSize: '1.25rem', color: '#64748b', marginTop: '1rem' }}>
                {statusCode === 404
                    ? 'Página no encontrada'
                    : statusCode === 500
                        ? 'Error interno del servidor'
                        : 'Ha ocurrido un error'}
            </p>
            <a
                href="/"
                style={{
                    marginTop: '2rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    borderRadius: '0.5rem',
                    textDecoration: 'none'
                }}
            >
                Volver al inicio
            </a>
        </div>
    )
}

Error.getInitialProps = ({ res, err }) => {
    const statusCode = res ? res.statusCode : err ? err.statusCode : 404
    return { statusCode }
}

export default Error
