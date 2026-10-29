# Alcance y fases — juegos con control por cámara

Este documento limita la primera entrega al open house. Se lee junto con `brief-juegos-open-house.md`, que contiene la idea, el hardware y la descripción de los juegos acordados.

El juego de Naomi queda reservado para un proyecto 2D independiente y no forma parte de las fases ni de la aplicación del Open House.

## Meta de la primera entrega

Preparar una demo local para una MacBook Air M4, jugable en un navegador y lista para mostrar en una pantalla. Incluye tres minijuegos originales con controles por cámara y controles alternativos.

La meta es una demo pequeña, clara y entretenida que podamos explicar y mantener. No es un producto comercial ni una colección completa de juegos.

## Alcance incluido

### Aplicación

- Una aplicación web, en TypeScript y Phaser, con MediaPipe Tasks Vision para seguir las manos.
- Una pantalla inicial sencilla con título, selección de juego, instrucciones y elección de teclado/cámara.
- Tres partidas con puntaje o tiempo, fin de partida y opción de repetir. Fruta dura unos 45 segundos; Plataformas y Nave tienen intentos cortos que terminan al chocar o caer.
- Diseño prioritario para laptop y pantalla grande en orientación horizontal. No requiere diseño para celular.
- Carga local del código, los modelos y los recursos necesarios para que la demo no dependa de internet una vez preparada.
- La cámara se activa solo al elegir el modo cámara. El video se procesa localmente; no se graba ni se envía a ningún servidor.

### Juegos

1. **Nave:** movimiento en cuatro direcciones para esquivar meteoritos, hasta el primer choque; el tiempo sobrevivido es la puntuación. Los meteoritos aumentan en velocidad y frecuencia.
2. **Plataformas:** avance automático por un recorrido lineal corto; una pinza o tecla activa el salto. El primer choque o caída termina el intento y se registra el porcentaje recorrido. Personaje y escenario originales. Sin objetos recolectables, jefes ni mundos adicionales.
3. **Rebanar fruta:** ronda de tiempo limitado; la trayectoria del dedo corta frutas, suma puntos y puede crear combos. Se puede añadir una bomba como peligro. Sin niveles, tienda, desbloqueos ni campaña.

### Controles

- Teclado: flechas o WASD para mover Nave; Espacio, W o flecha arriba para saltar en Plataformas. Instrucciones visibles para empezar y repetir. No añadir menús de pausa si no hacen falta para la demo.
- Cámara: Nave sigue el índice en horizontal y vertical; Plataformas salta al juntar pulgar e índice y repite el salto al aterrizar mientras se mantenga la pinza; Rebanar fruta usa la trayectoria de uno o dos índices.
- Mouse: arrastrar para rebanar fruta.
- Detectar hasta dos manos con el mismo modelo local. La lógica de cada juego decide si necesita una o ambas.
- Mantener los controles alternativos aunque el modo cámara funcione.

### Arte y sonido

- Una paleta coherente para toda la aplicación, con personajes, obstáculos, frutas y elementos de interfaz originales.
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

**Ajuste acordado después de probar la fase 2:** en rebanar fruta, una ronda pasa automáticamente del nivel de dificultad 1 al 2 a los 20 segundos. Se guardan localmente el número de partidas y las tres mejores puntuaciones, sin cuentas ni datos personales. Esto no añade niveles o progresión fuera de la ronda.

### Fase 3 — Completar los otros dos minijuegos

- Añadir nave y plataformas reutilizando pantalla, puntaje, pausa/fin y controles existentes.
- Mantener una sola mecánica central por juego y partidas cortas.
- No añadir modos nuevos ni funciones ajenas al brief.
- **Ajuste acordado después de probar Nave:** sustituir la energía y los puntos por supervivencia. Guardar localmente los tres mejores tiempos con nombre o apodo corto; los puntos de la versión anterior no se mezclan con estos tiempos. Mostrar también nombre o apodo en los tres mejores puntajes de Fruta y Plataformas; los puntajes anteriores sin nombre se conservan como ANÓNIMO.
- **Ajuste acordado después de probar Plataformas:** convertirlo en un juego original de avance automático y salto único por pinza. Choque o caída termina el intento; la nueva tabla guarda porcentaje recorrido por separado de los puntajes del prototipo anterior, que permanecen en el navegador.

