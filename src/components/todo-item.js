'use strict';
import Cycle from 'cyclejs';
let {Rx, h} = Cycle;
import {propHook, ENTER_KEY, ESC_KEY} from '../utils';

Cycle.registerCustomElement('todo-item', function (interactions, props) {
  let intent = {
    destroy$: interactions.get('.destroy', 'click'),
    toggle$: interactions.get('.toggle', 'change'),
    startEdit$: interactions.get('label', 'dblclick'),
    stopEdit$: interactions.get('.edit', 'keyup')
      .filter(ev => ev.keyCode === ESC_KEY || ev.keyCode === ENTER_KEY)
      .merge(interactions.get('.edit', 'blur'))
      .map(ev => ev.currentTarget.value)
      .share()
  };

  let propId$ = props.get('todoid').startWith(0).shareReplay(1);
  let propContent$ = props.get('content').startWith('');
  let propCompleted$ = props.get('completed').startWith(false);

  var editing$ = Rx.Observable.merge(
    intent.startEdit$.map(() => true),
    intent.stopEdit$.map(() => false)
  ).startWith(false);

  let vtree$ = Rx.Observable
    .combineLatest(propId$, propContent$, propCompleted$, editing$,
      function(id, content, completed, editing) {
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
      }
    );

  return {
    vtree$,
    destroy$: intent.destroy$.withLatestFrom(propId$, (ev, id) => id),
    toggle$: intent.toggle$.withLatestFrom(propId$, (ev, id) => id),
    newContent$: intent.stopEdit$
      .withLatestFrom(propId$, (content, id) => ({content, id}))
  };
});