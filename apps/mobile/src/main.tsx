import './theme/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { catalogs, pickLocale } from './i18n/messages';
import { startDevVersions } from './services/dev-versions';
import { createServices } from './services/services';
import { initializeDocumentTheme } from './theme/device-theme';

initializeDocumentTheme();

const locale = pickLocale(navigator.languages);
document.documentElement.lang = locale;
const root = createRoot(document.getElementById('root') as HTMLElement);

try {
  const services = await createServices({
    reminderChannel: catalogs[locale]['notify.channel'],
  });
  // Dev apps only (ADR 0023): restore a pending "copy my data to this version", clean up.
  const devVersions = await startDevVersions(services);
  root.render(
    <StrictMode>
      <App services={services} locale={locale} copyOutcome={devVersions?.copy} />
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
