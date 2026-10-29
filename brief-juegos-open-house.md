# Juegos retro con control por cámara — brief del proyecto

## Objetivo

Crear una experiencia para el open house de la universidad: una página con tres minijuegos de estilo arcade que se puedan jugar con movimientos de las manos detectados por la cámara. El teclado y el mouse serán alternativas para que cualquiera pueda participar.

El proyecto también es una oportunidad para aprender desarrollo de juegos. La persona que lo desarrolla estudia Ingeniería de Software, está en sexto semestre y quiere participar en la implementación con ayuda paso a paso.

## Contexto

- Hay aproximadamente dos semanas para preparar la demo.
- Equipo disponible para desarrollar y probar: MacBook Air M4 con cámara integrada.
- La experiencia se presentará en un espacio universitario. Las personas deben poder entender cómo jugar en pocos segundos.
- Prioridades: que sea divertido, estable, fácil de probar y visualmente cuidado.

## Juegos acordados

1. **Nave espacial: supervivencia**
   - Mover la nave a los lados, arriba y abajo.
   - Esquivar meteoritos hasta el primer choque; el tiempo sobrevivido es la puntuación.
   - Aumentar gradualmente la velocidad y la frecuencia de los meteoritos.
   - Guardar en este navegador los tres mejores tiempos con un nombre o apodo corto, como en una tabla arcade.

2. **Plataformas de avance automático**
   - Juego original de desplazamiento lateral: el personaje corre solo y el jugador decide cuándo saltar huecos y obstáculos.
   - El primer choque o caída termina el intento; el porcentaje recorrido es la puntuación y llegar a la meta da 100 %.
   - No recogerá objetos.
   - Usará personaje, escenarios y gráficos originales, con una sensación de plataformas clásica.

3. **Rebanar fruta, inspirado en Fruit Ninja**
   - La posición del dedo o la mano sigue el movimiento del jugador.
   - Al pasar el dedo por frutas, el juego las corta y muestra una estela visual.
   - Puede incluir bombas que se deben evitar, combos y puntaje.
   - El arte, nombre y recursos serán originales; tomamos la mecánica como inspiración.

## Experiencia y controles

- Una pantalla de inicio permite escoger los tres juegos y explica los controles.
- Una pantalla explicativa independiente muestra sobre la cámara los 21 puntos de cada mano que estima el modelo. Se abre desde el menú y no cuenta como otro juego.
- En esa pantalla, una postura de dos manos (una arriba y otra abajo, con los dedos extendidos en sentidos opuestos) activa una esfera de energía original situada entre ambas. Esto muestra cómo el código convierte los puntos estimados en un gesto y un efecto visual.
- Un segundo gesto original, índice y meñique extendidos con medio y anular doblados, activa un sello mágico por mano; puede aparecer en una o en las dos manos a la vez.
- Un tercer gesto de una mano, inspirado en el corazón formado con pulgar e índice, activa una lluvia animada de corazones rosas que se desvanece al soltar la seña.
- Fruta dura alrededor de 45 segundos. Plataformas tiene intentos cortos que terminan al chocar, caer o llegar a la meta. Nave termina al primer choque; muestra el tiempo sobrevivido y permite volver a jugar rápidamente.
- **Modo cámara:** usar hasta dos manos con el mismo detector local. Nave y Plataformas admiten una; Fruta acepta uno o dos índices.
- **Nave:** la posición del índice en la cámara dirige la nave en dos ejes.
- **Plataformas:** avance automático y una pinza de pulgar e índice para saltar; mantener la pinza repite el salto al aterrizar, y separarlos lo detiene. Mantener la tecla de salto funciona igual.
- **Fruta:** cada índice deja una estela luminosa de color propio al moverse; una trayectoria rápida produce el corte. El segmento entre posiciones consecutivas debe poder cortar frutas aunque la mano se mueva entre fotogramas.
- En Fruta, la común vale 10 puntos, una dorada ocasional vale 30 y una morada ocasional resta 20 sin bajar el marcador de cero. Las especiales tienen símbolos propios y se separan por al menos dos lanzamientos normales. Durante la fase 4 los lanzamientos son un poco más frecuentes, rápidos y altos.
- **Alternativas:** flechas o WASD para mover la nave; espacio, W o flecha arriba para saltar en Plataformas; arrastrar con el mouse para rebanar.
- Los tres mejores resultados de cada juego muestran un nombre o apodo corto, introducido al entrar en la tabla. Todo se guarda solo en este navegador.
- Mostrar una guía breve de colocación de la mano y una indicación visible de que el seguimiento está activo.
- Procesar la cámara localmente; no guardar ni transmitir imágenes.

