export const environment = {
  production: false,
  pocketbase: {
    url: import.meta.env.NG_APP_PB_URL || 'http://127.0.0.1:8090'
  }
};
