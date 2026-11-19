import { describe, expect, it } from 'vitest';
import { addLine, EMPTY_BASKET, lineKey, MAX_LINES, parseBasket, setLineAc, setQuantity, removeLine, type Basket } from '@/lib/basket';

const jet = { type: 'SERVICE' as const, ref: 'SVC-JET-WASH', name: 'Jet wash' };

describe('basket lines', () => {
  it('adding the same service twice raises its quantity', () => {
    const one = addLine(EMPTY_BASKET, jet);
    expect(one.result).toBe('added');
    const two = addLine(one.basket, jet);
    expect(two.result).toBe('increased');
    expect(two.basket.lines).toHaveLength(1);
    expect(two.basket.lines[0].quantity).toBe(2);
  });

  it('keeps the same service for different ACs as separate lines', () => {
    const a = addLine(EMPTY_BASKET, { ...jet, ac: { type: 'SPLIT', tonnage: 1.5 } }).basket;
    const b = addLine(a, { ...jet, ac: { type: 'WINDOW', tonnage: 1 } }).basket;
    expect(b.lines).toHaveLength(2);
  });

  it('never goes above 20 of one thing', () => {
    let b = addLine(EMPTY_BASKET, { ...jet, quantity: 19 }).basket;
    b = addLine(b, { ...jet, quantity: 5 }).basket;
    expect(b.lines[0].quantity).toBe(20);
    expect(setQuantity(b, b.lines[0].key, 99).lines[0].quantity).toBe(20);
    expect(setQuantity(b, b.lines[0].key, 0).lines[0].quantity).toBe(1);
  });

  it('refuses a 31st different line and leaves the basket as it was', () => {
    let b: Basket = EMPTY_BASKET;
    for (let i = 0; i < MAX_LINES; i++) b = addLine(b, { type: 'PRODUCT', ref: `p${i}`, name: `AC ${i}` }).basket;
    const full = addLine(b, { type: 'PRODUCT', ref: 'p-extra', name: 'One more' });
    expect(full.result).toBe('full');
    expect(full.basket).toBe(b);
  });

  it('merges quantities when a line is changed to match another', () => {
    let b = addLine(EMPTY_BASKET, { ...jet, ac: { type: 'SPLIT', tonnage: 1 } }).basket;
    b = addLine(b, { ...jet, quantity: 2 }).basket;
    const plain = b.lines.find((l) => !l.ac)!;
    const merged = setLineAc(b, plain.key, { type: 'SPLIT', tonnage: 1 });
    expect(merged.lines).toHaveLength(1);
    expect(merged.lines[0].quantity).toBe(3);
    expect(merged.lines[0].key).toBe(lineKey('SERVICE', 'SVC-JET-WASH', { type: 'SPLIT', tonnage: 1 }));
  });

  it('removes a line', () => {
    const b = addLine(EMPTY_BASKET, jet).basket;
    expect(removeLine(b, b.lines[0].key).lines).toHaveLength(0);
  });
});

describe('parseBasket', () => {
  it('starts empty for missing, broken or old saved data', () => {
    expect(parseBasket(null)).toEqual(EMPTY_BASKET);
    expect(parseBasket('{')).toEqual(EMPTY_BASKET);
    expect(parseBasket('{"v":0,"lines":[]}')).toEqual(EMPTY_BASKET);
    expect(parseBasket('[1,2]')).toEqual(EMPTY_BASKET);
  });

  it('drops bad lines and keeps good ones', () => {
    const raw = JSON.stringify({
      v: 1,
      lines: [
        { key: 'x', type: 'SERVICE', ref: 'SVC-GAS', name: 'Gas', quantity: 1 },
        { key: 'y', type: 'ROCKET', ref: 'R', name: 'R', quantity: 1 },
        { key: 'z', type: 'AMC', ref: '', name: 'Empty', quantity: 1 },
        { key: 'w', type: 'PRODUCT', ref: 'p1', name: 'AC', quantity: 1.5 },
      ],
    });
    const b = parseBasket(raw);
    expect(b.lines).toHaveLength(1);
    expect(b.lines[0].ref).toBe('SVC-GAS');
    expect(b.lines[0].key).toBe(lineKey('SERVICE', 'SVC-GAS'));
  });
});
