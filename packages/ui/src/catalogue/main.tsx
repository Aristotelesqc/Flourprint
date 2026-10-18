// Standalone catalogue page: node scripts/ui-catalogue.mjs serve | build.
import { createRoot } from 'react-dom/client';
import '../tokens.css';
import '../components.css';
import { Catalogue } from './Catalogue.tsx';
import { defaultMotionManifest, motionCatalogue, motionGuides } from './motions.ts';
import { catalogue, guides } from './registry.ts';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <Catalogue
      catalogue={catalogue}
      guides={guides}
      motions={motionCatalogue}
      motionGuides={motionGuides}
      motionManifest={defaultMotionManifest}
    />,
  );
}
