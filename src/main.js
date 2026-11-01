import './vendor/yagui/yagui.css';
import './style.css';
import SculptGL from './SculptGL';

window.sketchfabOAuth2Config = {
  hostname: 'sketchfab.com',
  client_id: import.meta.env.VITE_SKETCHFAB_CLIENT_ID || 'OWoAmrd1QCS9wB54Ly17rMl2i5AHGvDNfmN4pEUH',
  redirect_uri: import.meta.env.VITE_SKETCHFAB_REDIRECT_URI || new URL('authSuccess.html', window.location.href).href
};

document.body.addEventListener('contextmenu', (event) => event.preventDefault());

const app = new SculptGL();
app.start();

window.SculptGL = SculptGL;
window.sculptgl = app;
