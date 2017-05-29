import {ul} from '@cycle/dom';
import {pickCombine, pickMerge} from 'cycle-onionify';
import Task from '../Task/index';

export function List(sources) {
  const tasks$ = sources.onion.asCollection(Task, sources, s => s.key);

  const vdom$ = tasks$
    .compose(pickCombine('DOM'))
    .map(vnodes => ul('.todo-list', vnodes));

  const reducer$ = tasks$
    .compose(pickMerge('onion'));

  return {
    DOM: vdom$,
    onion: reducer$,
  };
}
