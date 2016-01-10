import {Observable} from 'rx';
import {button, div, input, label, li} from '@cycle/dom';
import {propHook, ENTER_KEY, ESC_KEY} from '../utils';

// THE TODO ITEM INTENT
// This intent function returns a stream of all the different,
// actions that can be taken on a todo.
function intent(DOM) {
  // THE INTENT MERGE
  // Merge all actions into one stream.
  return Observable.merge(
    // THE DESTROY ACTION STREAM
    DOM.select('.destroy').events('click').map(() => ({type: 'destroy'})),
    // THE TOGGLE ACTION STREAM
    DOM.select('.toggle').events('change').map(() => ({type: 'toggle'})),
    // THE START EDIT ACTION STREAM
    DOM.select('label').events('dblclick').map(() => ({type: 'startEdit'})),
    // THE ESC KEY ACTION STREAM
    DOM.select('.edit').events('keyup')
      .filter(ev => ev.keyCode === ESC_KEY)
      .map(() => ({type: 'cancelEdit'})),
    // THE ENTER KEY ACTION STREAM
    DOM.select('.edit').events('keyup')
      .filter(ev => ev.keyCode === ENTER_KEY)
      .merge(DOM.select('.edit').events('blur', true))
      .map(ev => ({title: ev.target.value, type: 'doneEdit'}))
  )
  // MAKE THIS OBSERVABLE HOT
  // By sharing it will act as a hot Observable.
  .share();
}

function model(props$, action$) {
  // THE SANITIZED PROPERTIES
  // If the list item has no data set it as empty and not completed.
  const sanitizedProps$ = props$.startWith({title: '', completed: false});
  // THE EDITING STREAM
  // Create a stream that emits booleans that represent the
  // "is editing" state.
  const editing$ = Observable
    .merge(
      action$.filter(a => a.type === 'startEdit').map(() => true),
      action$.filter(a => a.type === 'doneEdit').map(() => false),
      action$.filter(a => a.type === 'cancelEdit').map(() => false)
    )
    .startWith(false);
  return Observable.combineLatest(
    sanitizedProps$, editing$,
    ({title, completed}, editing) => ({title, completed, editing})
  );
}

function view(state$) {
  return state$.map(({title, completed, editing}) => {
    const completedClass = (completed ? '.completed' : '');
    const editingClass = (editing ? '.editing' : '');
    return li(`.todoRoot${completedClass}${editingClass}`, [
      div('.view', [
        input('.toggle', {
          type: 'checkbox',
          checked: propHook(elem => elem.checked = completed)
        }),
        label(title),
        button('.destroy')
      ]),
      input('.edit', {
        type: 'text',
        value: propHook(element => {
          element.value = title;
          if (editing) {
            element.focus();
            element.selectionStart = element.value.length;
          }
        })
      })
    ]);
  });
}

// THE TODO ITEM FUNCTION
// This is a simple todo item component,
// structured with the MVI-pattern.
function TodoItem({DOM, props$}) {
  const action$ = intent(DOM);
  const state$ = model(props$, action$);
  const vtree$ = view(state$);

  return {
    DOM: vtree$,
    action$,
  };
}

export default TodoItem;
