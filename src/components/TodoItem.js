import {Observable} from 'rx';
import {button, div, input, label, li} from '@cycle/dom';
import {propHook, ENTER_KEY, ESC_KEY} from '../utils';

function intent(DOM) {
  return {
    delete$: DOM.select(`.destroy`).events('click')
      .map(() => true),
    toggle$: DOM.select(`.toggle`).events('change')
      .map(() => true),
    startEdit$: DOM.select(`label`).events('dblclick')
      .map(() => true),
    cancelEdit$: DOM.select(`.edit`).events('keyup')
      .filter(ev => ev.keyCode === ESC_KEY)
      .map(() => true),
    stopEdit$: DOM.select(`.edit`).events('keyup')
      .filter(ev => ev.keyCode === ENTER_KEY)
      .merge(DOM.select(`.edit`).events('blur'))
      .map(ev => ({title: ev.currentTarget.value}))
      .share()
  };
}

function model(props$, actions) {
  const sanitizedProps$ = props$.startWith({title: '', completed: false});
  const editing$ = Observable
    .merge(
      actions.startEdit$.map(() => true),
      actions.stopEdit$.map(() => false),
      actions.cancelEdit$.map(() => false)
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
  const actions = intent(DOM);
  const state$ = model(props$, actions);
  const vtree$ = view(state$);
  const action$ = Observable.merge(
    actions.toggle$.map(ev => ({type: 'toggle', ...ev})),
    actions.delete$.map(ev => ({type: 'delete', ...ev})),
    actions.stopEdit$.map(ev => ({type: 'edit', ...ev}))
  );

  return {
    DOM: vtree$,
    action$,
  };
}

export default TodoItem;
