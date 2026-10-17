import { createRoot } from 'react-dom/client';
import App from './App';
import './theme.css';
import './layout.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(<App />);
