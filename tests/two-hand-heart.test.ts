import assert from 'node:assert/strict';
import test from 'node:test';
import { twoHandHeart } from '../src/two-hand-heart.ts';

function hand(side: -1 | 1) {
  const x = .5 + side * .16;
  const points = Array.from({ length: 21 }, () => ({ x, y: .5, z: 0 }));
  points[0] = { x: .5 + side * .23, y: .65, z: 0 };
  points[5] = { x: .5 + side * .13, y: .42, z: 0 };
  points[6] = { x: .5 + side * .06, y: .32, z: 0 };
  points[17] = { x: .5 + side * .19, y: .54, z: 0 };
  points[8] = { x: .5 + side * .012, y: .38, z: 0 };
  points[4] = { x: .5 + side * .012, y: .58, z: 0 };
  return points;
}

test('reconoce un corazón de dos manos sin depender de su orden', () => {
  const hands = [hand(-1), hand(1)];
  assert.equal(twoHandHeart(hands, 4 / 3), true);
  assert.equal(twoHandHeart(hands.reverse(), 4 / 3), true);
});
test('reconoce la forma curvada de la foto, con pulgares unidos abajo', () => {
  const photoHand = (positions: Record<number, [number, number]>) => {
    const points = Array.from({ length: 21 }, () => ({ x: .5, y: .5, z: 0 }));
    for (const [index, [x, y]] of Object.entries(positions)) {
      points[Number(index)] = { x: (x - 200) / 1200, y: (y - 45) / 900, z: 0 };
    }
    return points;
  };
  const left = photoHand({ 0:[337,510], 5:[658,428], 6:[754,400], 8:[778,479], 17:[588,338], 4:[778,688] });
  const right = photoHand({ 0:[1218,620], 5:[945,434], 6:[850,391], 8:[825,482], 17:[1048,410], 4:[794,688] });
  assert.equal(twoHandHeart([left, right], 4 / 3), true);
});
test('rechaza una mano, dedos separados y puntas sin separación vertical', () => {
  assert.equal(twoHandHeart([hand(-1)], 4 / 3), false);
  const left = hand(-1), right = hand(1);
  right[8].x += .2;
  assert.equal(twoHandHeart([left, right], 4 / 3), false);
  right[8].x -= .2;
  left[4].y = right[4].y = .39;
  assert.equal(twoHandHeart([left, right], 4 / 3), false);
});
