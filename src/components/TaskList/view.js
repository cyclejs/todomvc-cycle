import xs from 'xstream';
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
        name: 'newTodo'
      },
      hook: {
        update: (oldVNode, {elm}) => {
          if (viewState.inputShouldClear) {
            elm.value = '';
          }
        },
      },
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
    .filter(state => state.completed)
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

export default function view(viewState$) {
  return viewState$.map(viewState =>
    div([
      renderHeader(viewState),
      renderMainSection(viewState),
      renderFooter(viewState)
    ])
  );
};
