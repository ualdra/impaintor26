// PENDING — Track E (Auth) reemplazará este helper con AuthService.getToken().
// Mientras tanto, leemos directamente de localStorage con la key acordada 'jwt'.

import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

const TOKEN_KEY = 'jwt';

/** Devuelve el JWT crudo si existe en localStorage, o null. SSR-safe. */
export function getStoredToken(): string | null {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
