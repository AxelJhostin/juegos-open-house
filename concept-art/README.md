# Juego independiente de Naomi y Monse

Esta carpeta reúne las ideas y el arte del juego 2D que el usuario quiere desarrollar por separado después del Open House. Es un archivo de trabajo: todavía no hay un juego independiente implementado aquí.

## La idea

- Ángeles y demonios llegaron a este mundo tras la destrucción de su dimensión en un cataclismo multidimensional. Quedan pocos.
- Los demonios son otro grupo, con alas oscuras; no son enemigos por naturaleza. Ángeles y demonios se unen para enfrentar a un grupo de ambos bandos que quiere destruirlo todo y cuyos miembros están entre los más poderosos.
- Naomi es un ángel débil y sin experiencia que tendrá que aprender a pelear para proteger el mundo que le queda. Monse es una guerrera demonio valiente, inteligente y de corazón tierno.
- Se ha conversado sobre un juego 2D de acción y plataformas con vista lateral, inspirado en la exploración y el combate de Castlevania, con identidad propia. El tono incluiría guerra, sangre y sacrificios. Son ideas iniciales, no un diseño de juego cerrado.
- Naomi empezaría con equipo sencillo y obtendría mejores armas y armaduras. Sus alas se mantienen, y el tatuaje de sol en su hombro es su marca personal.

## Ilustraciones y referencias

- [Naomi con espada y escudo](naomi/ilustracion-espada-escudo.png): ilustración detallada que gustó al usuario.
- [Monse, ilustración elegida como oficial](monse/ilustracion-oficial.png): la segunda imagen generada, con alas oscuras y arma de asta.
- [Monse, ilustración alternativa](monse/ilustracion-alternativa.png): otra versión conservada como referencia.
- [Diseño lateral de Naomi aprobado como referencia](naomi/referencia-diseno/naomi-referencia-aprobada.png) y su [guía de diseño](naomi/referencia-diseno/guia-de-diseno.md): rostro serio, alas, equipo y tatuaje que deben guiar futuros sprites. La aprobación se refiere al aspecto, no a la animación.
- Las imágenes `naomi-key-art.png` y `naomi-attack-*.png` dentro de `naomi/` son recursos del prototipo anterior de Guardiana. Se conservan como material histórico.

## Pruebas de animación

- [Prueba de reposo](naomi/prueba-sprites/vista-reposo.html) y [prueba anterior de caminata](naomi/prueba-caminar/vista-ocho-cuadros-borrador.html): experimentos visuales, no animaciones terminadas.
- [Guía de caminata de 30 cuadros](naomi/referencia-diseno/guia-caminata-30.html): muestra cómo alternan las piernas mediante un esquema. **No contiene 30 sprites de Naomi.**
- Las imágenes dentro de `naomi/prueba-caminar/` son borradores. En las pruebas generadas se repitieron poses, se cortaron algunas partes o no alternaron bien las piernas; no se han validado como sprites para el juego.

## Para cuando retomemos el juego

Primero definir y revisar las poses clave de la caminata, manteniendo el diseño aprobado y el tatuaje. Después corregir la continuidad, preparar los cuadros intermedios y probar la animación a tamaño de juego. Se conversó sobre Godot y Krita como herramientas posibles; aún no se ha fijado el motor ni creado ese proyecto.

El código `src/guardian-*.ts` y sus pruebas pertenecen al prototipo anterior y se conservan en el repositorio como referencia. No están conectados a los juegos del Open House. El contexto histórico está documentado en [la dirección de arte del prototipo anterior](../docs/naomi-art-direction.md).
