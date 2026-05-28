/**
 * React 16: SyntheticEvent. React 17+: often SyntheticBaseEvent for the same API.
 */
export function assertIsSyntheticEvent(assert, event) {
  assert.isObject(event);
  assert.property(event, 'nativeEvent');
  const { name } = event.constructor;
  assert.isTrue(
    name === 'SyntheticEvent' || name === 'SyntheticBaseEvent',
    `expected a React synthetic event, got constructor ${name}`
  );
}
