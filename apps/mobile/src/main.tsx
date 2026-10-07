import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import './theme/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { pickLocale } from './i18n/messages';
import { createBrowserServices } from './services/services';

const services = await createBrowserServices();
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App services={services} locale={pickLocale(navigator.languages)} />
  </StrictMode>,
);
