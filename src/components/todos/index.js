import {Rx} from '@cycle/core';
import intent from './intent';
import model from './model';
import view from './view';
import deserialize from './local-storage-source';
import serialize from './local-storage-sink';
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

function todos({DOM, hashchange, initialHash, localStorageSource}) {
  let sourceTodosData$ = deserialize(localStorageSource);
  let typeItemActions = {toggle$: null, edit$: null, delete$: null};
  let proxyItemActions = mapValues(typeItemActions, () => new Rx.Subject());
  let actions = intent(DOM, hashchange, initialHash, proxyItemActions);
  let state$ = model(actions, sourceTodosData$).shareReplay(1);
  let amendedState$ = state$.map(amendStateWithChildren(DOM)).shareReplay(1);
  let itemActions = makeItemActions(typeItemActions, amendedState$);
  replicateAll(typeItemActions, itemActions, proxyItemActions);
  return {
    DOM: view(amendedState$),
    localStorageSink: serialize(state$)
  };
}

export default todos;
