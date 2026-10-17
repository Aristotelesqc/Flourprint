// Standalone catalogue page: node scripts/ui-catalogue.mjs serve | build.
import { createRoot } from 'react-dom/client';
import '../tokens.css';
import { Catalogue } from './Catalogue.tsx';
import { catalogue } from './registry.ts';

const root = document.getElementById('root');
if (root) createRoot(root).render(<Catalogue catalogue={catalogue} />);
