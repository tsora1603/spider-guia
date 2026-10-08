import type { JSX } from 'preact';

export type IconName =
  | 'home' | 'book' | 'route' | 'skip' | 'info' | 'search' | 'check'
  | 'settings' | 'skipa' | 'play' | 'minus' | 'chevD' | 'chevU' | 'link' | 'trophy' | 'shield';

export function Icon({ name, size }: { name: IconName; size?: number }) {
  const common: JSX.SVGAttributes<SVGSVGElement> = {
    class: 'i', viewBox: '0 0 24 24', 'aria-hidden': true,
    width: size, height: size
  };
  switch (name) {
    case 'home': return <svg {...common}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
    case 'book': return <svg {...common}><path d="M4 19.5V5a2 2 0 0 1 2-2h13v14H6a2 2 0 0 0-2 2.5z"/><path d="M6 21h13"/></svg>;
    case 'route': return <svg {...common}><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H17a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h8.5"/></svg>;
    case 'skip': return <svg {...common}><path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/></svg>;
    case 'settings': return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M10 2h4l.7 2.7 2.1.9 2.4-1.4 2.8 2.8-1.4 2.4.9 2.1L24 10v4l-2.7.7-.9 2.1 1.4 2.4-2.8 2.8-2.4-1.4-2.1.9L14 24h-4l-.7-2.7-2.1-.9-2.4 1.4L2 19l1.4-2.4-.9-2.1L0 14v-4l2.7-.7.9-2.1L2 4.8 4.8 2l2.4 1.4 2.1-.9z" transform="translate(2 2) scale(.83)"/></svg>;
    case 'info': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>;
    case 'search': return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'check': return <svg {...common}><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>;
    case 'skipa': return <svg {...common}><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/></svg>;
    case 'play': return <svg {...common}><path d="m7 4 13 8-13 8z"/></svg>;
    case 'minus': return <svg {...common}><path d="M5 12h14"/></svg>;
    case 'chevD': return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>;
    case 'chevU': return <svg {...common}><path d="m6 15 6-6 6 6"/></svg>;
    case 'link': return <svg {...common}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>;
    case 'trophy': return <svg {...common}><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4v1a3 3 0 0 0 3 3M16 6h4v1a3 3 0 0 1-3 3M12 13v4M8 21h8M10 17h4"/></svg>;
    case 'shield': return <svg {...common}><path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/></svg>;
  }
}
