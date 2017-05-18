import xs from 'xstream';
import {
  a, button, div, footer, h1, header, input, li, section, span, strong, ul
} from '@cycle/dom';

function renderHeader(state) {
  return header('.header', [
    h1('todos'),
    input('.new-todo', {
      props: {
        type: 'text',
        placeholder: 'What needs to be done?',
        autofocus: true,
        name: 'newTodo',
        value: state.inputValue
      }
    })
  ]);
}

function renderMainSection(state, listVDom) {
  const allCompleted = state.list.reduce((x, y) => x && y.completed, true);
  const sectionStyle = {'display': state.list.length ? '' : 'none'};

  return section('.main', {style: sectionStyle}, [
    input('.toggle-all', {
      props: {type: 'checkbox', checked: allCompleted},
    }),
    listVDom
  ]);
}

function renderFilterButton(state, filterTag, path, label) {
  return li([
    a({
      attrs: {href: path},
      class: {selected: state.filter === filterTag}
    }, label)
  ]);
}

function renderFooter(state) {
  const amountCompleted = state.list
    .filter(task => task.completed)
    .length;
  const amountActive = state.list.length - amountCompleted;
  const footerStyle = {'display': state.list.length ? '' : 'none'};

  return footer('.footer', {style: footerStyle}, [
    span('.todo-count', [
      strong(String(amountActive)),
      ' item' + (amountActive !== 1 ? 's' : '') + ' left'
    ]),
    ul('.filters', [
      renderFilterButton(state, '', '/', 'All'),
      renderFilterButton(state, 'active', '/active', 'Active'),
      renderFilterButton(state, 'completed', '/completed', 'Completed'),
    ]),
    (amountCompleted > 0 ?
      button('.clear-completed', 'Clear completed (' + amountCompleted + ')')
      : null
    )
  ])
}

export default function view(state$, listVDom$) {
  return xs.combine(state$, listVDom$).map(([state, listVDom]) =>
    div([
      renderHeader(state),
      renderMainSection(state, listVDom),
      renderFooter(state)
    ])
  );
};
