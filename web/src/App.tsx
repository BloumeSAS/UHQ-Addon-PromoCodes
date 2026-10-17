import { Routes, Route } from 'react-router-dom';
import { AddonProvider } from './context';
import MyCodes from './pages/MyCodes';
import AdminCodes from './pages/AdminCodes';

/**
 * Routes :
 *   /       → page cliente (appliquer un code cadeau, historique)
 *   /admin  → gestion des codes (admin)
 */
export default function App() {
  return (
    <AddonProvider>
      <Routes>
        <Route path="/" element={<MyCodes />} />
        <Route path="/admin" element={<AdminCodes />} />
      </Routes>
    </AddonProvider>
  );
}
