import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Play } from './pages/play/play';
import { Admin } from './pages/admin/admin';
import { Login } from './pages/login/login';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'play/:id', component: Play },
    { path: 'login', component: Login },
    { path: 'admin', component: Admin, canActivate: [authGuard] },
    { path: '**', redirectTo: '' }
];
