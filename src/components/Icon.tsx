import {
  ArrowLeft, ArrowRight, BookOpen, Check, CheckCheck, ChevronDown,
  ChevronRight, ChevronUp, ExternalLink, House, Info, Link2, Minus,
  Play, RotateCcw, Route, Search, Settings, ShieldCheck, SkipForward, Trophy
} from 'lucide-preact';

/** Um único catálogo de ícones Lucide, usado por todas as áreas da aplicação.
 * Os nomes antigos continuam válidos para preservar a API dos componentes existentes.
 * SVGs decorativos não são anunciados por leitores de tela: o controle pai tem o rótulo.
 */
const ICONS = {
  home: House,
  checklist: CheckCheck,
  book: BookOpen,
  route: Route,
  skip: SkipForward,
  info: Info,
  search: Search,
  check: Check,
  settings: Settings,
  skipa: RotateCcw,
  play: Play,
  minus: Minus,
  chevD: ChevronDown,
  chevU: ChevronUp,
  chevR: ChevronRight,
  link: Link2,
  trophy: Trophy,
  shield: ShieldCheck,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  externalLink: ExternalLink
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size, className }: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const Glyph = ICONS[name];
  return <Glyph className={`i${className ? ` ${className}` : ''}`} size={size ?? 24}
    strokeWidth={2} aria-hidden="true" focusable="false" />;
}
