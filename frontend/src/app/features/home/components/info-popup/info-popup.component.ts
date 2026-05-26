import { Component, Output, EventEmitter } from '@angular/core';

/**
 * InfoPopupComponent — SRP: muestra únicamente la guía completa del juego.
 * Utiliza el mismo lenguaje visual medieval que el resto de la aplicación.
 */
@Component({
  selector: 'app-info-popup',
  standalone: true,
  template: `
    <div class="overlay" (click)="close.emit()" role="dialog" aria-modal="true" aria-label="Cómo jugar a Impaintor">
      <div class="panel" (click)="$event.stopPropagation()">

        <!-- Cabecera -->
        <header class="panel-header">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               class="header-icon" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          <h2>Cómo Jugar a Impaintor</h2>
          <button class="close-btn" (click)="close.emit()" aria-label="Cerrar guía">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                 style="width:1.2rem;height:1.2rem;">
              <path d="M18 6 6 18"/><path d="M6 6 18 18"/>
            </svg>
          </button>
        </header>

        <!-- Contenido scrollable -->
        <div class="panel-body">

          <!-- ¿Qué es? -->
          <section class="section">
            <h3 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   class="section-icon">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              ¿Qué es Impaintor?
            </h3>
            <p class="section-text">
              Impaintor es un juego multijugador de <strong>dibujo y engaño</strong> para entre 3 y 8 jugadores.
              Al inicio de la partida, un jugador es elegido secretamente como el <em>Impaintor</em> (impostor).
              Todos los demás reciben una <strong>palabra secreta</strong> que deben dibujar. El impostor no la conoce y debe
              fingir que sí lo sabe. Tu misión: descubrir quién dibuja sin contexto… o sobrevivir sin ser descubierto.
            </p>
          </section>

          <div class="divider"></div>

          <!-- Roles -->
          <section class="section">
            <h3 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   class="section-icon">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Los Roles
            </h3>
            <div class="role-cards">
              <div class="role-card painter">
                <span class="role-badge">
                  <svg class="badge-icon text-painter" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.03345 19.1749 5.27064 19.2612 5.51868 19.2318C6.63462 19.0991 7.2154 18.242 7.74751 17.4608C8.24354 16.7327 8.70519 16.055 9.8 16H10C11.1046 16 12 16.8954 12 18V22Z"/>
                    <circle cx="7.5" cy="10.5" r="1"/>
                    <circle cx="11.5" cy="7.5" r="1"/>
                    <circle cx="16.5" cy="9.5" r="1"/>
                  </svg>
                  Pintor
                </span>
                <p>Conoces la <strong>palabra secreta</strong>. Dibújala sin que el impostor la adivine. Vota a quien creas que está fingiendo.</p>
              </div>
              <div class="role-card impostor">
                <span class="role-badge">
                  <svg class="badge-icon text-impostor" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 10s3-4 10-4 10 4 10 4M2 14s3 4 10 4 10-4 10-4"/>
                    <circle cx="7" cy="12" r="2"/>
                    <circle cx="17" cy="12" r="2"/>
                    <path d="M12 10v4"/>
                  </svg>
                  Impaintor
                </span>
                <p>No conoces la palabra. Solo tienes una <strong>pista relacionada</strong>. Dibuja algo convincente, intenta adivinar la palabra y sobrevive a las votaciones.</p>
              </div>
            </div>
          </section>

          <div class="divider"></div>

          <!-- Flujo de la partida -->
          <section class="section">
            <h3 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   class="section-icon">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
              Fases de la Partida
            </h3>
            <ol class="steps-list">
              <li>
                <span class="step-num">1</span>
                <div>
                  <strong>Dibujo:</strong> Los jugadores dibujan por turnos en el lienzo compartido. Tienes un tiempo limitado.
                  Todos ven los dibujos en directo. La <strong>palabra es la misma en todas las rondas</strong>.
                </div>
              </li>
              <li>
                <span class="step-num">2</span>
                <div>
                  <strong>Galería:</strong> Cuando todos han dibujado, los lienzos se muestran juntos para que los analices.
                </div>
              </li>
              <li>
                <span class="step-num">3</span>
                <div>
                  <strong>Votación:</strong> Todos votan <em>simultáneamente</em> a quien creen que es el impostor.
                  En la primera ronda el voto es opcional; en las siguientes es obligatorio.
                </div>
              </li>
              <li>
                <span class="step-num">4</span>
                <div>
                  <strong>Resultado:</strong> El jugador con más votos es eliminado. Si no hay mayoría clara, nadie cae.
                  Solo se revelan los jugadores con más votos (los demás quedan anónimos).
                </div>
              </li>
            </ol>
          </section>

          <div class="divider"></div>

          <!-- Desempate -->
          <section class="section">
            <h3 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   class="section-icon">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                <path d="M12 8v4l3 3"/>
              </svg>
              Desempate (Ronda 2 en adelante)
            </h3>
            <p class="section-text">
              Si hay empate en la votación, el <strong>Impaintor puede mover su voto</strong> a otro jugador para romperlo estratégicamente.
              Si no lo hace antes de que el tiempo expire, el impostor es expulsado automáticamente.
            </p>
          </section>

          <div class="divider"></div>

          <!-- Mecánica de adivinación -->
          <section class="section">
            <h3 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   class="section-icon">
                <path d="M15 11h.01"/><path d="M11 15h.01"/>
                <path d="M9 9h.01"/><path d="M13 13h.01"/>
                <rect width="20" height="20" x="2" y="2" rx="2"/>
              </svg>
              Adivinación del Impaintor
            </h3>
            <p class="section-text">
              El Impaintor puede intentar adivinar la palabra secreta <strong>en cualquier momento</strong> de la partida
              (durante el dibujo, la galería o la votación). Dispone de un número limitado de vidas (por defecto: 1).
            </p>
            <ul class="info-list">
              <li>
                <svg class="list-icon text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Si adivina correctamente → <strong>el Impaintor gana</strong> al instante.</span>
              </li>
              <li>
                <svg class="list-icon text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                <span>Si falla y se queda sin vidas → <strong>los Pintores ganan</strong> al instante.</span>
              </li>
              <li>
                <svg class="list-icon text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/>
                </svg>
                <span>Solo tienes una pista: una palabra del mismo grupo semántico.</span>
              </li>
            </ul>
          </section>

          <div class="divider"></div>

          <!-- Condiciones de victoria -->
          <section class="section">
            <h3 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   class="section-icon">
                <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
              </svg>
              ¿Quién Gana?
            </h3>
            <div class="win-table">
              <div class="win-row header-row">
                <span>Condición</span><span>Ganador</span>
              </div>
              <div class="win-row">
                <span>El impostor es eliminado por votación</span>
                <span class="tag painters">Pintores</span>
              </div>
              <div class="win-row">
                <span>El impostor adivina la palabra correctamente</span>
                <span class="tag impostor">Impaintor</span>
              </div>
              <div class="win-row">
                <span>El impostor falla y se queda sin vidas</span>
                <span class="tag painters">Pintores</span>
              </div>
              <div class="win-row">
                <span>Empate y el impostor no mueve su voto</span>
                <span class="tag painters">Pintores</span>
              </div>
              <div class="win-row">
                <span>Solo quedan 2 jugadores y el impostor no fue descubierto</span>
                <span class="tag impostor">Impaintor</span>
              </div>
            </div>
          </section>

          <div class="divider"></div>

          <!-- Modos de juego -->
          <section class="section">
            <h3 class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                   class="section-icon">
                <path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>
              </svg>
              Modos de Juego
            </h3>
            <div class="mode-cards">
              <div class="mode-card">
                <span class="mode-title">
                  <svg class="badge-icon text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                  Partida Privada
                </span>
                <p>Crea o únete a una sala con código. De 3 a 8 jugadores. El anfitrión puede configurar el tiempo de dibujo y las vidas del impostor.</p>
              </div>
              <div class="mode-card">
                <span class="mode-title">
                  <svg class="badge-icon text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/>
                  </svg>
                  Ranked
                </span>
                <p>Emparejamiento automático con 5 jugadores por ELO. Tu rango de búsqueda se amplía cada 10 segundos hasta encontrar partida.</p>
              </div>
            </div>
          </section>

        </div>

        <!-- Footer -->
        <footer class="panel-footer">
          <button class="btn-accept" (click)="close.emit()">¡Entendido!</button>
        </footer>

      </div>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.78);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 1rem;
    }

    .panel {
      position: relative;
      background:
        repeating-linear-gradient(
          0deg,
          rgba(255,255,255,0.012) 0px,
          rgba(255,255,255,0.012) 1px,
          transparent 1px,
          transparent 28px
        ),
        linear-gradient(160deg, #2e1505 0%, #3d1f08 30%, #2a1203 70%, #1e0c02 100%);
      border: 2px solid #5c3a1e;
      border-radius: 8px;
      box-shadow:
        0 0 0 4px #1a0e05,
        0 0 0 6px #3d2208,
        0 24px 64px rgba(0,0,0,0.85),
        inset 0 1px 0 rgba(255,200,100,0.08);
      width: 100%;
      max-width: 620px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      animation: popIn 0.28s cubic-bezier(0.34,1.56,0.64,1);
    }

    @keyframes popIn {
      from { transform: scale(0.88); opacity: 0; }
      to   { transform: scale(1);    opacity: 1; }
    }

    /* ---------- HEADER ---------- */
    .panel-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.25rem 1.5rem 1rem;
      border-bottom: 1px solid #5c3a1e;
      flex-shrink: 0;
    }

    .header-icon {
      width: 1.8rem;
      height: 1.8rem;
      color: #c9a86c;
      flex-shrink: 0;
    }

    .panel-header h2 {
      font-family: 'MedievalSharp', 'Cinzel', Georgia, serif;
      font-size: 1.55rem;
      color: #f5e6c8;
      margin: 0;
      flex: 1;
      text-shadow: 2px 2px 0 #3a1a00, 0 0 20px rgba(255,180,60,0.35);
      letter-spacing: 0.03em;
    }

    .close-btn {
      background: transparent;
      border: 1px solid #5c3a1e;
      border-radius: 50%;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #c9a86c;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .close-btn:hover {
      background: rgba(201,168,108,0.12);
      color: #f5e6c8;
    }

    /* ---------- BODY ---------- */
    .panel-body {
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
      flex: 1;
      scrollbar-width: thin;
      scrollbar-color: #5c3a1e #1a0e05;
    }
    .panel-body::-webkit-scrollbar { width: 6px; }
    .panel-body::-webkit-scrollbar-track { background: #1a0e05; }
    .panel-body::-webkit-scrollbar-thumb { background: #5c3a1e; border-radius: 3px; }

    .section { margin-bottom: 0.25rem; }

    .section-title {
      font-family: 'MedievalSharp', 'Cinzel', Georgia, serif;
      font-size: 1.05rem;
      color: #c9a86c;
      margin: 0 0 0.65rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      letter-spacing: 0.02em;
    }

    .section-icon {
      width: 1.05rem;
      height: 1.05rem;
      flex-shrink: 0;
    }

    .section-text {
      font-family: 'Kalam', 'Nunito', cursive, sans-serif;
      color: #d4b896;
      font-size: 0.97rem;
      line-height: 1.6;
      margin: 0;
    }

    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #5c3a1e 20%, #8b6040 50%, #5c3a1e 80%, transparent);
      margin: 1.1rem 0;
    }

    /* ---------- ROLES ---------- */
    .role-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .role-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid #3d2208;
      border-radius: 6px;
      padding: 0.75rem;
    }

    .role-card.painter { border-color: #4a7c59; }
    .role-card.impostor { border-color: #7c3a3a; }

    .role-badge {
      font-family: 'MedievalSharp', 'Cinzel', serif;
      font-size: 0.85rem;
      color: #f5e6c8;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.4rem;
    }

    .badge-icon {
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
    }

    .text-painter { color: #6fcf97; }
    .text-impostor { color: #eb5757; }
    .text-gold { color: #c9a86c; }

    .role-card p {
      font-family: 'Kalam', 'Nunito', cursive, sans-serif;
      color: #c9a86c;
      font-size: 0.88rem;
      line-height: 1.5;
      margin: 0;
    }

    /* ---------- STEPS ---------- */
    .steps-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .steps-list li {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      font-family: 'Kalam', 'Nunito', cursive, sans-serif;
      color: #d4b896;
      font-size: 0.95rem;
      line-height: 1.55;
    }

    .step-num {
      font-family: 'MedievalSharp', 'Cinzel', serif;
      background: #5c3a1e;
      color: #f5e6c8;
      border-radius: 50%;
      width: 1.6rem;
      height: 1.6rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      flex-shrink: 0;
      margin-top: 0.05rem;
    }

    /* ---------- INFO LIST ---------- */
    .info-list {
      list-style: none;
      padding: 0;
      margin: 0.65rem 0 0 0;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .info-list li {
      font-family: 'Kalam', 'Nunito', cursive, sans-serif;
      color: #d4b896;
      font-size: 0.92rem;
      line-height: 1.5;
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
    }

    .list-icon {
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
      margin-top: 0.15rem;
    }

    .text-success { color: #6fcf97; }
    .text-danger { color: #eb5757; }
    .text-warning { color: #f2c94c; }

    /* ---------- WIN TABLE ---------- */
    .win-table {
      border: 1px solid #3d2208;
      border-radius: 6px;
      overflow: hidden;
      font-family: 'Kalam', 'Nunito', cursive, sans-serif;
      font-size: 0.88rem;
    }

    .win-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      color: #d4b896;
      border-bottom: 1px solid rgba(92,58,30,0.4);
    }
    .win-row:last-child { border-bottom: none; }

    .header-row {
      background: rgba(201,168,108,0.07);
      font-family: 'MedievalSharp', 'Cinzel', serif;
      font-size: 0.8rem;
      color: #c9a86c;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .tag {
      font-family: 'MedievalSharp', 'Cinzel', serif;
      font-size: 0.78rem;
      padding: 0.2rem 0.55rem;
      border-radius: 3px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .tag.painters { background: rgba(74,124,89,0.25); color: #6fcf97; border: 1px solid #4a7c59; }
    .tag.impostor { background: rgba(124,58,58,0.25); color: #eb5757; border: 1px solid #7c3a3a; }

    /* ---------- MODES ---------- */
    .mode-cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }

    .mode-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid #3d2208;
      border-radius: 6px;
      padding: 0.75rem;
    }

    .mode-title {
      font-family: 'MedievalSharp', 'Cinzel', serif;
      font-size: 0.88rem;
      color: #f5e6c8;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.4rem;
    }

    .mode-card p {
      font-family: 'Kalam', 'Nunito', cursive, sans-serif;
      color: #c9a86c;
      font-size: 0.88rem;
      line-height: 1.5;
      margin: 0;
    }

    /* ---------- FOOTER ---------- */
    .panel-footer {
      padding: 1rem 1.5rem 1.25rem;
      border-top: 1px solid #5c3a1e;
      display: flex;
      justify-content: center;
      flex-shrink: 0;
    }

    .btn-accept {
      font-family: 'MedievalSharp', 'Cinzel', serif;
      font-size: 1.05rem;
      font-weight: 700;
      padding: 0.75rem 2.5rem;
      background: #c9a86c;
      color: #1a0e05;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      box-shadow: 0 4px 15px rgba(201,168,108,0.3);
      transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
    }

    .btn-accept:hover {
      background: #e0c28b;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(201,168,108,0.4);
    }

    .btn-accept:active { transform: translateY(1px); }

    /* ---------- RESPONSIVE ---------- */
    @media (max-width: 520px) {
      .role-cards, .mode-cards { grid-template-columns: 1fr; }
      .panel-header h2 { font-size: 1.2rem; }
    }
  `]
})
export class InfoPopupComponent {
  @Output() close = new EventEmitter<void>();
}
