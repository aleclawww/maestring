import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-8 text-8xl font-bold text-text-muted">404</div>

      <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-6 py-4 font-mono text-sm text-danger">
        <p className="font-bold">ResourceNotFoundException</p>
        <p className="mt-1 text-danger/80">
          The page you requested does not exist in this region.
        </p>
        <p className="mt-2 text-text-muted text-xs">
          Error Code: 404 | Request ID: {crypto.randomUUID?.() ?? 'unknown'}
        </p>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-text-primary">Página no encontrada</h1>
      <p className="mb-8 max-w-md text-text-secondary">
        La ruta que buscas no existe o fue eliminada. Intenta volver al dashboard o
        comprueba si la URL es correcta.
      </p>

      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="btn-primary"
        >
          Ir al Dashboard
        </Link>
        <Link
          href="/"
          className="btn-outline"
        >
          Página principal
        </Link>
      </div>

      <p className="mt-12 text-xs text-text-muted">
        ¿Crees que esto es un error? Contacta a soporte.
      </p>
    </div>
  )
}
