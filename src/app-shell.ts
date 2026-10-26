import { GAME_ORDER, GAMES, type GameDefinition, type GameId } from './game-catalog';
import type { ControlMode } from './game-types';
import { normalizePlayerName, type Records } from './records';

type ShellEvents = {
  chooseGame(id: GameId): void;
  openHandDemo(): void;
  returnHome(): void;
  play(): void;
  stopCamera(): void;
  startHandDemo(): void;
  stopHandDemo(): void;
  saveName(name: string): void;
  unlockGuardian(code: string): boolean;
};

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Falta el elemento ${selector}.`);
  return element;
}

export class AppShell {
  readonly stage: HTMLElement;
  readonly video: HTMLVideoElement;
  readonly handDemoVideo: HTMLVideoElement;
  readonly handDemoCanvas: HTMLCanvasElement;
  private readonly root: HTMLElement;
  private readonly home: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly handDemo: HTMLElement;
  private readonly handDemoStage: HTMLElement;
  private readonly handDemoPlaceholder: HTMLElement;
  private readonly handDemoStart: HTMLButtonElement;
  private readonly handDemoStop: HTMLButtonElement;
  private readonly handDemoStatus: HTMLElement;
  private readonly handDemoCount: HTMLElement;
  private readonly handDemoStats: HTMLElement;
  private readonly handDemoEnergyStatus: HTMLElement;
  private readonly handDemoEnergyFill: HTMLElement;
  private readonly handDemoEnergyProgress: HTMLElement;
  private readonly handDemoMagicStatus: HTMLElement;
  private readonly modeSelect: HTMLSelectElement;
  private readonly mouseOption: HTMLOptionElement;
  private readonly playButton: HTMLButtonElement;
  private readonly stopCameraButton: HTMLButtonElement;
  private readonly overlay: HTMLElement;
  private readonly overlayTitle: HTMLElement;
  private readonly overlayText: HTMLElement;
  private readonly nameEntry: HTMLFormElement;
  private readonly playerName: HTMLInputElement;
  private readonly help: HTMLElement;
  private readonly status: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly scoreText: HTMLElement;
  private readonly scoreLabel: HTMLElement;
  private readonly scoreUnit: HTMLElement;
  private readonly countdownStat: HTMLElement;
  private readonly extraStat: HTMLElement;
  private readonly timeText: HTMLElement;
  private readonly extraLabel: HTMLElement;
  private readonly extraValue: HTMLElement;
  private readonly title: HTMLElement;
  private readonly eyebrow: HTMLElement;
  private readonly gameNumber: HTMLElement;
  private readonly gameSymbol: HTMLElement;
  private readonly recordsText: HTMLElement;
  private readonly guardianGate: HTMLDialogElement;
  private readonly guardianCode: HTMLInputElement;
  private readonly guardianGateError: HTMLElement;
  private currentGame: GameDefinition = GAMES.fruit;

  constructor(root: HTMLElement, events: ShellEvents) {
    this.root = root;
    root.classList.add('home-screen');
    const cards = GAME_ORDER.map((id, index) => {
      const game = GAMES[id];
      return `<button class="game-card" type="button" data-game="${id}">
        <span class="card-head"><span class="card-number">${String(index + 1).padStart(2, '0')} / ${String(GAME_ORDER.length).padStart(2, '0')}</span><span class="card-kind">${game.menuTag}</span></span>
        <span class="card-preview" aria-hidden="true"><span class="preview-grid"></span><span class="preview-object preview-one"></span><span class="preview-object preview-two"></span><span class="preview-object preview-three"></span><span class="preview-symbol">${game.symbol}</span></span>
        <span class="card-copy"><strong>${game.title}</strong><span>${game.summary}</span></span>
        <span class="card-action"><span>${game.callToAction}</span><span class="card-action-arrow" aria-hidden="true">↗</span></span>
      </button>`;
    }).join('');
    root.innerHTML = `
      <section id="home" class="home" aria-labelledby="home-title">
        <div class="home-topbar"><span class="home-university"><img src="/puce-manabi.png" alt="PUCE Manabí"></span><span class="home-topline">OPEN HOUSE // ARCADE INTERACTIVO</span><span class="home-ready"><span aria-hidden="true"></span> LISTO PARA JUGAR</span></div>
        <div class="home-hero">
          <div class="hero-copy">
            <p class="hero-kicker"><span>01</span> EL MOVIMIENTO EMPIEZA AQUÍ</p>
            <h1 id="home-title"><span>PULSO</span><span>PIXEL<span class="hero-dot">.</span></span></h1>
            <p class="home-intro">Tres retos para jugar con cámara o teclado. Elige tu desafío.</p>
            <div class="hero-facts"><span><b>03</b> EXPERIENCIAS</span><span>CÁMARA LOCAL</span><span>TECLADO DISPONIBLE</span></div>
            <button id="open-hand-demo" class="hand-demo-link" type="button"><span>✦ MIRA CÓMO FUNCIONA LA IA</span><span>Ver los puntos de tus manos ↗</span></button>
          </div>
          <div class="hero-display" aria-hidden="true">
            <div class="display-top"><span>PP // SEÑAL ACTIVA</span><span>● ● ●</span></div>
            <div class="display-reticle"><span class="reticle-ring ring-outer"></span><span class="reticle-ring ring-inner"></span><span class="reticle-core">✦</span><span class="reticle-cursor"></span></div>
            <div class="display-bottom"><span>ENTRADA / MOVIMIENTO</span><span>READY_</span></div>
          </div>
        </div>
        <div class="home-section-head"><div><p class="section-index">SELECCIÓN // 01—03</p><h2>ELIGE TU JUEGO</h2></div><p>Tres mundos. Tus manos deciden.</p></div>
        <div class="game-cards">${cards}</div>
        <div class="home-footer"><span>✦ PULSO PIXEL · OPEN HOUSE</span><span>La cámara se activa solo cuando tú lo indicas.</span></div>
      </section>
      <section id="hand-demo" class="hand-demo" aria-labelledby="hand-demo-title" hidden>
        <div class="game-topbar">
          <button id="hand-demo-menu" class="menu-button" type="button">← Menú principal</button>
          <span class="game-brand">P / P <span>OPEN HOUSE // IA EN ACCIÓN</span></span>
          <span>EXPLORADOR DE MANOS</span>
        </div>
        <header class="hand-demo-header">
          <p class="eyebrow">PULSO PIXEL // DETECCIÓN EN VIVO</p>
          <h1 id="hand-demo-title">ASÍ VE LA IA TUS MANOS</h1>
          <p>Un modelo estima 21 puntos en cada mano. Mueve los dedos y observa cuáles usa Pulso Pixel para jugar.</p>
        </header>
        <div class="hand-demo-layout">
          <div class="hand-demo-board">
            <div class="board-topline"><span><i aria-hidden="true">✦</i> CÁMARA Y PUNTOS DETECTADOS</span><span>PP // EN VIVO</span></div>
            <div id="hand-demo-stage" class="hand-demo-stage">
              <video id="hand-demo-video" autoplay playsinline muted aria-label="Vista local de la cámara con puntos de las manos"></video>
              <canvas id="hand-demo-canvas" aria-hidden="true"></canvas>
              <div id="hand-demo-placeholder" class="hand-demo-placeholder"><span aria-hidden="true">✦</span><strong>Activa la cámara para comenzar</strong><p>Coloca una o dos manos frente a ella y mueve los dedos.</p></div>
            </div>
            <div class="status-row"><p id="hand-demo-status" role="status" aria-live="polite">Cámara apagada</p><p id="hand-demo-stats">Detección: —</p></div>
          </div>
          <aside class="hand-demo-sidebar" aria-label="Explicación de la detección">
            <div class="side-panel">
              <p class="side-kicker">01 / PRUEBA LA IA</p>
              <button id="hand-demo-start" type="button">Activar cámara</button>
              <button id="hand-demo-stop" type="button" hidden>Detener cámara</button>
              <p id="hand-demo-count" class="hand-demo-count">0 manos detectadas · 0 puntos</p>
            </div>
            <div class="side-panel hand-demo-explanation">
              <p class="side-kicker">02 / QUÉ ESTÁS VIENDO</p>
              <p><span class="hand-demo-dot"></span> Los puntos marcan posiciones estimadas de las articulaciones. Las líneas muestran cómo se conectan.</p>
              <p><span class="hand-demo-dot hand-demo-dot-highlight"></span> Los puntos dorados son las puntas del pulgar y del índice.</p>
              <p>El índice dirige los juegos; juntar pulgar e índice produce la pinza para saltar.</p>
            </div>
            <div class="side-panel hand-demo-energy">
              <p class="side-kicker">03 / PRUEBA UNA TÉCNICA</p>
              <strong>VÓRTICE PIXEL</strong>
              <p>Coloca una mano arriba y otra abajo, como sosteniendo una esfera. Extiende los dedos en sentidos opuestos y mantén la postura un momento.</p>
              <div class="energy-pose-guide" aria-hidden="true"><span>← DEDOS · MANO SUPERIOR</span><i>✦</i><span>MANO INFERIOR · DEDOS →</span></div>
              <div id="hand-demo-energy-progress" class="energy-progress" role="progressbar" aria-label="Carga del Vórtice Pixel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="hand-demo-energy-fill"></span></div>
              <p id="hand-demo-energy-status" class="energy-status" role="status" aria-live="polite">Coloca ambas manos en posición</p>
              <small>El modelo estima los puntos; el gesto y la animación se programan con esos datos.</small>
            </div>
            <div class="side-panel hand-demo-magic">
              <p class="side-kicker">04 / SEGUNDO GESTO</p>
              <strong>SELLO ARCANO</strong>
              <p>Levanta índice y meñique; dobla medio y anular, con el pulgar cerca de la palma. Hazlo con una mano para un sello o con ambas para dos.</p>
              <div class="magic-hand-guide" aria-hidden="true"><span>ÍNDICE <b>↑</b></span><span>MEDIO <b>↓</b></span><span>ANULAR <b>↓</b></span><span>MEÑIQUE <b>↑</b></span></div>
              <p id="hand-demo-magic-status" class="magic-status" role="status" aria-live="polite">Haz el gesto con una o dos manos</p>
            </div>
            <p class="privacy">La IA estima posiciones, no identifica personas. El video se procesa aquí; no se guarda ni se transmite.</p>
          </aside>
        </div>
      </section>
      <section id="game-panel" class="panel" aria-labelledby="title" hidden>
        <div class="game-topbar">
          <button id="menu-button" class="menu-button" type="button">← Menú principal</button>
          <span class="game-brand">P / P <span>OPEN HOUSE // ARCADE INTERACTIVO</span></span>
          <span id="game-number" class="game-number"></span>
        </div>
        <header class="game-header">
          <div class="game-titleblock"><p id="eyebrow" class="eyebrow"></p><h1 id="title"></h1></div>
          <div class="hud">
            <div class="hud-stat"><span id="score-label"></span><strong id="score"></strong><span id="score-unit" hidden></span></div>
            <div id="countdown-stat" class="hud-stat"><span>Tiempo</span><strong id="time"></strong><span>s</span></div>
            <div id="extra-stat" class="hud-stat"><span id="extra-label"></span><strong id="extra-value"></strong></div>
          </div>
        </header>
        <div class="game-layout">
          <div class="game-board">
            <div class="board-topline"><span><i id="game-symbol" aria-hidden="true"></i> CAMPO DE JUEGO</span><span>PP // EN VIVO</span></div>
            <div id="stage" class="stage">
              <video id="camera-video" autoplay playsinline muted aria-label="Vista local de la cámara"></video>
              <div class="play-guides" aria-hidden="true"><span class="guide-top">LÍMITE SUPERIOR</span><span class="guide-bottom">SALIDA DE FRUTAS</span></div>
              <div id="round-overlay" class="overlay">
                <div class="overlay-card">
                  <span class="overlay-kicker">PULSO PIXEL // ARCADE</span>
                  <h2 id="overlay-title"></h2><p id="overlay-text"></p>
                  <form id="name-entry" class="name-entry" hidden>
                    <label for="player-name">Nuevo récord · escribe tu nombre o apodo (máx. 10 caracteres)</label>
                    <div><input id="player-name" name="player-name" type="text" maxlength="10" autocomplete="off" autocapitalize="characters" required placeholder="TU NOMBRE"><button type="submit">Guardar nombre</button></div>
                  </form>
                </div>
              </div>
            </div>
            <div class="status-row"><p id="camera-status" role="status" aria-live="polite">Cámara apagada</p><p id="tracking-stats">Detección: —</p></div>
          </div>
          <aside class="game-sidebar" aria-label="Controles y récords">
            <div class="side-panel controls">
              <p class="side-kicker">01 / PREPARAR PARTIDA</p>
              <label for="control-mode">Control</label>
              <select id="control-mode"><option value="mouse">Mouse</option><option value="keyboard">Teclado</option><option value="camera">Cámara</option></select>
              <button id="play-button" type="button">Empezar partida</button>
              <button id="stop-camera" type="button" hidden>Detener cámara</button>
              <div class="how-to"><span>CÓMO JUGAR</span><p id="help" class="help"></p></div>
            </div>
            <div class="records-panel"><p class="side-kicker">02 / SALÓN DE RÉCORDS</p><div id="records" class="records" aria-live="polite"></div></div>
            <p class="privacy">La cámara se procesa aquí. No se guarda ni se transmite video.</p>
          </aside>
        </div>
      </section>
      <dialog id="guardian-gate" class="guardian-gate" aria-labelledby="guardian-gate-title" aria-describedby="guardian-gate-description">
        <div class="guardian-gate-top"><span>✧ EDICIÓN ESPECIAL</span><span>P / P · 04</span></div>
        <form id="guardian-gate-form">
          <h2 id="guardian-gate-title">GUARDIANA DEL ALBA</h2>
          <p id="guardian-gate-description">Introduce la clave para entrar al juego de Naomi.</p>
          <label for="guardian-code">Clave de acceso</label>
          <input id="guardian-code" type="password" autocomplete="off" spellcheck="false" required maxlength="32" aria-describedby="guardian-gate-error">
          <p id="guardian-gate-error" class="guardian-gate-error" role="alert" hidden>Clave incorrecta. Inténtalo de nuevo.</p>
          <div class="guardian-gate-actions"><button id="guardian-gate-cancel" type="button">Cancelar</button><button type="submit">Entrar →</button></div>
        </form>
      </dialog>
    `;

    this.stage = required(root, '#stage');
    this.video = required(root, '#camera-video');
    this.handDemoVideo = required(root, '#hand-demo-video');
    this.handDemoCanvas = required(root, '#hand-demo-canvas');
    this.home = required(root, '#home');
    this.panel = required(root, '#game-panel');
    this.handDemo = required(root, '#hand-demo');
    this.handDemoStage = required(root, '#hand-demo-stage');
    this.handDemoPlaceholder = required(root, '#hand-demo-placeholder');
    this.handDemoStart = required(root, '#hand-demo-start');
    this.handDemoStop = required(root, '#hand-demo-stop');
    this.handDemoStatus = required(root, '#hand-demo-status');
    this.handDemoCount = required(root, '#hand-demo-count');
    this.handDemoStats = required(root, '#hand-demo-stats');
    this.handDemoEnergyStatus = required(root, '#hand-demo-energy-status');
    this.handDemoEnergyFill = required(root, '#hand-demo-energy-fill');
    this.handDemoEnergyProgress = required(root, '#hand-demo-energy-progress');
    this.handDemoMagicStatus = required(root, '#hand-demo-magic-status');
    this.modeSelect = required(root, '#control-mode');
    this.mouseOption = required(this.modeSelect, 'option[value="mouse"]');
    this.playButton = required(root, '#play-button');
    this.stopCameraButton = required(root, '#stop-camera');
    this.overlay = required(root, '#round-overlay');
    this.overlayTitle = required(root, '#overlay-title');
    this.overlayText = required(root, '#overlay-text');
    this.nameEntry = required(root, '#name-entry');
    this.playerName = required(root, '#player-name');
    this.help = required(root, '#help');
    this.status = required(root, '#camera-status');
    this.stats = required(root, '#tracking-stats');
    this.scoreText = required(root, '#score');
    this.scoreLabel = required(root, '#score-label');
    this.scoreUnit = required(root, '#score-unit');
    this.countdownStat = required(root, '#countdown-stat');
    this.extraStat = required(root, '#extra-stat');
    this.timeText = required(root, '#time');
    this.extraLabel = required(root, '#extra-label');
    this.extraValue = required(root, '#extra-value');
    this.title = required(root, '#title');
    this.eyebrow = required(root, '#eyebrow');
    this.gameNumber = required(root, '#game-number');
    this.gameSymbol = required(root, '#game-symbol');
    this.recordsText = required(root, '#records');
    this.guardianGate = required(root, '#guardian-gate');
    this.guardianCode = required(root, '#guardian-code');
    this.guardianGateError = required(root, '#guardian-gate-error');

    for (const card of root.querySelectorAll<HTMLButtonElement>('.game-card')) {
      card.addEventListener('click', () => events.chooseGame(card.dataset.game as GameId));
    }
    required<HTMLButtonElement>(root, '#open-hand-demo').addEventListener('click', events.openHandDemo);
    required<HTMLButtonElement>(root, '#hand-demo-menu').addEventListener('click', events.returnHome);
    this.handDemoStart.addEventListener('click', events.startHandDemo);
    this.handDemoStop.addEventListener('click', events.stopHandDemo);
    required<HTMLButtonElement>(root, '#menu-button').addEventListener('click', events.returnHome);
    this.playButton.addEventListener('click', events.play);
    this.stopCameraButton.addEventListener('click', events.stopCamera);
    this.modeSelect.addEventListener('change', () => this.updateHelp());
    this.playerName.addEventListener('input', () => this.playerName.setCustomValidity(''));
    this.nameEntry.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = normalizePlayerName(this.playerName.value);
      if (!name) {
        this.playerName.setCustomValidity('Escribe al menos una letra o número.');
        this.playerName.reportValidity();
        return;
      }
      events.saveName(name);
    });
    required<HTMLButtonElement>(root, '#guardian-gate-cancel').addEventListener('click', () => this.guardianGate.close());
    this.guardianGate.addEventListener('close', () => {
      this.guardianCode.value = '';
      this.guardianGateError.hidden = true;
    });
    this.guardianCode.addEventListener('input', () => { this.guardianGateError.hidden = true; });
    required<HTMLFormElement>(root, '#guardian-gate-form').addEventListener('submit', (event) => {
      event.preventDefault();
      if (!events.unlockGuardian(this.guardianCode.value)) {
        this.guardianGateError.hidden = false;
        this.guardianCode.select();
        return;
      }
      this.guardianGate.close();
      events.chooseGame('guardian');
    });
  }

  get controlMode(): ControlMode { return this.modeSelect.value as ControlMode; }
  get isGameVisible(): boolean { return !this.panel.hidden; }
  get isHandDemoVisible(): boolean { return !this.handDemo.hidden; }

  showGuardianGate(): void {
    this.guardianCode.value = '';
    this.guardianGateError.hidden = true;
    if (!this.guardianGate.open) this.guardianGate.showModal();
    this.guardianCode.focus();
  }

  showHandDemo(): void {
    delete this.root.dataset.game;
    this.root.classList.remove('home-screen');
    this.root.classList.add('hand-demo-screen');
    this.home.hidden = true;
    this.panel.hidden = true;
    this.handDemo.hidden = false;
    this.handDemoStage.style.aspectRatio = '4 / 3';
    this.setHandDemoActive(false);
    this.setHandDemoStatus('Cámara apagada');
    this.setHandDemoHands(0);
    this.setHandDemoMagic(0, 0);
    this.handDemoStats.textContent = 'Detección: —';
  }

  setHandDemoLaunching(launching: boolean): void {
    this.handDemoStart.disabled = launching;
    if (launching) this.handDemoStop.hidden = false;
    else if (!this.handDemoStage.classList.contains('active')) this.handDemoStop.hidden = true;
  }

  setHandDemoActive(active: boolean): void {
    this.handDemoStage.classList.toggle('active', active);
    this.handDemoPlaceholder.hidden = active;
    this.handDemoStart.hidden = active;
    this.handDemoStop.hidden = !active;
  }

  setHandDemoVideoSize(width: number, height: number): void {
    this.handDemoStage.style.aspectRatio = `${width} / ${height}`;
    this.handDemoCanvas.width = width;
    this.handDemoCanvas.height = height;
  }

  setHandDemoStatus(message: string): void {
    if (this.handDemoStatus.textContent !== message) this.handDemoStatus.textContent = message;
  }

  setHandDemoHands(count: number): void {
    const message = `${count} ${count === 1 ? 'mano detectada' : 'manos detectadas'} · ${count * 21} puntos`;
    if (this.handDemoCount.textContent !== message) this.handDemoCount.textContent = message;
  }

  setHandDemoStats(fps: number, duration: number): void {
    this.handDemoStats.textContent = `Detección: ${fps} fps · ${duration.toFixed(0)} ms por imagen`;
  }

  clearHandDemoStats(): void { this.handDemoStats.textContent = 'Detección: —'; }

  setHandDemoEnergy(state: 'idle' | 'charging' | 'active', percent: number): void {
    const message = state === 'active' ? '¡Vórtice activo!' : state === 'charging' ? 'Cargando energía…' : 'Coloca ambas manos en posición';
    if (this.handDemoEnergyStatus.textContent !== message) this.handDemoEnergyStatus.textContent = message;
    this.handDemoEnergyFill.style.width = `${percent}%`;
    this.handDemoEnergyProgress.setAttribute('aria-valuenow', String(percent));
    this.handDemoEnergyProgress.classList.toggle('charged', state === 'active');
  }

  setHandDemoMagic(active: number, charging: number): void {
    const message = active === 2 ? '2 sellos activos' : active === 1
      ? charging ? '1 sello activo · otro cargando' : '1 sello activo'
      : charging === 2 ? 'Cargando 2 sellos…' : charging === 1 ? 'Cargando 1 sello…' : 'Haz el gesto con una o dos manos';
    if (this.handDemoMagicStatus.textContent !== message) this.handDemoMagicStatus.textContent = message;
  }

  selectGame(id: GameId, records: Records): void {
    const game: GameDefinition = GAMES[id];
    this.currentGame = game;
    this.root.dataset.game = id;
    this.root.classList.remove('home-screen');
    this.root.classList.remove('hand-demo-screen');
    this.panel.dataset.game = id;
    this.mouseOption.hidden = !game.controls.mouse;
    this.mouseOption.disabled = !game.controls.mouse;
    if (!game.controls[this.controlMode]) this.modeSelect.value = 'keyboard';
    this.title.textContent = game.title;
    const number = GAME_ORDER.indexOf(id);
    this.eyebrow.textContent = number < 0 ? game.menuTag : `${String(number + 1).padStart(2, '0')} / ${game.menuTag}`;
    this.gameNumber.textContent = number < 0
      ? 'EDICIÓN ESPECIAL'
      : `JUEGO ${String(number + 1).padStart(2, '0')} / ${String(GAME_ORDER.length).padStart(2, '0')}`;
    this.gameSymbol.textContent = game.symbol;
    this.scoreLabel.textContent = game.hud.label;
    this.scoreUnit.textContent = game.hud.unit;
    this.scoreUnit.hidden = !game.hud.unit;
    this.countdownStat.hidden = game.hud.countdown === undefined;
    this.extraStat.hidden = game.hud.extra === undefined;
    this.extraLabel.textContent = game.hud.extraLabel ?? '';
    this.updateHud(game.hud.initial, game.hud.countdown, game.hud.extra);
    this.updateHelp();
    this.overlayTitle.textContent = game.intro.title;
    this.overlayText.textContent = game.intro.text;
    this.overlay.hidden = false;
    this.nameEntry.hidden = true;
    this.playButton.textContent = 'Empezar partida';
    this.playButton.disabled = false;
    this.modeSelect.disabled = false;
    this.renderRecords(records);
    this.home.hidden = true;
    this.handDemo.hidden = true;
    this.panel.hidden = false;
  }

  showHome(): void {
    delete this.root.dataset.game;
    this.root.classList.add('home-screen');
    this.root.classList.remove('hand-demo-screen');
    this.stage.classList.remove('playing');
    this.nameEntry.hidden = true;
    this.modeSelect.disabled = false;
    this.panel.hidden = true;
    this.handDemo.hidden = true;
    this.home.hidden = false;
  }

  updateHud(value: number, countdown?: number, extra?: number): void {
    this.scoreText.textContent = this.currentGame.formatScore(value);
    if (countdown !== undefined) this.timeText.textContent = String(countdown);
    if (extra !== undefined) this.extraValue.textContent = String(extra);
  }

  renderRecords(records: Records): void {
    const played = document.createElement('p');
    played.className = 'records-played';
    played.textContent = `Partidas jugadas  ${records.played}`;
    const title = document.createElement('h2');
    title.textContent = this.currentGame.recordsTitle;
    const list = document.createElement('ol');
    list.className = 'record-list';
    if (records.best.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'record-empty';
      empty.textContent = 'Todavía no hay marcas';
      list.append(empty);
    } else {
      records.best.forEach((entry, index) => {
        const row = document.createElement('li');
        const rank = document.createElement('span');
        rank.className = 'record-rank';
        rank.textContent = String(index + 1).padStart(2, '0');
        const name = document.createElement('span');
        name.className = 'record-name';
        name.textContent = entry.name;
        const value = document.createElement('strong');
        value.textContent = this.currentGame.formatRecord(entry.value);
        row.append(rank, name, value);
        list.append(row);
      });
    }
    this.recordsText.replaceChildren(played, title, list);
  }

  showResult(value: number, won: boolean, rank: number | null, saved: boolean): void {
    this.stage.classList.remove('playing');
    this.overlayTitle.textContent = this.currentGame.endTitle(won);
    this.overlayText.textContent = `${this.currentGame.endText(value)} ${saved ? '' : 'No se pudo guardar el récord en este navegador. '}${rank === null ? '¿Otra ronda?' : this.currentGame.rankText}`;
    this.overlay.hidden = false;
    this.nameEntry.hidden = rank === null;
    this.modeSelect.disabled = false;
    this.playButton.disabled = rank !== null;
    this.playButton.textContent = 'Jugar otra vez';
    if (rank !== null) {
      this.playerName.value = '';
      this.playerName.focus();
    }
  }

  showSavedName(value: number, saved: boolean): void {
    this.overlayText.textContent = `${this.currentGame.savedText(value)} ${saved ? '' : 'No se pudo guardar el nombre en este navegador. '}¿Otra ronda?`;
    this.nameEntry.hidden = true;
    this.playButton.disabled = false;
    this.playButton.focus();
  }

  setLaunching(launching: boolean): void { this.playButton.disabled = launching; }

  showPlaying(): void {
    this.stage.classList.add('playing');
    this.overlay.hidden = true;
    this.modeSelect.disabled = true;
    this.playButton.textContent = 'Jugando…';
  }

  setCameraActive(active: boolean): void {
    this.stage.classList.toggle('camera-active', active);
    this.stopCameraButton.hidden = !active;
  }

  setCameraStatus(message: string): void {
    if (this.status.textContent !== message) this.status.textContent = message;
  }

  setTrackingStats(fps: number, duration: number): void {
    this.stats.textContent = `Detección: ${fps} fps · ${duration.toFixed(0)} ms por imagen`;
  }

  clearTrackingStats(): void { this.stats.textContent = 'Detección: —'; }
  setStageHeight(width: number, height: number): void { this.stage.style.aspectRatio = `${width} / ${height}`; }

  switchToKeyboard(): void {
    this.modeSelect.value = 'keyboard';
    this.updateHelp();
  }

  private updateHelp(): void {
    this.help.textContent = this.currentGame.controls[this.controlMode] ?? '';
  }
}
