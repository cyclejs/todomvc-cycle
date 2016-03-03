import {Observable, Subject} from 'rx';
import isolate from '@cycle/isolate'
import intent from './intent';
import model from './model';
import view from './view';
import deserialize from './storage-source';
import serialize from './storage-sink';
import TodoItem from '../TodoItem';

// AMEND STATE WITH CHILDREN
// This function creates the projection function
// for the map function below.
function amendStateWithChildren(DOMSource) {
  return function (todosData) {
    return {
      ...todosData,
      // The list property is the only one being amended.
      // We map over the array in the list property to
      // enhance them with the actual todo item data flow components.
      list: todosData.list.map(data => {
        // Turn the data item into an Observable
        const props$ = Observable.just(data);
        // Create scoped todo item dataflow component.
        const todoItem = isolate(TodoItem)({DOM: DOMSource, props$});

        // Return the new data item for the list property array.
        return {
          ...data,
          // This is a new property containing the DOM- and action stream of
          // the todo item.
          todoItem: {
            DOM: todoItem.DOM,
            action$: todoItem.action$.map(ev => ({...ev, id: data.id}))
          }
        };
      }),
    };
  };
}

// THE TODOS FUNCTION
// This is the Todos component which is being exported below.
// Using destructuring, we pick the sources DOM, hashchange, initialHash and storage
// from the sources object as argument.
function Todos({DOM, hashchange, initialHash, storage}) {
  // THE LOCALSTORAGE STREAM
  // Here we create a localStorage stream that only streams
  // the first value read from localStorage in order to
  // supply the application with initial state.
  const localStorage$ = storage.local.getItem('todos-cycle').take(1);
  // THE INITIAL TODO DATA
  // The `deserialize` function takes the serialized JSON stored in localStorage
  // and turns it into a stream sending a JSON object.
  const sourceTodosData$ = deserialize(localStorage$);
  // THE PROXY ITEM ACTION STREAM
  // We use an Rx.Subject as a proxy for all the actions that stream
  // from the different todo items.
  const proxyItemAction$ = new Subject();
  // THE INTENT (MVI PATTERN)
  // Pass relevant sources to the intent function, which set up
  // streams that model the users intentions.
  const actions = intent(DOM, hashchange, initialHash, proxyItemAction$);
  // THE MODEL (MVI PATTERN)
  // Actions get passed to the model function which transforms the data
  // coming through the intent streams and prepares the data for the view.
  const state$ = model(actions, sourceTodosData$);
  // AMEND STATE WITH CHILDREN
  const amendedState$ = state$.map(amendStateWithChildren(DOM)).shareReplay(1);
  // A STREAM OF ALL ACTIONS ON ALL TODOS
  // Each todo item has an action stream. All those action streams are being
  // merged into a stream of all actions. Below this stream is passed into
  // the proxyItemActions Subject that we passed to the intent function above.
  // This is how the intent on all the todo items flows back through the intent function
  // of the list and can be handled in the model function of the list.
  const itemAction$ = amendedState$.flatMapLatest(({list}) =>
    Observable.merge(list.map(i => i.todoItem.action$))
  );
  // PASS ITEM ACTIONS TO PROXY
  // The item actions are passed to the proxy object.
  itemAction$.subscribe(proxyItemAction$);
  // WRITE TO LOCALSTORAGE
  // The latest state is written to localStorage.
  const storage$ = serialize(state$).map((state) => ({
    key: 'todos-cycle', value: state
  }));
  // COMPLETE THE CYCLE
  // Write the virtual dom stream to the DOM and write the
  // storage stream to localStorage.
  return {
    DOM: view(amendedState$),
    storage: storage$,
  };
}

export default Todos;
