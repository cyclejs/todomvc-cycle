import xs from 'xstream';
import isolate from '@cycle/isolate';
import intent from './intent';
import model from './model';
import view from './view';
import {listLens, List} from './List';

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
