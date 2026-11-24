import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import FoundationLanding from './foundation/FoundationLanding';
import AccountPage from './account/AccountPage';
import './styles.css';

const container = document.getElementById('root');
if (container === null) throw new Error('Missing #root');

const root = createRoot(container);
const path = window.location.pathname.replace(/\/+$/, '');

if (path === '/account') {
  root.render(
    <StrictMode>
      <AccountPage />
    </StrictMode>,
  );
} else if (path === '/mira') {
  // The separately approved Mira connection test is opt-in: load its page and
  // the provider SDK only here, never on the foundation landing.
  void Promise.all([import('./App'), import('./avatar/sdk'), import('@nuancelabs/js-sdk')])
    .then(([appModule, sdkModule, nuanceModule]) => {
      sdkModule.registerNuanceSdk(
        nuanceModule.createNuanceConversation as unknown as import('./avatar/sdk').NuanceFactory,
      );
      root.render(
        <StrictMode>
          <appModule.default />
        </StrictMode>,
      );
    })
    .catch(() => {
      root.render(
        <StrictMode>
          <main className="foundation-page">
            <h1>Mira connection test unavailable</h1>
            <p role="alert">The optional Mira connection test could not be loaded.</p>
            <p>
              <a href="/">Back to the foundation page</a>
            </p>
          </main>
        </StrictMode>,
      );
    });
} else {
  root.render(
    <StrictMode>
      <FoundationLanding />
    </StrictMode>,
  );
}
