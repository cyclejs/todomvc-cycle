import xs from 'xstream';
import isolate from '@cycle/isolate'
import intent from './intent';
import model from './model';
import view from './view';
import deserialize from './storage-source';
import serialize from './storage-sink';
import Task from '../Task/index';

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
        let props$ = xs.of(data);
        // Create scoped todo item dataflow component.
        let todoItem = isolate(Task)({DOM: DOMSource, props$});

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

// THE TASKLIST COMPONENT
// This is the TaskList component which is being exported below.
function TaskList(sources) {
  // THE LOCALSTORAGE STREAM
  // Here we create a localStorage stream that only streams
  // the first value read from localStorage in order to
  // supply the application with initial state.
  let localStorage$ = sources.storage.local.getItem('todos-cycle').take(1);
  // THE INITIAL TODO DATA
  // The `deserialize` function takes the serialized JSON stored in localStorage
  // and turns it into a stream sending a JSON object.
  let sourceTodosData$ = deserialize(localStorage$);
  // THE PROXY ITEM ACTION STREAM
  // We create a stream as a proxy for all the actions from each task.
  let proxyItemAction$ = xs.create();
  // THE INTENT (MVI PATTERN)
  // Pass relevant sources to the intent function, which set up
  // streams that model the users actions.
  let action$ = intent(sources.DOM, sources.History, proxyItemAction$);
  // THE MODEL (MVI PATTERN)
  // Actions get passed to the model function which transforms the data
  // coming through and prepares the data for the view.
  let state$ = model(action$, sourceTodosData$);
  // AMEND STATE WITH CHILDREN
  let amendedState$ = state$
    .map(amendStateWithChildren(sources.DOM))
    .remember();
  // A STREAM OF ALL ACTIONS ON ALL TASKS
  // Each todo item has an action stream. All those action streams are being
  // merged into a stream of all actions. Below this stream is passed into
  // the proxyItemAction$ that we passed to the intent function above.
  // This is how the intent on all the todo items flows back through the intent
  // function of the list and can be handled in the model function of the list.
  let itemAction$ = amendedState$
    .map(({list}) => xs.merge(...list.map(i => i.todoItem.action$)))
    .flatten();
  // PASS REAL ITEM ACTIONS TO PROXY
  // The item actions are passed to the proxy object.
  proxyItemAction$.imitate(itemAction$);
  // THE VIEW (MVI PATTERN)
  // We render state as markup for the DOM.
  let vdom$ = view(amendedState$);
  // WRITE TO LOCALSTORAGE
  // The latest state is written to localStorage.
  let storage$ = serialize(state$).map((state) => ({
    key: 'todos-cycle', value: state
  }));
  // COMPLETE THE CYCLE
  // Write the virtual dom stream to the DOM and write the
  // storage stream to localStorage.
  let sinks = {
    DOM: vdom$,
    storage: storage$,
  };
  return sinks;
}

export default TaskList;
