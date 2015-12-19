import {Rx} from '@cycle/core';
import intent from './intent';
import model from './model';
import view from './view';
import deserialize from './deserialize';
import serialize from './serialize';
import todoItem from '../todo-item';
import mapValues from 'lodash.mapvalues';

function amendStateWithChildren(DOM) {
  return function (todosData) {
    return {
      list: todosData.list.map(data => {
        const props$ = Rx.Observable.just(data);
        return {
          id: data.id,
          title: data.title,
          completed: data.completed,
          todoItem: todoItem({DOM, props$}, `.item${data.id}`)
        };
      }),
      filter: todosData.filter,
      filterFn: todosData.filterFn,
    };
  };
}

function makeItemActions(typeItemActions, amendedState$) {
  return mapValues(typeItemActions, (irrelevant, actionKey) =>
    amendedState$
      .filter(todosData => todosData.list.length)
      .flatMapLatest(todosData =>
        Rx.Observable.merge(todosData.list.map(i => i.todoItem[actionKey]))
      )
  );
}

function replicateAll(objectStructure, realStreams, proxyStreams) {
  mapValues(objectStructure, (irrelevant, key) => {
    realStreams[key].subscribe(proxyStreams[key].asObserver());
  });
}

function todos({DOM, hashchange, initialHash, storage}) {
  const localStorage$ = storage.local.getItem('todos-cycle').take(1);
  const sourceTodosData$ = deserialize(localStorage$);
  const typeItemActions = {toggle$: null, edit$: null, delete$: null};
  const proxyItemActions = mapValues(typeItemActions, () => new Rx.Subject());
  const actions = intent(DOM, hashchange, initialHash, proxyItemActions);
  const state$ = model(actions, sourceTodosData$).shareReplay(1);
  const amendedState$ = state$.map(amendStateWithChildren(DOM)).shareReplay(1);
  const itemActions = makeItemActions(typeItemActions, amendedState$);

  const storage$ = serialize(state$)
    .map((state) => ({
      key: 'todos-cycle',
      value: state
    }));

  replicateAll(typeItemActions, itemActions, proxyItemActions);

  return {
    DOM: view(amendedState$),
    storage: storage$
  };
}

export default todos;
