import { isReduced } from '../motion.ts';

export function syncOverlayHost(
  host: HTMLElement | null | undefined,
  opener: HTMLElement | null | undefined,
  reduced?: boolean,
): boolean {
  if (!host) return false;
  const source = opener ?? host;
  const theme = source.closest<HTMLElement>('[data-theme]')?.getAttribute('data-theme');
  if (theme) host.setAttribute('data-theme', theme);
  host.classList.add('fp-ionic');
  const isRed = reduced ?? isReduced(source);
  (host as HTMLElement & { animated: boolean }).animated = !isRed;
  if (isRed) {
    host.setAttribute('animated', 'false');
    host.setAttribute('data-motion', 'reduced');
  } else {
    host.setAttribute('animated', 'true');
    host.setAttribute('data-motion', 'standard');
  }
  return isRed;
}

export function getAncestorTheme(el: HTMLElement | null | undefined): string | undefined {
  return el?.closest<HTMLElement>('[data-theme]')?.getAttribute('data-theme') ?? undefined;
}
