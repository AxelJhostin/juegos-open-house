import { GAME_ORDER, GAMES, type GameDefinition, type GameId } from './game-catalog';
import type { ControlMode } from './game-types';
import { normalizePlayerName, type Records } from './records';

type ShellEvents = {
  chooseGame(id: GameId): void;
  returnHome(): void;
  play(): void;
  stopCamera(): void;
  saveName(name: string): void;
};

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Falta el elemento ${selector}.`);
  return element;
}

export class AppShell {
  readonly stage: HTMLElement;
  readonly video: HTMLVideoElement;
  private readonly home: HTMLElement;
  private readonly panel: HTMLElement;
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
  private readonly recordsText: HTMLElement;
  private currentGame: GameDefinition = GAMES.fruit;

  constructor(root: HTMLElement, events: ShellEvents) {
    const cards = GAME_ORDER.map((id) => {
      const game = GAMES[id];
      return `<button class="game-card" type="button" data-game="${id}"><span class="card-symbol">${game.symbol}</span><strong>${game.title}</strong><span>${game.summary}</span><em>${game.callToAction}</em></button>`;
    }).join('');
    root.innerHTML = `
      <section id="home" class="home" aria-labelledby="home-title">
        <p class="eyebrow">Open House · ${GAME_ORDER.length} minijuegos</p>
        <h1 id="home-title">Pulso Pixel</h1>
        <p class="home-intro">Elige un juego y juega con cámara o teclado.</p>
        <div class="game-cards">${cards}</div>
      </section>
      <section id="game-panel" class="panel" aria-labelledby="title" hidden>
        <header class="header">
          <div><p id="eyebrow" class="eyebrow"></p><h1 id="title"></h1></div>
          <div class="hud"><span><span id="score-label"></span> <strong id="score"></strong><span id="score-unit" hidden></span></span><span id="countdown-stat">Tiempo <strong id="time"></strong>s</span><span id="extra-stat"><span id="extra-label"></span> <strong id="extra-value"></strong></span></div>
        </header>
        <div class="controls">
          <button id="menu-button" type="button">← Menú principal</button>
          <label for="control-mode">Control</label>
          <select id="control-mode"><option value="mouse">Mouse</option><option value="keyboard">Teclado</option><option value="camera">Cámara</option></select>
          <button id="play-button" type="button">Empezar partida</button>
          <button id="stop-camera" type="button" hidden>Detener cámara</button>
        </div>
        <p id="help" class="help"></p>
        <div id="stage" class="stage">
          <video id="camera-video" autoplay playsinline muted aria-label="Vista local de la cámara"></video>
          <div class="play-guides" aria-hidden="true"><span class="guide-top">LÍMITE SUPERIOR</span><span class="guide-bottom">SALIDA DE FRUTAS</span></div>
          <div id="round-overlay" class="overlay">
            <h2 id="overlay-title"></h2><p id="overlay-text"></p>
            <form id="name-entry" class="name-entry" hidden>
              <label for="player-name">Nuevo récord · escribe tu nombre o apodo (máx. 10 caracteres)</label>
              <div><input id="player-name" name="player-name" type="text" maxlength="10" autocomplete="off" autocapitalize="characters" required placeholder="TU NOMBRE"><button type="submit">Guardar nombre</button></div>
            </form>
          </div>
        </div>
        <div class="status-row"><p id="camera-status" role="status" aria-live="polite">Cámara apagada</p><p id="tracking-stats">Detección: —</p></div>
        <div id="records" class="records" aria-live="polite"></div>
        <p class="privacy">La cámara solo se activa al elegirla. El video se procesa aquí; no se guarda ni se transmite.</p>
      </section>
    `;

    this.stage = required(root, '#stage');
    this.video = required(root, '#camera-video');
    this.home = required(root, '#home');
    this.panel = required(root, '#game-panel');
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
    this.recordsText = required(root, '#records');

    for (const card of root.querySelectorAll<HTMLButtonElement>('.game-card')) {
      card.addEventListener('click', () => events.chooseGame(card.dataset.game as GameId));
    }
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
  }

  get controlMode(): ControlMode { return this.modeSelect.value as ControlMode; }
  get isGameVisible(): boolean { return !this.panel.hidden; }

  selectGame(id: GameId, records: Records): void {
    const game: GameDefinition = GAMES[id];
    this.currentGame = game;
    this.panel.dataset.game = id;
    this.mouseOption.hidden = !game.controls.mouse;
    this.mouseOption.disabled = !game.controls.mouse;
    if (!game.controls[this.controlMode]) this.modeSelect.value = 'keyboard';
    this.title.textContent = game.title;
    this.eyebrow.textContent = `Pulso Pixel · Juego ${GAME_ORDER.indexOf(id) + 1} de ${GAME_ORDER.length}`;
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
    this.panel.hidden = false;
  }

  showHome(): void {
    this.stage.classList.remove('playing');
    this.nameEntry.hidden = true;
    this.modeSelect.disabled = false;
    this.panel.hidden = true;
    this.home.hidden = false;
  }

  updateHud(value: number, countdown?: number, extra?: number): void {
    this.scoreText.textContent = this.currentGame.formatScore(value);
    if (countdown !== undefined) this.timeText.textContent = String(countdown);
    if (extra !== undefined) this.extraValue.textContent = String(extra);
  }

  renderRecords(records: Records): void {
    const board = records.best.length
      ? records.best.map((entry, index) => `${index + 1}. ${entry.name.padEnd(10, ' ')}  ${this.currentGame.formatRecord(entry.value)}`).join('\n')
      : '—';
    this.recordsText.textContent = `Partidas jugadas: ${records.played} · ${this.currentGame.recordsTitle}\n${board}`;
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
