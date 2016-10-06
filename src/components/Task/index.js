import intent from './intent';
import model from './model';
import view from './view';

export default function Task(sources) {
  const state$ = sources.onion.state$;
  const action$ = intent(sources.DOM);
  const reducer$ = model(action$);
  const vtree$ = view(state$);

  return {
    DOM: vtree$,
    onion: reducer$,
  };
}
