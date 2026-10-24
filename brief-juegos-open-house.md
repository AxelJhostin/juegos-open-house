# Juegos retro con control por cámara — brief del proyecto

## Objetivo

Crear una experiencia para el open house de la universidad: una página con tres minijuegos de estilo pixel art que se puedan jugar con movimientos de una o dos manos detectados por la cámara. El teclado y el mouse serán alternativas para que cualquiera pueda participar.

El proyecto también es una oportunidad para aprender desarrollo de juegos. La persona que lo desarrolla estudia Ingeniería de Software, está en sexto semestre y quiere participar en la implementación con ayuda paso a paso.

## Contexto

- Hay aproximadamente dos semanas para preparar la demo.
- Equipo disponible para desarrollar y probar: MacBook Air M4 con cámara integrada.
- La experiencia se presentará en un espacio universitario. Las personas deben poder entender cómo jugar en pocos segundos.
- Prioridades: que sea divertido, estable, fácil de probar y visualmente cuidado.

## Juegos acordados

1. **Nave espacial: esquivar y recoger**
   - Mover la nave de lado a lado.
   - Evitar meteoritos y recoger energía para sumar puntos y mantener una racha.
   - Aumentar gradualmente el desafío durante la partida.

2. **Plataformas inspirado en Mario**
   - Juego original de desplazamiento lateral: correr y saltar sobre huecos y obstáculos.
   - No recogerá objetos.
   - Usará personaje, escenarios y gráficos originales, con una sensación de plataformas clásica.

3. **Rebanar fruta, inspirado en Fruit Ninja**
   - La posición del dedo o la mano sigue el movimiento del jugador.
   - Al pasar el dedo por frutas, el juego las corta y muestra una estela visual.
   - Puede incluir bombas que se deben evitar, combos y puntaje.
   - El arte, nombre y recursos serán originales; tomamos la mecánica como inspiración.

## Experiencia y controles

- Una pantalla de inicio permite escoger el juego y explica los controles.
- Cada partida dura alrededor de 45–60 segundos, muestra el puntaje y permite volver a jugar rápidamente.
- **Modo cámara:** seguir una mano como control principal; preparar el seguimiento para permitir hasta dos manos. La segunda mano puede habilitarse si las pruebas muestran que aporta sin complicar el uso.
- **Nave:** la posición horizontal de la mano dirige la nave.
- **Plataformas:** movimiento horizontal con la mano y un gesto corto para saltar. El gesto exacto se elegirá tras probar la cámara.
- **Fruta:** una trayectoria rápida del dedo dibuja el corte; el segmento entre posiciones consecutivas del dedo debe poder cortar frutas aunque la mano se mueva entre fotogramas.
- **Alternativas:** flechas o A/D para moverse; espacio para saltar; arrastrar con el mouse para rebanar.
- Mostrar una guía breve de colocación de la mano y una indicación visible de que el seguimiento está activo.
- Procesar la cámara localmente; no guardar ni transmitir imágenes.

## Enfoque técnico acordado

Usar una aplicación web con **TypeScript + Phaser + MediaPipe Tasks Vision para JavaScript**.

- Phaser es un motor 2D para navegador, con escenas, animación, entrada de teclado y detección de colisiones. Esto evita construir a mano toda la infraestructura de los tres juegos y deja espacio para aprender sus conceptos.
- MediaPipe Hand Landmarker para Web entrega puntos de referencia de la mano. Su configuración permite detectar hasta dos manos; se puede usar la posición del dedo y su trayectoria para mover la nave, saltar y cortar fruta.
- Una aplicación web facilita correr la demo desde la Mac y luego reutilizar partes del control en una posible extensión de navegador.
- Guardar localmente el modelo y los recursos necesarios para preparar un modo de demostración sin depender de internet. Verificar permisos de cámara, rendimiento y carga de recursos en el navegador elegido.
- La detección de video puede bloquear el hilo principal en la implementación directa. Si las pruebas muestran pausas, mover la inferencia a un Web Worker o reducir la frecuencia/resolución de captura.

## Alcance de la primera versión

- Menú con los tres juegos.
- Partidas jugables con teclado y, después, con cámara.
- Puntaje, final de partida y opción de jugar de nuevo.
- Estilo pixel art consistente; integrar colores o identidad de la universidad si se facilitan recursos o lineamientos.
- Sin servidor, cuentas ni almacenamiento de video.

## Fase posterior: extensión para juegos web

Diseñar la entrada de manera que pueda reutilizarse en una extensión de navegador. Más adelante se puede investigar una extensión que convierta gestos en controles de teclado para juegos web compatibles.

La extensión no forma parte de la demo inicial. El navegador restringe el control entre pestañas y sitios; una extensión requiere permisos y pruebas por juego, así que no se asumirá que funcionará con cualquier juego de internet.

## Decisiones pendientes

- Definir el nombre general de la experiencia y el estilo visual; añadir identidad de la universidad si comparten colores o recursos oficiales.
- Probar si la experiencia queda mejor con una mano por defecto y dos opcionalmente, o con ambas disponibles desde el inicio.
- Ajustar el gesto de salto y los rangos de movimiento con la cámara real.
- Afinar dificultad, puntajes, efectos y duración mientras se juega.

## Orden de trabajo sugerido

1. Crear un prototipo pequeño con cámara que detecte una mano y muestre en pantalla el movimiento del dedo.
2. Construir un juego completo con teclado y conectarle el control por cámara.
3. Crear el menú compartido y los otros dos juegos reutilizando controles, puntaje y elementos visuales.
4. Pulir rendimiento, instrucciones, identidad visual y modo de demostración.

## Referencias técnicas

- [Documentación oficial de Phaser](https://docs.phaser.io/): motor 2D para navegadores y desarrollo con JavaScript o TypeScript.
- [Guía oficial de MediaPipe Hand Landmarker para Web](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js): puntos de la mano, modo de video, configuración de dos manos y notas de rendimiento.
