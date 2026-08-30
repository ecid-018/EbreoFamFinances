export function groupByOrder(items, keyFn) {
  const order = [];
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key).push(item);
  }
  return order.map((key) => ({ group: key, items: map.get(key) }));
}
