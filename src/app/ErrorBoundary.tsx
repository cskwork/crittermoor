import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Crittermoor] uncaught error', error, info)
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="error-screen panel">
          <h2>Crittermoor crashed.</h2>
          <p>An unexpected error broke the game loop. Your last autosave (if any) is still in IndexedDB.</p>
          <pre>{this.state.error.message}</pre>
          <div className="actions">
            <button onClick={() => location.reload()}>Reload</button>
            <button onClick={this.reset}>Try to continue</button>
          </div>
          <style>{`
            .error-screen { position:absolute; inset:24px; padding:24px; overflow:auto; }
            .error-screen h2 { color: var(--danger); margin-top: 0; }
            .error-screen pre { background:#0d1115; padding:10px; border-radius:6px; overflow:auto; }
            .error-screen .actions { display:flex; gap:8px; margin-top:14px; }
          `}</style>
        </div>
      )
    }
    return this.props.children
  }
}
