import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createNuanceConversation } from '@nuancelabs/js-sdk';
import App from './App';
import { registerNuanceSdk, type NuanceFactory } from './avatar/sdk';
import './styles.css';

// The page's only SDK source. Registering the pinned factory here (rather than
// importing the SDK inside App) keeps App testable without the SDK and means
// nothing resolves the SDK until the user presses Start.
registerNuanceSdk(createNuanceConversation as unknown as NuanceFactory);

const container = document.getElementById('root');
if (container === null) throw new Error('Missing #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
