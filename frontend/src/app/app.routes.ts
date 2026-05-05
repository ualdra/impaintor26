// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeLandingComponent } from './features/auth/home-landing/home-landing.component';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';

import { HomeComponent } from './features/home/home.component';
import { MatchmakingComponent } from './features/matchmaking/matchmaking.component';
import { CreateRoomComponent } from './features/room/create/create-room.component';
import { Game } from './features/room/game/game';

export const routes: Routes = [
  { path: '', component: HomeLandingComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'main_menu', component: HomeComponent },
  { path: 'matchmaking', component: MatchmakingComponent },
  { path: 'room/create', component: CreateRoomComponent },
  { path: 'room/:code/game', component: Game },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: '**', redirectTo: '' }
];
