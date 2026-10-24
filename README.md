# Juegos con control por cámara — Open House

Proyecto de una colección pequeña de juegos web originales controlados con movimientos de la mano, pensada para aprender desarrollo de juegos y presentar una experiencia entretenida en el Open House.

## Antes de trabajar
- [Brief del proyecto](brief-juegos-open-house.md): idea, experiencia y juegos acordados.
- [Alcance y fases](alcance-y-fases.md): límites, etapas y criterios para decidir cuándo avanzar.
- [Instrucciones para Codex](AGENTS.md): reglas de trabajo para mantener el proyecto acotado.

La tecnología acordada es TypeScript, Phaser y MediaPipe Tasks Vision. Las **fases 0, 1 y 2 están completas**. La fase 3 está en curso: ya hay menú y versiones jugables de los tres juegos; quedan pruebas de los controles por cámara de Nave y Plataformas en Chrome.

## Decisiones de la fase 0

- Nombre provisional: **Pulso Pixel**.
- Navegador de la demo: **Google Chrome**. El usuario confirmó que la cámara funciona.
- Paleta provisional: `#EAF6FF`, `#BFE3FA`, `#7FC4F2`, `#3E8FD6`, `#1E5A9C`.
- Las siete skills acordadas están en `.agents/skills/`.

## Iniciar la aplicación

1. Ejecuta `npm install` una vez.
2. Ejecuta `npm run dev`.
3. Abre en Chrome la dirección local que aparece en la terminal (normalmente `http://127.0.0.1:5173/`).

`npm run build` verifica TypeScript y prepara una versión local en `dist/`.

La página abre en el menú principal. Elige **Rebanar fruta**, **Nave espacial** o **Plataformas**; en la pantalla de cada juego selecciona el control y pulsa **Empezar partida**. El botón **Menú principal** permite salir de una ronda sin guardarla. Cada juego conserva sus resultados por separado en el navegador.

## Prototipo de rebanar fruta

- Elige **Mouse**, **Teclado** o **Cámara** y pulsa **Empezar partida**. Cada ronda dura 45 segundos; cada fruta cortada suma 10 puntos. Al terminar puedes repetir.
- Mouse: arrastra sobre las frutas. Teclado: mueve el círculo con flechas o WASD y mantén Espacio para cortar. Cámara: mueve uno o ambos índices con rapidez a través de las frutas.
- La colisión comprueba todo el segmento entre dos posiciones consecutivas. Si el seguimiento pierde la mano, se reinicia ese segmento para evitar un corte falso al reaparecer.
- La cámara se solicita solo al elegir ese control. Si se detiene durante la ronda, el teclado toma el control. También se apaga al cambiar de pestaña o cerrar la página.
- Al activar la cámara, el tablero toma la proporción real del video. La fruta aparece con su centro en la línea inferior, sube casi hasta la línea superior y vuelve a bajar. Cada índice tiene su propio cursor y trayectoria; las coordenadas se convierten usando las posiciones reales del video y del canvas en pantalla.
- La ronda empieza en nivel 1 y pasa automáticamente a nivel 2 después de 20 segundos: las frutas se mueven más rápido y aparecen con más frecuencia.
- Al terminar se guarda el número de partidas y las tres mejores puntuaciones en el almacenamiento local de este navegador. Si una puntuación entra en la tabla, se pide un nombre o apodo corto. Los récords previos sin nombre aparecen como **ANÓNIMO**. No se guardan imágenes ni video.

El video y las posiciones se procesan solo en memoria del navegador. No se guardan ni se transmiten. El modelo y los archivos WebAssembly se sirven desde `public/mediapipe/`.

**Resultado de la fase 1 en Chrome:** el usuario confirmó que el seguimiento se ve bien con movimientos lentos y reportó entre 52 y 60 detecciones por segundo, con 17 a 27 ms por imagen. En movimientos muy rápidos puede perderse momentáneamente; el prototipo evita unir posiciones a través de una pérdida de seguimiento.

**Fase 2 en Chrome:** el usuario confirmó que el juego funciona como esperaba con dos índices, que el nivel 2 se activa y que los récords locales se conservan tras jugar.

## Nave espacial — fase 3

- Elige **Nave** y **Teclado** o **Cámara**. Con teclado mueve la nave con A/D o flechas; con cámara mueve una mano horizontalmente.
- Esquiva los meteoritos: el primer choque termina la partida. El tiempo sobrevivido es la puntuación; los meteoritos caen más rápido y con mayor frecuencia a medida que sobrevives.
- Los tres mejores tiempos aparecen con nombre o apodo corto en una tabla local de estilo arcade. Si un tiempo entra en la tabla, puedes escribir hasta 10 caracteres. No se requiere cuenta y nada se envía a un servidor.
- La tabla de tiempos empieza desde cero porque los puntos de la versión anterior no se pueden comparar con segundos. Las figuras siguen siendo provisionales.

**Comprobado en el navegador local:** Nave inicia, muestra el tiempo, termina en el primer choque, pide un nombre para un tiempo destacado y conserva la tabla al recargar. Al aparecer el formulario, el juego libera el teclado y se pueden escribir A, D y W en el nombre. El control por cámara de Nave queda pendiente de prueba con la cámara real en Chrome.

## Plataformas — fase 3

- El personaje corre automáticamente por un recorrido provisional de huecos, obstáculos y meta. Con teclado se salta con Espacio, W o flecha arriba. Con cámara se juntan pulgar e índice para saltar y se separan antes de repetir.
- El primer choque o caída termina el intento. La puntuación es el porcentaje recorrido; llegar a la meta da 100 %. Se guardan las tres mejores marcas con nombre o apodo.
- Los puntajes del prototipo anterior permanecen en el navegador bajo otra clave. La tabla de porcentaje empieza desde cero porque ambas puntuaciones no son comparables.

**Comprobado en el navegador local:** el personaje avanza solo, un choque termina el intento y el recorrido completo puede superarse con ocho saltos de teclado hasta el 100 %. La tabla nueva guarda el porcentaje. Queda pendiente probar el umbral de la pinza y la dificultad con la cámara real en Chrome.
