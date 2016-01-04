import {Observable, Subject} from 'rx';
import isolate from '@cycle/isolate'
import intent from './intent';
import model from './model';
import view from './view';
import deserialize from './storage-source';
import serialize from './storage-sink';
import TodoItem from '../TodoItem';

function amendStateWithChildren(DOMSource) {
  return function (todosData) {
    return {
      ...todosData,
      list: todosData.list.map(data => {
        const props$ = Observable.just(data);
        const todoItem = isolate(TodoItem)({DOM: DOMSource, props$});
        return {
          ...data,
          todoItem: {
            DOM: todoItem.DOM,
            action$: todoItem.action$.map(ev => ({...ev, id: data.id}))
          }
        };
      }),
    };
  };
}

function Todos({DOM, hashchange, initialHash, storage}) {
  const localStorage$ = storage.local.getItem('todos-cycle').take(1);
  const sourceTodosData$ = deserialize(localStorage$);
  const proxyItemAction$ = new Subject();
  const actions = intent(DOM, hashchange, initialHash, proxyItemAction$);
  const state$ = model(actions, sourceTodosData$);
  const amendedState$ = state$.map(amendStateWithChildren(DOM)).shareReplay(1);
  const itemAction$ = amendedState$.flatMapLatest(({list}) =>
    Observable.merge(list.map(i => i.todoItem.action$))
  );
  itemAction$.subscribe(proxyItemAction$);
  const storage$ = serialize(state$).map((state) => ({
    key: 'todos-cycle', value: state
  }));
  return {
    DOM: view(amendedState$),
    storage: storage$,
  };
}

export default Todos;
