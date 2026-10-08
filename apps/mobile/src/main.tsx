import './theme/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { catalogs, pickLocale } from './i18n/messages';
import { createServices } from './services/services';

const locale = pickLocale(navigator.languages);
document.documentElement.lang = locale;
const root = createRoot(document.getElementById('root') as HTMLElement);

try {
  const services = await createServices();
  root.render(
    <StrictMode>
      <App services={services} locale={locale} />
    </StrictMode>,
  );
} catch (error) {
  // Opening or migrating the database failed: say so instead of showing a blank screen.
  console.error(error);
  root.render(
    <p role="alert" style={{ padding: 24 }}>
      {catalogs[locale]['state.storageInit']}
    </p>,
  );
}
