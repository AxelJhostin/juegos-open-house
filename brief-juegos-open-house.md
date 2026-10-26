# Juegos retro con control por cámara — brief del proyecto

## Objetivo

Crear una experiencia para el open house de la universidad: una página con cuatro minijuegos de estilo arcade que se puedan jugar con movimientos de las manos detectados por la cámara. El teclado y el mouse serán alternativas para que cualquiera pueda participar.

El proyecto también es una oportunidad para aprender desarrollo de juegos. La persona que lo desarrolla estudia Ingeniería de Software, está en sexto semestre y quiere participar en la implementación con ayuda paso a paso.

## Contexto

- Hay aproximadamente dos semanas para preparar la demo.
- Equipo disponible para desarrollar y probar: MacBook Air M4 con cámara integrada.
- La experiencia se presentará en un espacio universitario. Las personas deben poder entender cómo jugar en pocos segundos.
- Prioridades: que sea divertido, estable, fácil de probar y visualmente cuidado.

## Juegos acordados

1. **Nave espacial: supervivencia**
   - Mover la nave de lado a lado.
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

4. **Guardiana del Alba — Naomi (incorporación acordada)**
   - Naomi, guerrera medieval angelical inspirada en la foto facilitada por el usuario, protagoniza un combate de dos lados.
   - Una mano controla el ataque del ala izquierda y la otra el del ala derecha. Cada pinza activa un golpe; los enemigos pueden llegar a ambos lados a la vez.
   - Ronda corta con puntuación por enemigos derrotados, tres golpes recibidos como límite, repetición rápida y tabla local de tres mejores resultados con nombre.
   - Retrato, enemigos, escenario y efectos originales. El título es provisional; el video de cámara sigue procesándose solo en el navegador.

## Experiencia y controles

- Una pantalla de inicio permite escoger el juego y explica los controles.
- Una pantalla explicativa independiente muestra sobre la cámara los 21 puntos de cada mano que estima el modelo. Se abre desde el menú y no cuenta como otro juego.
- En esa pantalla, una postura de dos manos (una arriba y otra abajo, con los dedos extendidos en sentidos opuestos) activa una esfera de energía original situada entre ambas. Esto muestra cómo el código convierte los puntos estimados en un gesto y un efecto visual.
- Un segundo gesto original, índice y meñique extendidos con medio y anular doblados, activa un sello mágico por mano; puede aparecer en una o en las dos manos a la vez.
- Fruta dura alrededor de 45 segundos. Plataformas tiene intentos cortos que terminan al chocar, caer o llegar a la meta. Nave termina al primer choque; muestra el tiempo sobrevivido y permite volver a jugar rápidamente.
- **Modo cámara:** usar hasta dos manos con el mismo detector local. Nave y Plataformas admiten una; Fruta acepta uno o dos índices y Guardiana requiere dos pinzas independientes.
- **Nave:** la posición horizontal de la mano dirige la nave.
- **Plataformas:** avance automático y una pinza de pulgar e índice para saltar; hay que separar los dedos antes de repetir el salto.
- **Fruta:** una trayectoria rápida del dedo dibuja el corte; el segmento entre posiciones consecutivas del dedo debe poder cortar frutas aunque la mano se mueva entre fotogramas.
- **Guardiana:** dos manos visibles, una por lado; una pinza por mano activa la espada/ala correspondiente. Dos teclas independientes permiten jugar sin cámara.
- **Alternativas:** flechas o A/D para mover la nave; espacio, W o flecha arriba para saltar en Plataformas; arrastrar con el mouse para rebanar; F y J para atacar en Guardiana.
- Los tres mejores resultados de cada juego muestran un nombre o apodo corto, introducido al entrar en la tabla. Todo se guarda solo en este navegador.
- Mostrar una guía breve de colocación de la mano y una indicación visible de que el seguimiento está activo.
- Procesar la cámara localmente; no guardar ni transmitir imágenes.

## Enfoque técnico acordado

Usar una aplicación web con **TypeScript + Phaser + MediaPipe Tasks Vision para JavaScript**.

- Phaser es un motor 2D para navegador, con escenas, animación y entrada de teclado. Esto evita construir a mano toda la infraestructura de los cuatro juegos y deja espacio para aprender sus conceptos.
- MediaPipe Hand Landmarker para Web entrega puntos de referencia de la mano. Su configuración permite detectar hasta dos manos; se puede usar la posición del dedo y su trayectoria para mover la nave, saltar y cortar fruta.
- Una aplicación web facilita correr la demo desde la Mac y luego reutilizar partes del control en una posible extensión de navegador.
- Guardar localmente el modelo y los recursos necesarios para preparar un modo de demostración sin depender de internet. Verificar permisos de cámara, rendimiento y carga de recursos en el navegador elegido.
- La detección de video puede bloquear el hilo principal en la implementación directa. Si las pruebas muestran pausas, mover la inferencia a un Web Worker o reducir la frecuencia/resolución de captura.

## Alcance de la primera versión

- Menú con los cuatro juegos.
- Partidas jugables con teclado y, después, con cámara.
- Puntaje, final de partida y opción de jugar de nuevo.
- Identidad visual consistente con una personalidad por juego; Guardiana usa ilustración original. Integrar colores o identidad de la universidad si se facilitan recursos o lineamientos.
- Sin servidor, cuentas ni almacenamiento de video.

## Fase posterior: extensión para juegos web

Diseñar la entrada de manera que pueda reutilizarse en una extensión de navegador. Más adelante se puede investigar una extensión que convierta gestos en controles de teclado para juegos web compatibles.

La extensión no forma parte de la demo inicial. El navegador restringe el control entre pestañas y sitios; una extensión requiere permisos y pruebas por juego, así que no se asumirá que funcionará con cualquier juego de internet.

## Decisiones pendientes

- Afinar la identidad visual de la universidad si comparten nuevos recursos o lineamientos. El nombre general acordado es Pulso Pixel.
- Probar el ataque de dos pinzas de Guardiana con la cámara real y ajustar su legibilidad.
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