**Salida:** los tres juegos se pueden jugar, terminar y volver a iniciar con teclado; cada uno ofrece control de cámara.

### Fase 4 — Pulido para el open house

- Añadir la pantalla explicativa acordada para visualizar los 21 puntos de una o dos manos con el detector existente, con activación y apagado explícitos de la cámara.
- Mostrar en esa pantalla una técnica visual original activada solo por la postura acordada de dos manos, con la esfera centrada entre ambas, como demostración de detección de gestos.
- Añadir el segundo gesto acordado, con un sello mágico independiente sobre cada mano que lo realice, sin cambiar los controles de los juegos.
- Añadir el tercer gesto acordado en la pantalla de manos: un corazón con pulgar e índice y los demás dedos doblados activa una lluvia de corazones rosas, que termina suavemente al soltarlo.
- Añadir el cuarto gesto acordado en la pantalla de manos: dos palmas abiertas y elevadas se juntan y luego se separan para desplegar un arcoíris animado original entre ellas, también en Modo pose.
- Reemplazar figuras provisionales por un conjunto pequeño de sprites pixel art coherentes.
- Añadir efectos visuales y sonidos breves, instrucciones visibles y presentación a pantalla completa.
- Ajustar rangos de movimiento, calibración, dificultad y duración a partir de partidas de prueba. En Nave, permitir también el movimiento vertical con la mano y con flechas o WASD, manteniendo la supervivencia hasta el primer choque.
- **Ajuste de Plataformas tras probarlo:** mantener la pinza o la tecla de salto provoca otro salto al aterrizar; soltarla detiene la repetición. Una pulsación corta conserva el salto único y su pequeño margen de entrada.
- **Ajuste visual de Fruta:** cada índice muestra una estela luminosa con color distinto, también en movimientos lentos; solo un movimiento rápido corta las frutas.
- **Ajuste de dificultad de Fruta:** añadir una fruta dorada de 30 puntos y otra morada que resta 20, sin permitir un marcador negativo. Aparecen ocasionalmente y separadas por al menos dos frutas comunes. Lanzar las frutas un poco más seguido, con mayor velocidad y altura.
- Probar con varias personas que no conocen el proyecto: observar si entienden cómo empezar y si quieren volver a jugar.
- Verificar la demo en la laptop, el navegador y la pantalla que se usarán en el evento; verificar modo sin internet.
- **Ajuste acordado:** ofrecer Modo pose en la pantalla de gestos, con cámara y animaciones a pantalla completa para que estudiantes fotografíen la pantalla con sus propios teléfonos. La aplicación no toma ni guarda fotos.
- **Ajuste acordado:** dar a Plataformas un recorrido más variado y una pieza instrumental original de techno rock. Los acentos musicales y las marcas visibles guían los saltos; se conserva la alternativa sin sonido.
- **Ajuste acordado:** dejar la experiencia adicional como **Mapa corporal**. Seguir hasta tres cuerpos con un modelo local y dibujar los 33 puntos estimados y sus conexiones sobre cada persona; añadir encima los 21 puntos detallados de cada mano detectada, hasta seis manos. Permitir ampliar solo la superficie de cámara y puntos; no capturar, guardar ni transmitir fotos o video. Los filtros creativos se retiran por ahora y se decidirán después.

**Salida:** los tres juegos se entienden sin explicación larga, no hay fallos que impidan jugar y una partida puede repetirse con rapidez.

### Fase 5 — Después del evento

Investigar por separado una extensión de navegador que traduzca gestos en teclado para juegos compatibles. Primero probar con un juego concreto y sus permisos; no asumir compatibilidad universal.


## Orden de prioridades si el tiempo se reduce

1. La cámara detecta y sigue la mano con suficiente estabilidad.
2. Los tres juegos son jugables con teclado y tienen inicio, puntaje y fin.
3. El modo cámara funciona en los tres.
4. Instrucciones claras, buen ritmo y alternativa de teclado.
5. Pixel art coherente y algunos efectos/sonidos.
6. Récord local y otros extras, solo si todo lo anterior ya está listo.

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
