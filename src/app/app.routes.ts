import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Catalog } from './pages/catalog/catalog';
import { Play } from './pages/play/play';
import { Admin } from './pages/admin/admin';
import { Login } from './pages/login/login';
import { AboutComponent } from './pages/about/about';
import { CommunityComponent } from './pages/community/community';
import { ProfileComponent } from './pages/profile/profile';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
    { path: '', component: Home, title: 'Home' },
    { path: 'catalogo', component: Catalog, title: 'Catálogo de Videos' },
    { path: 'play/:slug', component: Play, title: 'Reproduciendo' },
    { path: 'login', component: Login, canActivate: [guestGuard], title: 'Iniciar Sesión' },
    { path: 'perfil', component: ProfileComponent, canActivate: [authGuard], title: 'Mi Perfil' },
    { path: 'admin', component: Admin, canActivate: [authGuard], title: 'Panel de Administración' },
    { path: 'sobre-el-proyecto', component: AboutComponent, title: 'Sobre el Proyecto' },
    { path: 'comunidad', component: CommunityComponent, title: 'Comunidad' },
    { path: '**', redirectTo: '' }
];
