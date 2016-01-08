import {Observable, Subject} from 'rx';
import isolate from '@cycle/isolate'
import intent from './intent';
import model from './model';
import view from './view';
import deserialize from './storage-source';
import serialize from './storage-sink';
import TodoItem from '../TodoItem';

// AMEND STATE WITH CHILDREN
// This is a callback function for a map function used below.
function amendStateWithChildren(DOMSource) {
  // For every todo item take `todosData`...
  return function (todosData) {
    // ...and return stream data as an object
    return {
      // Via the spread operator we copy all properties
      // from todosData into the object we return minus
      // the properties defined in the new object that have
      // the same key as a property in todosData.
      ...todosData,
      // The list property is the only property we are amending.
      // For every item in todosData...
      list: todosData.list.map(data => {
        // ...we create an Observable for the data item...
        const props$ = Observable.just(data);
        // ...and create a new todo item by passing the DOM stream and
        // the new props stream to it. The isolate function creates a
        // "scoped data flow component" out of every todo item.
        // For more read the docs here: https://github.com/cyclejs/isolate.
        const todoItem = isolate(TodoItem)({DOM: DOMSource, props$});
        // Here we return the new amended array data for the list array.
        return {
          // We copy the item data into the the returned object
          // via the spread operator here...
          ...data,
          // ...and add a new property called todoItem which
          // returns a todoItem DOM stream sink and a todo item
          // action stream sink.
          todoItem: {
            DOM: todoItem.DOM,
            // The action stream for the todo item is enhanced with
            // the id of the todo, in order to tell which item these actions
            // are streaming from.
            action$: todoItem.action$.map(ev => ({...ev, id: data.id}))
          }
        };
      }),
    };
  };
}

// THE MAIN FUNCTION
// This is the implementation of the `main` function that gets passed to
// Cycle's `run` function.
// The sources that have been passed to `run` as well are immediately
// deconstructed into the variables `DOM`, `hashchange`, `initialHash` & `storage`.
function Todos({DOM, hashchange, initialHash, storage}) {
  // THE LOCALSTORAGE STREAM
  // Here we create a localStorage stream that only streams
  // the first value received from localStorage because we use
  // the localStorage to "rehydrate" the app whenever we launch or refresh it.
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
  // Pass relevant sources to the intent funtion, which set up
  // streams that model the users intentions.
  const actions = intent(DOM, hashchange, initialHash, proxyItemAction$);
  // THE MODEL (MVI PATTERN)
  // Intent gets passed to the model function which transforms the data
  // coming through the intent streams and prepares the data for the view.
  const state$ = model(actions, sourceTodosData$);
  // AMEND STATE WITH CHILDREN
  // The state is being amended with the children.
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
