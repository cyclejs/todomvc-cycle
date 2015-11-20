import {Observable, Subject} from 'rx';
import isolate from '@cycle/isolate'
import intent from './intent';
import model from './model';
import view from './view';
import deserialize from './local-storage-source';
import serialize from './local-storage-sink';
import TodoItem from '../TodoItem';

function amendStateWithChildren(DOM) {
  return function (todosData) {
    return {
      list: todosData.list.map(data => {
        const props$ = Observable.just(data);
        const todoItem = isolate(TodoItem)({DOM, props$});
        return {
          id: data.id,
          title: data.title,
          completed: data.completed,
          todoItem: {
            DOM: todoItem.DOM,
            action$: todoItem.action$.map(ev => ({...ev, id: data.id}))
          }
        };
      }),
      filter: todosData.filter,
      filterFn: todosData.filterFn,
    };
  };
}

function Todos({DOM, hashchange, initialHash, localStorageSource}) {
  const sourceTodosData$ = deserialize(localStorageSource);
  const proxyItemAction$ = new Subject();
  const actions = intent(DOM, hashchange, initialHash, proxyItemAction$);
  const state$ = model(actions, sourceTodosData$);
  const amendedState$ = state$.map(amendStateWithChildren(DOM)).shareReplay(1);
  const itemAction$ = amendedState$.flatMapLatest(({list}) =>
    Observable.merge(list.map(i => i.todoItem.action$))
  );
  itemAction$.subscribe(proxyItemAction$);
  return {
    DOM: view(amendedState$),
    localStorageSink: serialize(state$)
  };
}

export default Todos;
