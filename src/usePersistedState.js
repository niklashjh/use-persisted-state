import { useState, useEffect, useRef, useCallback } from 'react';
import { dequal } from 'dequal/lite';
import useEventListener from '@use-it/event-listener';

import createGlobalState from './createGlobalState';
import useMemoizedObject from './useMemoizedObject';

const usePersistedState = (initialState, key, { get, set }) => {
  const globalState = useRef(null);
  const [_state, setState] = useState(() => get(key, initialState));
  const state = useMemoizedObject(_state);

  // subscribe to `storage` change events
  useEventListener('storage', ({ key: k, newValue }) => {
    if (k === key) {
      const newState = JSON.parse(newValue);
      if (!dequal(state, newState)) {
        setState(newState);
      }
    }
  });

  // only called on mount
  useEffect(() => {
    // register a listener that calls `setState` when another instance emits
    globalState.current = createGlobalState(
      key,
      setState,
      get(key, initialState)
    );

    return () => {
      globalState.current.deregister();
    };
  }, [initialState, get, key]);

  const persistentSetState = useCallback(
    (newState) => {
      const newStateValue =
        typeof newState === 'function' ? newState(state) : newState;

      // persist to localStorage
      set(key, newStateValue);

      setState(newStateValue);

      // inform all of the other instances in this tab
      globalState.current.emit(newState);
    },
    [state, set, key]
  );
  // Only persist to storage if state changes.
  useEffect(() => {
    // persist to localStorage
    set(key, state);

    // inform all of the other instances in this tab
    globalState.current.emit(state);
  }, [state]);

  return [state, persistentSetState];
};

export default usePersistedState;
