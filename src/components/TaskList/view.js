import {
  a, button, div, footer, h1, header, input, li, section, span, strong, ul
} from '@cycle/dom';

function renderHeader(viewState) {
  return header('.header', [
    h1('todos'),
    input('.new-todo', {
      props: {
        type: 'text',
        placeholder: 'What needs to be done?',
        autofocus: true,
        name: 'newTodo',
        value: viewState.inputValue
      }
    })
  ]);
}

function renderMainSection(viewState) {
  const allCompleted = viewState.list.reduce((x, y) => x && y.completed, true);
  const sectionStyle = {'display': viewState.list.length ? '' : 'none'};

  return section('.main', {style: sectionStyle}, [
    input('.toggle-all', {
      props: {type: 'checkbox', checked: allCompleted},
    }),
    ul('.todo-list', viewState.taskVNodes)
  ]);
}

function renderFilterButton(viewState, filterTag, path, label) {
  return li([
    a({
      attrs: {href: path},
      class: {selected: viewState.filter === filterTag}
    }, label)
  ]);
}

function renderFooter(viewState) {
  const amountCompleted = viewState.list
    .filter(viewState => viewState.completed)
    .length;
  const amountActive = viewState.list.length - amountCompleted;
  const footerStyle = {'display': viewState.list.length ? '' : 'none'};

  return footer('.footer', {style: footerStyle}, [
    span('.todo-count', [
      strong(String(amountActive)),
      ' item' + (amountActive !== 1 ? 's' : '') + ' left'
    ]),
    ul('.filters', [
      renderFilterButton(viewState, '', '/', 'All'),
      renderFilterButton(viewState, 'active', '/active', 'Active'),
      renderFilterButton(viewState, 'completed', '/completed', 'Completed'),
    ]),
    (amountCompleted > 0 ?
      button('.clear-completed', 'Clear completed (' + amountCompleted + ')')
      : null
    )
  ])
}

export default function view(viewState$) {
  return viewState$.map(viewState =>
    div([
      renderHeader(viewState),
      renderMainSection(viewState),
      renderFooter(viewState)
    ])
  );
};
