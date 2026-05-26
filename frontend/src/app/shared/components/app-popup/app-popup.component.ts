import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="popup-overlay" (click)="onClose()">
      <div class="popup-content" (click)="$event.stopPropagation()">
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <div class="popup-actions">
          <button class="btn-submit" (click)="onClose()">Aceptar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .popup-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
    }
    .popup-content {
      position: relative;
      background:
        repeating-linear-gradient(
          0deg,
          rgba(255,255,255,0.012) 0px,
          rgba(255,255,255,0.012) 1px,
          transparent 1px,
          transparent 28px
        ),
        linear-gradient(
          160deg,
          #2e1505 0%,
          #3d1f08 30%,
          #2a1203 70%,
          #1e0c02 100%
        );
      border: 2px solid #5c3a1e;
      border-radius: 8px;
      padding: 2.25rem 2rem;
      width: 90%;
      max-width: 420px;
      box-shadow:
        0 0 0 4px #1a0e05,
        0 0 0 6px #3d2208,
        0 20px 60px rgba(0, 0, 0, 0.8),
        inset 0 1px 0 rgba(255, 200, 100, 0.08),
        inset 0 -1px 0 rgba(0, 0, 0, 0.5);
      text-align: center;
      color: #fdf5e6;
      animation: popupScale 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes popupScale {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    h3 {
      font-family: 'MedievalSharp', 'Cinzel', Georgia, serif;
      font-size: 2.2rem;
      font-weight: 700;
      color: #f5e6c8;
      margin: 0 0 0.85rem 0;
      letter-spacing: 0.03em;
      text-shadow:
        2px 2px 0 #3a1a00,
        0 0 20px rgba(255, 180, 60, 0.4);
    }
    p {
      font-family: 'Kalam', 'Nunito', cursive, sans-serif;
      color: #c9a86c;
      margin: 0 0 1.75rem 0;
      font-size: 1.15rem;
      line-height: 1.5;
    }
    .popup-actions {
      display: flex;
      justify-content: center;
    }
    .btn-submit {
      width: 100%;
      max-width: 160px;
      padding: 0.8rem 1.5rem;
      border-radius: 4px;
      font-family: 'MedievalSharp', 'Cinzel', serif;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      text-transform: uppercase;
      background-color: #c9a86c;
      color: #1a0e05;
      border: none;
      box-shadow: 0 4px 15px rgba(201, 168, 108, 0.3);
      transition: transform 0.15s, background-color 0.15s, box-shadow 0.15s;
    }
    .btn-submit:hover {
      background-color: #e0c28b;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(201, 168, 108, 0.4);
    }
    .btn-submit:active {
      transform: translateY(1px);
    }
  `]
})
export class AppPopupComponent {
  @Input() title: string = 'Aviso';
  @Input() message: string = '';
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }
}
