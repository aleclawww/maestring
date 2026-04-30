'use client'

export function ReloadButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="btn-primary"
    >
      Try again
    </button>
  )
}
