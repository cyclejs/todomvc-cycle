import {Rx} from '@cycle/core';
import {h} from '@cycle/dom';

function renderHeader() {
  return h('header.header', [
    h('h1', 'todos'),
    h('input.new-todo', {
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
  return h('section.main', {
    style: {'display': todosData.list.length ? '' : 'none'}
  }, [
    h('input.toggle-all', {
      type: 'checkbox',
      checked: allCompleted
    }),
    h('ul.todo-list', todosData.list
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
  return h('footer.footer', {
    style: {'display': todosData.list.length ? '' : 'none'}
  }, [
    h('span.todo-count', [
      h('strong', String(amountActive)),
      ' item' + (amountActive !== 1 ? 's' : '') + ' left'
    ]),
    h('ul.filters', [
      h('li', [
        h('a' + (todosData.filter === '' ? '.selected' : ''), {
          attributes: {'href': '#/'}
        }, 'All')
      ]),
      h('li', [
        h('a' + (todosData.filter === 'active' ? '.selected' : ''), {
          attributes: {'href': '#/active'}
        }, 'Active')
      ]),
      h('li', [
        h('a' + (todosData.filter === 'completed' ? '.selected' : ''), {
          attributes: {'href': '#/completed'}
        }, 'Completed')
      ])
    ]),
    (amountCompleted > 0 ?
      h('button.clear-completed', 'Clear completed (' + amountCompleted + ')')
      : null
    )
  ])
}

export default function view(todos$) {
  return todos$.map(todos =>
    h('div', [
      renderHeader(),
      renderMainSection(todos),
      renderFooter(todos)
    ])
  );
};
