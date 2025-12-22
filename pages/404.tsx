export default function Custom404() {
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
                404
            </h1>
            <p style={{ fontSize: '1.25rem', color: '#64748b', marginTop: '1rem' }}>
                Página no encontrada
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
