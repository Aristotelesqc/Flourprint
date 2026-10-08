import './theme/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { pickLocale } from './i18n/messages';
import { createServices } from './services/services';

const services = await createServices();
createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App services={services} locale={pickLocale(navigator.languages)} />
  </StrictMode>,
);
