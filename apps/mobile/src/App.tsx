import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { IntlProvider } from 'react-intl';
import { Navigate, Route } from 'react-router-dom';
import { catalogs, type Locale } from './i18n/messages';
import { AdvancedPage } from './pages/AdvancedPage';
import { BakePage } from './pages/BakePage';
import { BakesPage } from './pages/BakesPage';
import { DeviceChecksPage } from './pages/DeviceChecksPage';
import { FloursPage } from './pages/FloursPage';
import { RecipePage } from './pages/RecipePage';
import { RecipesPage } from './pages/RecipesPage';
import { FlourCatalogProvider } from './services/flours';
import { NotificationSync } from './services/NotificationSync';
import { ServicesProvider, type Services } from './services/services';

setupIonicReact();

export const App = ({ services, locale }: { services: Services; locale: Locale }) => (
  <IntlProvider locale={locale} defaultLocale="en" messages={catalogs[locale]}>
    <ServicesProvider services={services}>
      <FlourCatalogProvider>
        <IonApp>
          <IonReactRouter>
            <NotificationSync />
            <IonRouterOutlet>
              <Route path="/recipes" element={<RecipesPage />} />
              <Route path="/recipes/:recipeId" element={<RecipePage />} />
              <Route path="/drafts/:draftId" element={<RecipePage />} />
              <Route path="/bakes" element={<BakesPage />} />
              <Route path="/bakes/:bakeId" element={<BakePage />} />
              <Route path="/flours" element={<FloursPage />} />
              <Route path="/advanced" element={<AdvancedPage />} />
              <Route path="/device-checks" element={<DeviceChecksPage />} />
              <Route path="/" element={<Navigate to="/recipes" replace />} />
            </IonRouterOutlet>
          </IonReactRouter>
        </IonApp>
      </FlourCatalogProvider>
    </ServicesProvider>
  </IntlProvider>
);
