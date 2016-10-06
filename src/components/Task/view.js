import {button, div, input, label, li} from '@cycle/dom';

export default function view(state$) {
  return state$.map(({title, completed, editing}) =>
    li('.todoRoot', {class: {completed, editing}}, [
      div('.view', [
        input('.toggle', {
          props: {type: 'checkbox', checked: completed},
        }),
        label(title),
        button('.destroy')
      ]),
      input('.edit', {
        props: {type: 'text'},
        hook: {
          update: (oldVNode, {elm}) => {
            elm.value = title;
            if (editing) {
              elm.focus();
              elm.selectionStart = elm.value.length;
            }
          }
        }
      })
    ])
  );
}
