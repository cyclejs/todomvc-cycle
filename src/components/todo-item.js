import {Rx} from '@cycle/core';
import {h} from '@cycle/web';
import {propHook, ENTER_KEY, ESC_KEY} from '../utils';

function intent(DOM, name = '') {
  return {
    delete$: DOM.get(`${name} .destroy`, 'click').map(() => ({name})),
    toggle$: DOM.get(`${name} .toggle`, 'change').map(() => ({name})),
    startEdit$: DOM.get(`${name} label`, 'dblclick').map(() => ({name})),
    cancelEdit$: DOM.get(`${name} .edit`, 'keyup')
      .filter(ev => ev.keyCode === ESC_KEY)
      .map(() => ({name})),
    stopEdit$: DOM.get(`${name} .edit`, 'keyup')
      .filter(ev => ev.keyCode === ENTER_KEY)
      .merge(DOM.get(`${name} .edit`, 'blur'))
      .map(ev => ({title: ev.currentTarget.value, name}))
      .share()
  };
}

function model(props$, actions) {
  let sanitizedProps$ = props$.startWith({title: '', completed: false});
  let editing$ = Rx.Observable
    .merge(
      actions.startEdit$.map(() => true),
      actions.stopEdit$.map(() => false),
      actions.cancelEdit$.map(() => false)
    )
    .startWith(false);
  return Rx.Observable.combineLatest(
    sanitizedProps$, editing$,
    ({title, completed}, editing) =>
    ({title, completed, editing})
  );
}

function view(state$, name = '') {
  return state$.map(({title, completed, editing}) => {
    const completedClass = (completed ? '.completed' : '');
    const editingClass = (editing ? '.editing' : '');
    return h(`li.todoRoot${name}${completedClass}${editingClass}`, [
      h('div.view', [
        h('input.toggle', {
          type: 'checkbox',
          checked: propHook(elem => elem.checked = completed)
        }),
        h('label', title),
        h('button.destroy')
      ]),
      h('input.edit', {
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

function todoItem({DOM, props$}, name = '') {
  let actions = intent(DOM, name);
  let state$ = model(props$, actions);
  let vtree$ = view(state$, name);
  return {
    DOM: vtree$,
    toggle$: actions.toggle$,
    delete$: actions.delete$,
    edit$: actions.stopEdit$,
  };
}

export default todoItem;