### Mapa corporal acordado para la fase 4

- Desde el mismo menú se abre **Mapa corporal**, una experiencia de cámara separada de los tres minijuegos.
- Detecta hasta tres cuerpos con un modelo local y dibuja los 33 puntos estimados de cada uno, junto con sus conexiones. Sobre ese mapa muestra los 21 puntos detallados de cada mano detectada, hasta seis manos.
- Solo la superficie de cámara y puntos puede ampliarse a pantalla completa. Los filtros creativos quedan pendientes de una decisión futura; la aplicación no toma, guarda ni transmite fotos o video.

## Enfoque técnico acordado

Usar una aplicación web con **TypeScript + Phaser + MediaPipe Tasks Vision para JavaScript**.

- Phaser es un motor 2D para navegador, con escenas, animación y entrada de teclado. Esto evita construir a mano toda la infraestructura de los tres juegos y deja espacio para aprender sus conceptos.
- MediaPipe Hand Landmarker para Web entrega puntos de referencia de la mano. Su configuración permite detectar hasta dos manos; se puede usar la posición del dedo y su trayectoria para mover la nave, saltar y cortar fruta.
- El mapa corporal usa Pose Landmarker local para ubicar cara, torso, brazos y piernas de hasta tres personas. Dibuja los puntos sobre el video, sin identificar personas ni almacenar imágenes.
- Una aplicación web facilita correr la demo desde la Mac y luego reutilizar partes del control en una posible extensión de navegador.
- Guardar localmente el modelo y los recursos necesarios para preparar un modo de demostración sin depender de internet. Verificar permisos de cámara, rendimiento y carga de recursos en el navegador elegido.
- La detección de video puede bloquear el hilo principal en la implementación directa. Si las pruebas muestran pausas, mover la inferencia a un Web Worker o reducir la frecuencia/resolución de captura.

## Alcance de la primera versión

- Menú con los tres juegos públicos del Open House.
- Partidas jugables con teclado y, después, con cámara.
- Puntaje, final de partida y opción de jugar de nuevo.
- Identidad visual consistente con una personalidad por juego. Integrar colores o identidad de la universidad si se facilitan recursos o lineamientos.
- Sin servidor, cuentas ni almacenamiento de video.

## Fase posterior: extensión para juegos web

Diseñar la entrada de manera que pueda reutilizarse en una extensión de navegador. Más adelante se puede investigar una extensión que convierta gestos en controles de teclado para juegos web compatibles.

La extensión no forma parte de la demo inicial. El navegador restringe el control entre pestañas y sitios; una extensión requiere permisos y pruebas por juego, así que no se asumirá que funcionará con cualquier juego de internet.

## Proyecto aparte

El juego de Naomi (antes llamado *Guardiana del Alba*) queda fuera del Open House. Su concepto, arte y materiales relacionados se reservan para desarrollarlos como un juego 2D independiente después del evento.

## Decisiones pendientes

- Afinar la identidad visual de la universidad si comparten nuevos recursos o lineamientos. El nombre general acordado es Pulso Pixel.
- Ajustar el umbral de la pinza con la cámara real.
- Afinar dificultad, puntajes, efectos y duración mientras se juega.

## Orden de trabajo sugerido

1. Crear un prototipo pequeño con cámara que detecte una mano y muestre en pantalla el movimiento del dedo.
2. Construir un juego completo con teclado y conectarle el control por cámara.
3. Crear el menú compartido y los demás juegos reutilizando controles, puntaje y elementos visuales.
4. Pulir rendimiento, instrucciones, identidad visual y modo de demostración.

## Referencias técnicas

- [Documentación oficial de Phaser](https://docs.phaser.io/): motor 2D para navegadores y desarrollo con JavaScript o TypeScript.
- [Guía oficial de MediaPipe Hand Landmarker para Web](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js): puntos de la mano, modo de video, configuración de dos manos y notas de rendimiento.
