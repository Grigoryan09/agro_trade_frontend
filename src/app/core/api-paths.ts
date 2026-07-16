/** Relative API base paths. Proxy maps the prefixes to real backend ports. */
export const API = {
  agro: '/agro-trade-service/api/v1',
  authToken: '/auth/token',
  chat: '/chat-service/api/v1/chats',
  banking: '/banking-service/api/v1',
  bankingRequests: '/agro-trade-service/api/v1/banking-requests',
} as const;
