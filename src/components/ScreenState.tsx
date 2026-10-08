import { Component, type ComponentChildren } from 'preact';
import { Icon } from './Icon';

export type ScreenStateKind = 'loading' | 'empty' | 'error';

export function ScreenState({
  kind,
  title,
  message,
  actionLabel,
  onAction,
  compact = false
}: {
  kind: ScreenStateKind;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <section
      class={`screen-state ${kind}${compact ? ' compact' : ''}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live={kind === 'loading' ? 'polite' : undefined}
      aria-busy={kind === 'loading' ? 'true' : undefined}
    >
      <div class="screen-state-icon" aria-hidden="true">
        {kind === 'loading' ? <span class="state-spinner" /> : <Icon name={kind === 'empty' ? 'search' : 'info'} />}
      </div>
      <div class="screen-state-copy">
        <b>{title}</b>
        <p>{message}</p>
      </div>
      {actionLabel && onAction ? <button class="btn g" type="button" onClick={onAction}>{actionLabel}</button> : null}
    </section>
  );
}

export class ViewErrorBoundary extends Component<
  { screen: string; children: ComponentChildren },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(previous: { screen: string }) {
    if (previous.screen !== this.props.screen && this.state.error) this.setState({ error: null });
  }

  componentDidCatch(error: Error) {
    console.error(`[SPIDER·GUIA:${this.props.screen}]`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <ScreenState
          kind="error"
          title={`Não foi possível abrir ${this.props.screen}`}
          message="Seu progresso continua salvo. Recarregue a tela para tentar novamente."
          actionLabel="Tentar novamente"
          onAction={() => location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
