import xs from 'xstream';
import isolate from '@cycle/isolate';
import intent from './intent';
import model from './model';
import view from './view';
import {List} from './List';

export const listLens = {
  get: (state) => {
    return state.list.filter(state.filterFn);
  },

  set: (state, nextFilteredList) => {
    const prevFilteredList = state.list.filter(state.filterFn);
    const newList = state.list
      .map(task => nextFilteredList.find(t => t.key === task.key) || task)
      .filter(task =>
        prevFilteredList.some(t => t.key === task.key) &&
        nextFilteredList.some(t => t.key === task.key)
      );
    return {
      ...state,
      list: newList,
    };
  }
}

export default function TaskList(sources) {
  const state$ = sources.onion.state$;
  const actions = intent(sources.DOM, sources.history);
  const parentReducer$ = model(actions);

  const listSinks = isolate(List, {onion: listLens})(sources);
  const listVDom$ = listSinks.DOM;
  const listReducer$ = listSinks.onion;

  const vdom$ = view(state$, listVDom$);
  const reducer$ = xs.merge(parentReducer$, listReducer$);

  return {
    DOM: vdom$,
    onion: reducer$,
  };
}
