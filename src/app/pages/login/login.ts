import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="login-container">
      <div class="login-card glass-panel">
        <div class="login-header">
          <span class="logo-icon">🏮</span>
          <h1>Únete a la Comunidad</h1>
          <p>Inicia sesión para ayudarnos a mejorar reportando errores o dejando tus sugerencias.</p>
        </div>
        
        <div class="login-actions">
          <button class="btn-google" (click)="auth.loginWithGoogle()">
            <img src="https://www.google.com/favicon.ico" alt="Google" />
            Continuar con Google
          </button>
        </div>

        <div class="login-footer">
          <p>Tu participación nos ayuda a crear la mejor herramienta para aprender japonés. ❤️</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at center, #1a1a2e 0%, #0f0f1a 100%);
      padding: 1.5rem;
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 3rem 2rem;
      text-align: center;
      background: rgba(30, 30, 45, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 24px;
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    }

    .login-header {
      margin-bottom: 2.5rem;
      
      .logo-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: 1rem;
      }
      
      h1 {
        font-size: 1.8rem;
        margin-bottom: 0.5rem;
        background: linear-gradient(135deg, white 0%, #888 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      p {
        color: #888;
        font-size: 0.95rem;
        line-height: 1.5;
      }
    }

    .btn-google {
      width: 100%;
      padding: 1rem;
      background: white;
      color: #333;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);

      img {
        width: 20px;
        height: 20px;
      }

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(255,255,255,0.15);
        background: #f8f8f8;
      }

      &:active {
        transform: translateY(-1px);
      }
    }

    .login-footer {
      margin-top: 2.5rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(255,255,255,0.05);
      
      p {
        font-size: 0.8rem;
        color: #555;
      }
    }
  `]
})
export class Login {
  auth = inject(AuthService);
}
