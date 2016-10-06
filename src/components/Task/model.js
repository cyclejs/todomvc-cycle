import xs from 'xstream';

export default function model(action$) {
  const startEditReducer$ = action$
    .filter(action => action.type === 'startEdit')
    .mapTo(function startEditReducer(data) {
      return {...data, editing: true};
    });

  const doneEditReducer$ = action$
    .filter(action => action.type === 'doneEdit')
    .map(action => function doneEditReducer(data) {
      return {...data, title: action.payload, editing: false};
    });

  const cancelEditReducer$ = action$
    .filter(action => action.type === 'cancelEdit')
    .mapTo(function cancelEditReducer(data) {
      return {...data, editing: false};
    });

  const toggleReducer$ = action$
    .filter(action => action.type === 'toggle')
    .map(action => function toggleReducer(data) {
      return {...data, completed: action.payload};
    });

  const destroyReducer$ = action$
    .filter(action => action.type === 'destroy')
    .map(action => function destroyReducer(data) {
      return void 0;
    });

  return xs.merge(
    startEditReducer$,
    doneEditReducer$,
    cancelEditReducer$,
    toggleReducer$,
    destroyReducer$
  );
}
