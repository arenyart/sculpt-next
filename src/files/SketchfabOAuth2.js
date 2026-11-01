/**
 * Minimal OAuth2 implicit-grant popup flow for Sketchfab.
 * The popup is redirected to `redirect_uri` (same origin as the app), which lets us
 * read the access token from its URL fragment.
 */
class SketchfabOAuth2 {

  constructor(config) {
    this.config = config;
  }

  connect() {
    const { hostname, client_id: clientId, redirect_uri: redirectUri } = this.config;
    if (!clientId) return Promise.reject(new Error('client_id is missing.'));

    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      response_type: 'token',
      state,
      client_id: clientId,
      redirect_uri: redirectUri
    });
    const popup = window.open(`https://${hostname}/oauth2/authorize/?${params}`, 'loginWindow', 'width=640,height=480');
    if (!popup) return Promise.reject(new Error('Popup blocked'));

    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          reject(new Error('Access denied (user closed popup)'));
          return;
        }

        let href;
        try {
          href = popup.location.href;
        } catch {
          return; // still on the Sketchfab origin
        }
        if (!href || !href.startsWith(redirectUri)) return;

        clearInterval(timer);
        const url = new URL(href);
        const result = Object.fromEntries(new URLSearchParams(url.hash.slice(1) || url.search.slice(1)));
        popup.close();

        if (result.error) reject(new Error(`Access denied (${result.error})`));
        else if (result.state !== state) reject(new Error('Access denied (state mismatch)'));
        else if (!result.access_token) reject(new Error('Access denied (missing token)'));
        else resolve(result);
      }, 250);
    });
  }
}

export default SketchfabOAuth2;
