# Juegos con control por cámara — Open House

Proyecto de una colección pequeña de juegos web originales controlados con movimientos de la mano, pensada para aprender desarrollo de juegos y presentar una experiencia entretenida en el Open House.

## Antes de trabajar
- [Brief del proyecto](brief-juegos-open-house.md): idea, experiencia y juegos acordados.
- [Alcance y fases](alcance-y-fases.md): límites, etapas y criterios para decidir cuándo avanzar.
- [Instrucciones para Codex](AGENTS.md): reglas de trabajo para mantener el proyecto acotado.

La tecnología acordada es TypeScript, Phaser y MediaPipe Tasks Vision. Las **fases 0, 1 y 2 están completas**. La fase 3 comenzará cuando el usuario la pida.

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

## Prototipo de rebanar fruta

- Elige **Mouse**, **Teclado** o **Cámara** y pulsa **Empezar partida**. Cada ronda dura 45 segundos; cada fruta cortada suma 10 puntos. Al terminar puedes repetir.
- Mouse: arrastra sobre las frutas. Teclado: mueve el círculo con flechas o WASD y mantén Espacio para cortar. Cámara: mueve uno o ambos índices con rapidez a través de las frutas.
- La colisión comprueba todo el segmento entre dos posiciones consecutivas. Si el seguimiento pierde la mano, se reinicia ese segmento para evitar un corte falso al reaparecer.
- La cámara se solicita solo al elegir ese control. Si se detiene durante la ronda, el teclado toma el control. También se apaga al cambiar de pestaña o cerrar la página.
- Al activar la cámara, el tablero toma la proporción real del video. La fruta aparece con su centro en la línea inferior, sube casi hasta la línea superior y vuelve a bajar. Cada índice tiene su propio cursor y trayectoria; las coordenadas se convierten usando las posiciones reales del video y del canvas en pantalla.
- La ronda empieza en nivel 1 y pasa automáticamente a nivel 2 después de 20 segundos: las frutas se mueven más rápido y aparecen con más frecuencia.
- Al terminar se guarda el número de partidas y las tres mejores puntuaciones en el almacenamiento local de este navegador. No se guardan nombres, imágenes ni video.

El video y las posiciones se procesan solo en memoria del navegador. No se guardan ni se transmiten. El modelo y los archivos WebAssembly se sirven desde `public/mediapipe/`.

**Resultado de la fase 1 en Chrome:** el usuario confirmó que el seguimiento se ve bien con movimientos lentos y reportó entre 52 y 60 detecciones por segundo, con 17 a 27 ms por imagen. En movimientos muy rápidos puede perderse momentáneamente; el prototipo evita unir posiciones a través de una pérdida de seguimiento.

**Fase 2 en Chrome:** tras ajustar las coordenadas, las guías y el uso de dos índices, el usuario confirmó que el juego funciona como esperaba. El nivel 2 y los récords locales aún requieren una partida de comprobación.
