import { Routes } from '@angular/router';
import { HomeLandingComponent } from './features/auth/home-landing/home-landing.component';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { HomeComponent } from './features/home/home.component';
import { ProfileComponent } from './features/auth/profile/profile.component';

// Nuevas rutas
import { CreateRoomComponent } from './features/room/create/create-room.component';
import { Lobby } from './features/room/lobby/lobby';

export const routes: Routes = [
  { path: '', component: HomeLandingComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'main_menu', component: HomeComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'profile/:id', component: ProfileComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  
  // Game & Room Routes
  { path: 'room/create', component: CreateRoomComponent },
  { path: 'room/:code/lobby', component: Lobby },
  {
    path: 'room/:code/game',
    loadComponent: () =>
      import('./features/game/containers/game/game').then((m) => m.GameComponent),
  },
  {
    path: 'matchmaking',
    loadComponent: () =>
      import('./features/matchmaking/matchmaking.component').then((m) => m.MatchmakingComponent),
  },

  // Fallback
  { path: '**', redirectTo: '' }
];
