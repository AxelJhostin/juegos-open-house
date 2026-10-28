# Naomi — dirección de arte de referencia para el proyecto aparte

Este concepto queda fuera de la aplicación del Open House y se conserva para el futuro juego 2D independiente.

## Marco del juego

- Fantasía: Naomi defiende un santuario con dos alas armadas, una por cada mano del jugador.
- Acción principal: pinza izquierda o derecha para cortar una sombra que se acerca por ese lado.
- Motor: Phaser 4, escena 2D de 960 × 540; en cámara la altura se ajusta a la proporción del video.
- Lectura a tamaño real: Naomi ocupa el centro; las zonas de ataque, enemigos y efectos se distinguen a ambos lados.

## Sistema visual

- Silueta: cabello oscuro largo, alas claras abiertas, dos espadas y emblema solar.
- Colores: índigo nocturno `#111b3c`, violeta sombra `#44346b`, marfil `#f7f0d9`, oro `#f5c768`, azul luminoso `#8ddfff`.
- Materiales: armadura marfil/plata con ribetes dorados; sombras violetas con núcleo magenta.
- Foco: rostro y sol en el centro, ataques luminosos en los laterales. El fondo queda más oscuro que los objetivos.
- Movimiento: reposo con respiración y balanceo suaves; poses distintas de golpe izquierdo, derecho y doble; desplazamiento y recuperación breves; impacto con reacción y destello.
- Exclusiones: personajes, emblemas, nombres o recursos de franquicias existentes; foto personal original dentro de la app.

## Recursos y procedencia

- `concept-art/naomi/naomi-key-art.png`: pose de reposo de Naomi, generada como concepto a partir de la foto aportada en la conversación. Fuente: herramienta integrada `image_gen`, 2026-10-25. La foto de referencia no se distribuye con el juego.
- `concept-art/naomi/naomi-attack-left.png`, `naomi-attack-right.png` y `naomi-attack-both.png`: variantes generadas a partir de la pose de reposo con la misma herramienta y fecha. Cada una corresponde a una acción, sin reutilizar arte de franquicias.
- Contrato técnico: cuatro PNG RGBA de 1024 × 1536, ancla visual inferior central, escalado proporcional en Phaser. Los límites de golpe son datos del juego y no dependen del tamaño de las poses.
- Los enemigos, el santuario y los efectos de combate se dibujan en Phaser; su geometría y colisiones permanecen separadas del retrato.
- Estado: las poses y la transición de ataque doble se revisaron dentro del tablero en navegador. La pinza de dos manos necesita prueba humana con cámara.
