import xs from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import {ENTER_KEY, ESC_KEY} from '../../utils';

export default function intent(domSource, historySource) {
  const changeRouteAction$ = historySource
    .map(location => location.pathname)
    .compose(dropRepeats())
    .map(payload => ({type: 'changeRoute', payload}));

  const cancelInputAction$ = domSource
    .select('.new-todo').events('keydown')
    .filter(ev => ev.keyCode === ESC_KEY)
    .map(payload => ({type: 'cancelInput', payload}));

  const insertTodoAction$ = domSource
    .select('.new-todo').events('keydown')
    .filter(ev => {
      const trimmedVal = String(ev.target.value).trim();
      return ev.keyCode === ENTER_KEY && trimmedVal;
    })
    .map(ev => String(ev.target.value).trim())
    .map(payload => ({type: 'insertTodo', payload}));

  const toggleAllAction$ = domSource
    .select('.toggle-all').events('click')
    .map(ev => ev.target.checked)
    .map(payload => ({type: 'toggleAll', payload}));

  const deleteCompletedAction$ = domSource
    .select('.clear-completed').events('click')
    .mapTo({type: 'deleteCompleted'})

  return xs.merge(
    changeRouteAction$,
    cancelInputAction$,
    insertTodoAction$,
    toggleAllAction$,
    deleteCompletedAction$
  );
};
