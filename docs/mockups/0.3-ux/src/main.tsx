import { createRoot } from 'react-dom/client';
import App from './App';
import { MotionProvider } from '../../../../packages/ui/src/index';
import { motionManifest } from './library';
import { getResolvedTheme, type ResolvedTheme } from './device-preferences';
import './theme.css';
import './layout.css';

const params = new URLSearchParams(location.search);
const html = document.documentElement;
const urlTheme = params.get('theme');
const validThemes: readonly ResolvedTheme[] = ['light', 'dark', 'amoled'];
if (urlTheme && validThemes.includes(urlTheme as ResolvedTheme)) {
  html.dataset.theme = urlTheme;
} else {
  html.dataset.theme = getResolvedTheme();
}

html.dataset.motion = params.get('motion') === 'reduce' ? 'reduced' : 'standard';
html.dataset.textScale = params.get('scale') ?? '100';
html.style.fontSize = `${Number(params.get('scale') ?? '100')}%`;

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(
  <MotionProvider value={motionManifest}>
    <App />
  </MotionProvider>,
);
