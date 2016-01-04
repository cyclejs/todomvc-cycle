import {Observable} from 'rx';
import {button, div, input, label, li} from '@cycle/dom';
import {propHook, ENTER_KEY, ESC_KEY} from '../utils';

function intent(DOM) {
  return Observable.merge(
    DOM.select('.destroy').events('click').map(() => ({type: 'destroy'})),

    DOM.select('.toggle').events('change').map(() => ({type: 'toggle'})),

    DOM.select('label').events('dblclick').map(() => ({type: 'startEdit'})),

    DOM.select('.edit').events('keyup')
      .filter(ev => ev.keyCode === ESC_KEY)
      .map(() => ({type: 'cancelEdit'})),

    DOM.select('.edit').events('keyup')
      .filter(ev => ev.keyCode === ENTER_KEY)
      .merge(DOM.select('.edit').events('blur', true))
      .map(ev => ({title: ev.target.value, type: 'doneEdit'}))
  ).share();
}

function model(props$, action$) {
  const sanitizedProps$ = props$.startWith({title: '', completed: false});
  const editing$ = Observable
    .merge(
      action$.filter(a => a.type === 'startEdit').map(() => true),
      action$.filter(a => a.type === 'doneEdit').map(() => false),
      action$.filter(a => a.type === 'cancelEdit').map(() => false)
    )
    .startWith(false);
  return Observable.combineLatest(
    sanitizedProps$, editing$,
    ({title, completed}, editing) =>
    ({title, completed, editing})
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
