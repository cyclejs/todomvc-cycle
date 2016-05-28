import intent from './intent';
import model from './model';
import view from './view';

// THE TODO ITEM FUNCTION
// This is a simple todo item component,
// structured with the MVI-pattern.
function Task({DOM, props$}) {
  let action$ = intent(DOM);
  let state$ = model(props$, action$);
  let vtree$ = view(state$);

  return {
    DOM: vtree$,
    action$,
  };
}

export default Task;
