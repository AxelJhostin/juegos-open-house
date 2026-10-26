# Guardiana del Alba — dirección de arte

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
- Movimiento: alas y cabello con oscilación discreta; golpe rápido con estela y partículas; impacto con destello breve.
- Exclusiones: personajes, emblemas, nombres o recursos de franquicias existentes; foto personal original dentro de la app.

## Recursos y procedencia

- `public/guardian/naomi-key-art.png`: retrato de Naomi generado para este proyecto a partir de la foto aportada en la conversación. Fuente: herramienta integrada `image_gen`, 2026-10-25. La foto de referencia no se distribuye con el juego.
- Contrato técnico: PNG RGBA de 1024 × 1536, ancla visual inferior central, escalado proporcional en Phaser.
- Los enemigos, el santuario y los efectos de combate se dibujan en Phaser; su geometría y colisiones permanecen separadas del retrato.
- Estado: revisado dentro del tablero en navegador. La lectura de las zonas de ataque y el control de teclado se verificaron; la pinza de dos manos necesita prueba humana con cámara.
