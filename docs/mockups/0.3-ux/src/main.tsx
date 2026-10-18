import { createRoot } from 'react-dom/client';
import App from './App';
import { MotionProvider } from '../../../../packages/ui/src/index';
import { motionManifest } from './library';
import './theme.css';
import './layout.css';

const params = new URLSearchParams(location.search);
const html = document.documentElement;
html.dataset.theme = params.get('theme') ?? 'light';
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
