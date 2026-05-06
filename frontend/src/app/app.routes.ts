import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'room/:code/game',
    loadComponent: () =>
      import('./features/game/containers/game/game').then((m) => m.GameComponent),
  },
];
