import {Rx} from '@cycle/core';
import {h} from '@cycle/web';
import {propHook, ENTER_KEY, ESC_KEY} from '../utils';

function todoItemComponent(drivers) {
  let intent = {
    destroy$: drivers.DOM.get('.destroy', 'click'),
    toggle$: drivers.DOM.get('.toggle', 'change'),
    startEdit$: drivers.DOM.get('label', 'dblclick'),
    stopEdit$: drivers.DOM.get('.edit', 'keyup')
      .filter(ev => ev.keyCode === ESC_KEY || ev.keyCode === ENTER_KEY)
      .merge(drivers.DOM.get('.edit', 'blur'))
      .map(ev => ev.currentTarget.value)
      .share()
  };

  const defaultProps = {todoid: 0, content: '', completed: false};
  let props$ = drivers.props.getAll().startWith(defaultProps).shareReplay(1);

  var editing$ = Rx.Observable.merge(
    intent.startEdit$.map(() => true),
    intent.stopEdit$.map(() => false)
  ).startWith(false);

  let vtree$ = Rx.Observable
    .combineLatest(props$, editing$, function({content, completed}, editing) {
      let classes = (completed ? '.completed' : '') +
        (editing ? '.editing' : '');
      return h('li.todoRoot' + classes, [
        h('div.view', [
          h('input.toggle', {
            type: 'checkbox',
            checked: propHook(elem => elem.checked = completed)
          }),
          h('label', content),
          h('button.destroy')
        ]),
        h('input.edit', {
          type: 'text',
          value: propHook(element => {
            element.value = content;
            if (editing) {
              element.focus();
              element.selectionStart = element.value.length;
            }
          })
        })
      ]);
    });

  return {
    DOM: vtree$,
    events: {
      destroy: intent.destroy$.withLatestFrom(props$, (ev, {todoid}) => todoid),
      toggle: intent.toggle$.withLatestFrom(props$, (ev, {todoid}) => todoid),
      newContent: intent.stopEdit$
        .withLatestFrom(props$, (content, {todoid}) => ({content, id: todoid}))
    }
  };
}

module.exports = todoItemComponent;
