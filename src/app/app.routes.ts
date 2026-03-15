import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Catalog } from './pages/catalog/catalog';
import { Play } from './pages/play/play';
import { Admin } from './pages/admin/admin';
import { Login } from './pages/login/login';
import { ProfileComponent } from './pages/profile/profile';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'catalogo', component: Catalog },
    { path: 'play/:slug', component: Play },
    { path: 'login', component: Login },
    { path: 'perfil', component: ProfileComponent, canActivate: [authGuard] },
    { path: 'admin', component: Admin, canActivate: [authGuard] },
    { path: '**', redirectTo: '' }
];
