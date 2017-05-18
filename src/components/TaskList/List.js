import {ul} from '@cycle/dom';
import {collection, pickCombine, pickMerge} from 'cycle-onionify';
import Task from '../Task/index';

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

export function List(sources) {
  const tasks$ = collection(Task, sources);

  const vdom$ = tasks$
    .compose(pickCombine('DOM'))
    .map(vnodes => {
      return ul('.todo-list', vnodes)
    })

  const reducer$ = tasks$
    .compose(pickMerge('onion'));

  return {
    DOM: vdom$,
    onion: reducer$,
  };
}
