# Alcance y fases — juegos con control por cámara

Este documento limita la primera entrega al open house. Se lee junto con `brief-juegos-open-house.md`, que contiene la idea, el hardware y la descripción de los tres juegos.

## Meta de la primera entrega

Preparar en aproximadamente dos semanas una demo local para una MacBook Air M4, jugable en un navegador y lista para mostrar en una pantalla. Debe incluir tres minijuegos originales en pixel art, controles por cámara y controles alternativos.

La meta es una demo pequeña, clara y entretenida que podamos explicar y mantener. No es un producto comercial ni una colección completa de juegos.

## Alcance incluido

### Aplicación

- Una aplicación web, en TypeScript y Phaser, con MediaPipe Tasks Vision para seguir las manos.
- Una pantalla inicial sencilla con título, selección de juego, instrucciones y elección de teclado/cámara.
- Tres partidas cortas, de unos 45–60 segundos, con puntaje, fin de partida y opción de repetir.
- Diseño prioritario para laptop y pantalla grande en orientación horizontal. No requiere diseño para celular.
- Carga local del código, los modelos y los recursos necesarios para que la demo no dependa de internet una vez preparada.
- La cámara se activa solo al elegir el modo cámara. El video se procesa localmente; no se graba ni se envía a ningún servidor.

### Juegos

1. **Nave:** movimiento lateral, meteoritos y energía recolectable; dificultad progresiva sencilla.
2. **Plataformas:** un recorrido lineal corto con saltos, huecos y obstáculos. Inspiración de plataformas clásicas; personaje y escenario originales. Sin objetos recolectables, jefes ni mundos adicionales.
3. **Rebanar fruta:** ronda de tiempo limitado; la trayectoria del dedo corta frutas, suma puntos y puede crear combos. Se puede añadir una bomba como peligro. Sin niveles, tienda, desbloqueos ni campaña.

### Controles

- Teclado: flechas o A/D para movimiento; espacio para saltar; instrucciones visibles para empezar y repetir. No añadir menús de pausa si no hacen falta para la demo.
- Cámara: seguir inicialmente una mano. Nave y plataformas usan movimiento horizontal; el plataformas usa un gesto sencillo de salto; rebanar fruta usa la trayectoria del dedo.
- Mouse: arrastrar para rebanar fruta.
- Preparar el programa para detectar dos manos, pero entregar primero una experiencia completa con una mano. El uso de dos manos queda como mejora opcional si funciona estable y no retrasa el alcance obligatorio.
- Mantener los controles alternativos aunque el modo cámara funcione.

### Arte y sonido

- Una paleta pixel art coherente para toda la aplicación, con personajes, obstáculos, frutas y elementos de interfaz originales.
- Usar colores o logotipo de la universidad si el usuario proporciona recursos oficiales. Si no, usar una paleta provisional original.
- Efectos breves para acciones importantes (salto, corte, golpe, fin de ronda). Música continua, animaciones extensas y escenas cinemáticas no son necesarias.

## Fuera del alcance de esta entrega

Codex debe tratar estos puntos como trabajo posterior y no implementarlos sin una nueva indicación:

- Extensión para controlar juegos de otras páginas o juegos en pestañas externas.
- Emuladores o copias de Super Mario Bros., Fruit Ninja o los recursos de otros juegos comerciales.
- Entrenar un modelo de inteligencia artificial propio; usar un modelo preentrenado de seguimiento de manos.
- Multijugador, cuentas, tablas de posiciones en internet, servidor, base de datos o analítica.
- Adaptación a móviles, publicación en una tienda, descarga pública o empaquetado como aplicación nativa.
- Muchas fases, modos, armas, power-ups, personajes seleccionables, tienda, historia o progresión permanente.
- Crear arte y sonido extensos antes de validar que los controles y la mecánica funcionan.
- Instalar bibliotecas o skills adicionales sin explicar primero para qué se necesitan y comprobar que corresponden a la tecnología elegida.

## Plan por fases

Trabajar fase por fase. Completar el criterio de salida antes de empezar la siguiente. No adelantar elementos de fases posteriores para ampliar la demo.

### Fase 0 — Preparar el proyecto y cerrar decisiones mínimas

- Crear el proyecto web con Phaser y TypeScript.
- Previsualizar e instalar solo estas skills en el proyecto: `phaser-core`, `phaser-arcade-physics`, `platformer`, `input-systems`, `game-feel`, `create-game-assets` y `prototype-fast`. No instalar el catálogo completo.
- Elegir un navegador de demostración, confirmar acceso a la cámara y preparar un servidor local de desarrollo.
- Definir nombre provisional y una paleta pixel art pequeña. Integrar identidad universitaria solo si hay lineamientos o recursos disponibles.

