import {a, button, div, footer, h1, header, input, li,
        section, span, strong, ul} from '@cycle/dom';

function renderHeader() {
  return header('.header', [
    h1('todos'),
    input('.new-todo', {
      type: 'text',
      value: '',
      attributes: {placeholder: 'What needs to be done?'},
      autofocus: true,
      name: 'newTodo'
    })
  ]);
}

function renderMainSection(todosData) {
  let allCompleted = todosData.list.reduce((x, y) => x && y.completed, true);
  return section('.main', {
    style: {'display': todosData.list.length ? '' : 'none'}
  }, [
    input('.toggle-all', {
      type: 'checkbox',
      checked: allCompleted
    }),
    ul('.todo-list', todosData.list
      // Apply the supplied filter function.
      .filter(todosData.filterFn)
      .map(data => data.todoItem.DOM)
    )
  ])
}

function renderFooter(todosData) {
  let amountCompleted = todosData.list
    .filter(todoData => todoData.completed)
    .length;
  let amountActive = todosData.list.length - amountCompleted;
  return footer('.footer', {
    style: {'display': todosData.list.length ? '' : 'none'}
  }, [
    span('.todo-count', [
      strong(String(amountActive)),
      ' item' + (amountActive !== 1 ? 's' : '') + ' left'
    ]),
    ul('.filters', [
      li([
        a({
          attributes: {'href': '#/'},
          className: todosData.filter === '' ? '.selected' : ''
        }, 'All')
      ]),
      li([
        a({
          attributes: {'href': '#/active'},
          className: todosData.filter === 'active' ? '.selected' : ''
        }, 'Active')
      ]),
      li([
        a({
          attributes: {'href': '#/completed'},
          className: todosData.filter === 'completed' ? '.selected' : ''
        }, 'Completed')
      ])
    ]),
    (amountCompleted > 0 ?
      button('.clear-completed', 'Clear completed (' + amountCompleted + ')')
      : null
    )
  ])
}

// THE VIEW
// This function expects the stream of todosData
// from the model function and turns it into a
// virtual DOM stream that is then ultimately returned into
// the DOM sink in the index.js.
export default function view(todos$) {
  return todos$.map(todos =>
    div([
      renderHeader(),
      renderMainSection(todos),
      renderFooter(todos)
    ])
  );
};
