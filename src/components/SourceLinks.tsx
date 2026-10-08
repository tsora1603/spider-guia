import { DATA } from '../data/model';
import { Icon } from './Icon';

export function SourceLinks({ indexes = [] }: { indexes?: number[] }) {
  return <>
    {indexes.map(index => {
      const source = DATA.fontes.r[index];
      if (!source) return null;
      const title = String(source[0]).replace(/\s*\(atualizado.*$/, '');
      const url = String(source[2] || '').split(/\s*;\s*/)[0];
      return /^https?:\/\//.test(url)
        ? <a class="source-link" href={url} target="_blank" rel="noopener"><Icon name="search" /> {title} <Icon name="chevR" /></a>
        : <span class="source-link"><Icon name="search" /> {title}</span>;
    })}
  </>;
}

