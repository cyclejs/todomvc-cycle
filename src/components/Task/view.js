import {button, div, input, label, li} from '@cycle/dom';

function view(state$) {
  return state$.map(({title, isCompleted, isEditing}) => {
    let todoRootClasses = {
      completed: isCompleted,
      editing: isEditing,
    };

    return li('.todoRoot', {class: todoRootClasses}, [
      div('.view', [
        input('.toggle', {
          props: {type: 'checkbox', checked: isCompleted},
        }),
        label(title),
        button('.destroy')
      ]),
      input('.edit', {
        props: {type: 'text'},
        hook: {
          update: (oldVNode, {elm}) => {
            elm.value = title;
            if (isEditing) {
              elm.focus();
              elm.selectionStart = elm.value.length;
            }
          }
        }
      })
    ]);
  });
}

export default view;
