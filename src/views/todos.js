import Cycle from 'cyclejs';
let {Rx, h} = Cycle;
import {propHook} from '../utils';

function vrenderHeader(todosData) {
  return h('header#header', [
    h('h1', 'todos'),
    h('input#new-todo', {
      type: 'text',
      value: propHook(elem => elem.value = todosData.get('input')),
      attributes: {
        placeholder: 'What needs to be done?'
      },
      autofocus: true,
      name: 'newTodo'
    })
  ]);
}

function vrenderMainSection(todosData) {
  let list = todosData.get('list');
  let allCompleted = list.every(x => x.get('completed'));

  return h('section#main', {
    style: {'display': list.size ? '' : 'none'}
  }, [
    h('input#toggle-all', {
      type: 'checkbox',
      checked: allCompleted
    }),
    h('ul#todo-list', list
      .filter(todosData.get('filterFn'))
      .toJS()
      .map(todoData =>
        h('todo-item.todo-item', {
          key: todoData.id,
          todoid: todoData.id,
          content: todoData.title,
          completed: todoData.completed
        })
      )
    )
  ])
}

function vrenderFooter(todosData) {
  let list = todosData.get('list');
  let filter = todosData.get('filter');
  let amountCompleted = list.count(x => x.get('completed'));
  let amountActive = list.size - amountCompleted;

  return h('footer#footer', {
    style: {'display': list.size ? '' : 'none'}
  }, [
    h('span#todo-count', [
      h('strong', String(amountActive)),
      ' item' + (amountActive !== 1 ? 's' : '') + ' left'
    ]),
    h('ul#filters', [
      h('li', [
        h('a' + (filter === '' ? '.selected' : ''), {
          attributes: {'href': '#/'}
        }, 'All')
      ]),
      h('li', [
        h('a' + (filter === 'active' ? '.selected' : ''), {
          attributes: {'href': '#/active'}
        }, 'Active')
      ]),
      h('li', [
        h('a' + (filter === 'completed' ? '.selected' : ''), {
          attributes: {'href': '#/completed'}
        }, 'Completed')
      ])
    ]),
    (amountCompleted > 0 ?
      h('button#clear-completed', 'Clear completed (' + amountCompleted + ')')
      : null
    )
  ])
}

export default function view(todos$) {
  return todos$.map(todos =>
    h('div', [
      vrenderHeader(todos),
      vrenderMainSection(todos),
      vrenderFooter(todos)
    ])
  );
};
