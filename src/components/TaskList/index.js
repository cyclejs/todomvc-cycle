import xs from 'xstream';
import isolate from '@cycle/isolate';
import {pick, mix} from 'cycle-onionify';
import deserialize from './storage-source';
import serialize from './storage-sink';
import intent from './intent';
import model from './model';
import viewModel from './view-model';
import view from './view';
import Task from '../Task/index';

function Children(sources) {
  const array$ = sources.onion.state$;
  const taskSinks$ = array$.map(array =>
    array.map((item, i) => isolate(Task, i)(sources))
  );

  const vnodes$ = taskSinks$
    .compose(pick(sinks => sinks.DOM))
    .compose(mix(xs.combine));
  const reducer$ = taskSinks$
    .compose(pick(sinks => sinks.onion))
    .compose(mix(xs.merge));

  const sinks = {
    vnodes: vnodes$,
    onion: reducer$,
  }
  return sinks;
}

export default function TaskList(sources) {
  const state$ = sources.onion.state$;
  const action$ = intent(sources.DOM, sources.history);
  const parentReducer$ = model(action$);

  const childrenSinks = isolate(Children, 'list')(sources);
  const childrenVNodes$ = childrenSinks.vnodes;
  const childrenReducer$ = childrenSinks.onion;
  const viewState$ = viewModel(state$, childrenVNodes$);

  const vdom$ = view(viewState$);
  const reducer$ = xs.merge(parentReducer$, childrenReducer$);

  const sinks = {
    DOM: vdom$,
    onion: reducer$,
  };
  return sinks;
}
