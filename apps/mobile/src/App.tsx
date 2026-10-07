import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { IntlProvider } from 'react-intl';
import { Navigate, Route } from 'react-router-dom';
import { catalogs, type Locale } from './i18n/messages';
import { FormulaPage } from './pages/FormulaPage';
import { RecipesPage } from './pages/RecipesPage';
import { ServicesProvider, type Services } from './services/services';

setupIonicReact();

export const App = ({ services, locale }: { services: Services; locale: Locale }) => (
  <IntlProvider locale={locale} defaultLocale="en" messages={catalogs[locale]}>
    <ServicesProvider services={services}>
      <IonApp>
        <IonReactRouter>
          <IonRouterOutlet>
            <Route path="/recipes" element={<RecipesPage />} />
            <Route path="/recipes/:recipeId" element={<FormulaPage />} />
            <Route path="/" element={<Navigate to="/recipes" replace />} />
          </IonRouterOutlet>
        </IonReactRouter>
      </IonApp>
    </ServicesProvider>
  </IntlProvider>
);