**Salida:** la aplicación vacía abre en el navegador elegido y se puede iniciar desde el entorno local.

### Fase 1 — Riesgo técnico de cámara y controles

- Mostrar el video de cámara con consentimiento explícito.
- Detectar una mano y dibujar en pantalla el punto seguido y su trayectoria.
- Invertir/reflejar coordenadas para que el movimiento resulte natural.
- Probar encendido, apagado y ausencia de mano; añadir el control de teclado como referencia.
- Medir si el seguimiento se siente suficientemente fluido con la laptop y la iluminación disponibles.

**Salida:** el movimiento de la mano se ve estable en pantalla y el video nunca se guarda ni se transmite. No añadir los tres juegos hasta llegar a esta salida.

### Fase 2 — Una partida completa (prototipo vertical)

- Construir primero el juego de rebanar fruta: empezar, jugar, puntaje, terminar y repetir.
- Hacerlo jugable con mouse/teclado y conectar después el corte por trayectoria de la mano.
- Usar figuras provisionales antes de invertir tiempo en arte final.

**Salida:** una persona puede empezar y terminar una partida; los cortes se reconocen de forma comprensible y repetible.

### Fase 3 — Completar los otros dos minijuegos

- Añadir nave y plataformas reutilizando pantalla, puntaje, pausa/fin y controles existentes.
- Mantener una sola mecánica central por juego y partidas cortas.
- No añadir modos nuevos ni funciones ajenas al brief.

**Salida:** los tres juegos se pueden jugar, terminar y volver a iniciar con teclado; cada uno ofrece control de cámara.

### Fase 4 — Pulido para el open house

- Reemplazar figuras provisionales por un conjunto pequeño de sprites pixel art coherentes.
- Añadir efectos visuales y sonidos breves, instrucciones visibles y presentación a pantalla completa.
- Ajustar rangos de movimiento, calibración, dificultad y duración a partir de partidas de prueba.
- Probar con varias personas que no conocen el proyecto: observar si entienden cómo empezar y si quieren volver a jugar.
- Verificar la demo en la laptop, el navegador y la pantalla que se usarán en el evento; verificar modo sin internet.

**Salida:** se entiende sin explicación larga, no hay fallos que impidan jugar y una partida puede repetirse con rapidez.

### Fase 5 — Después del evento

Investigar por separado una extensión de navegador que traduzca gestos en teclado para juegos compatibles. Primero probar con un juego concreto y sus permisos; no asumir compatibilidad universal.

## Orden de prioridades si el tiempo se reduce

1. La cámara detecta y sigue la mano con suficiente estabilidad.
2. Los tres juegos son jugables con teclado y tienen inicio, puntaje y fin.
3. El modo cámara funciona en los tres.
4. Instrucciones claras, buen ritmo y alternativa de teclado.
5. Pixel art coherente y algunos efectos/sonidos.
6. Dos manos, récord local y otros extras, solo si todo lo anterior ya está listo.

Si un hito se retrasa, reducir detalle de arte, sonido o extras. No sumar características nuevas para compensar.

## Reglas de trabajo para Codex

- Mantenerse dentro de la fase activa. Antes de abrir la siguiente, resumir el criterio de salida alcanzado.
- Implementar la tarea solicitada en el menor cambio coherente; no agregar funciones sugeridas como extras sin pedirlas.
- Explicar brevemente el concepto de programación que se está usando y el propósito de cada cambio para apoyar el aprendizaje.
- Preferir pequeños incrementos jugables. Mostrar primero mecánicas simples y luego agregar presentación.
- Mantener separadas las fuentes de entrada (teclado, cámara y mouse) de las reglas de juego para poder reutilizarlas.
- No introducir servidor, almacenamiento de video, servicios externos, telemetría o dependencias innecesarias.
- Si una decisión pendiente afecta varias fases, proponer un valor predeterminado y dejarlo registrado antes de extender el alcance.

## Criterios de entrega

- La aplicación abre localmente en el navegador acordado y muestra el menú.
- Los tres minijuegos empiezan, terminan, calculan un puntaje y permiten repetir.
- Teclado disponible en los tres; cámara disponible en los tres; mouse disponible para rebanar fruta.
- Una mano basta para jugar; la segunda mano no es requisito de salida.
- Los recursos necesarios están disponibles localmente para la demo.
- La cámara se enciende con permiso, tiene un estado visible y se detiene al salir del modo cámara.
- Una breve sesión de juego con varias personas confirma que entienden los controles y encuentran al menos un momento divertido en cada juego.
