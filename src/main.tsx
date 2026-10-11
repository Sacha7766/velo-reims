import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800-italic.css';
import { createRoot } from 'react-dom/client';
import { registerTileCache } from './geo/tileCache.ts';
import { App } from './ui/App.tsx';
import './ui/styles.css';

void registerTileCache();
createRoot(document.getElementById('root')!).render(<App />);
