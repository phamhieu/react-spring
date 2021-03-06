import React from 'react';
import { assert, test, _ } from 'spec.ts';
import {
  animated,
  useTransition,
  ItemTransition,
  SpringValue,
  SpringUpdateFn,
} from '../..';

const View = animated('div');

const items = [1, 2] as [1, 2];

test('infer animated from these props', () => {
  const [transition] = useTransition(items, null, {
    from: { a: 1 },
    enter: { b: 1 },
    leave: { c: 1 },
    update: { d: 1 },
    initial: { e: 1 },
  });
  assert(transition.props, _ as {
    [key: string]: SpringValue<any>;
    a: SpringValue<number>;
    b: SpringValue<number>;
    c: SpringValue<number>;
    d: SpringValue<number>;
    e: SpringValue<number>;
  });
});

test('basic usage', () => {
  const transitions = useTransition(items, null, {
    from: { opacity: 0 },
    enter: [{ opacity: 1 }, { color: 'red' }],
    leave: { opacity: 0 },
  });

  // You typically map transition objects into JSX elements.
  return transitions.map(transition => {
    type T = ItemTransition<1 | 2, { opacity: number; color: string }>;
    assert(transition, _ as T);
    return <View style={transition.props}>{transition.item}</View>;
  });
});

test('with function props', () => {
  const transitions = useTransition(items, null, {
    from: item => {
      assert(item, _ as 1 | 2);
      return { width: 0, height: 0 };
    },
    enter: item => {
      assert(item, _ as 1 | 2);
      return { width: item * 100, height: '100%' };
    },
    leave: { width: '0%', opacity: 0 },
  });
  assert(transitions[0].props, _ as {
    [key: string]: SpringValue<any>;
    width: SpringValue<string | number>;
    height: SpringValue<string | number>;
    opacity: SpringValue<number>;
  });

  test('return an async function', () => {
    useTransition(items, null, {
      update: item => async next => {
        assert(item, _ as 1 | 2);
        assert(next, _ as SpringUpdateFn); // FIXME: should be "SpringUpdateFn<{ opacity: number, ... }>"
      },
    });
  });
});
