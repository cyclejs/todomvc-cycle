import {Observable} from 'rx';
import {ENTER_KEY, ESC_KEY} from '../../utils';

export default function intent(DOM, hashchange, initialHash, itemActions) {
  return {
    changeRoute$: Observable.concat(
      initialHash.map(hash => hash.replace('#', '')),
      hashchange.map(ev => ev.newURL.match(/\#[^\#]*$/)[0].replace('#', ''))
    ),

    clearInput$: DOM.select('.new-todo').events('keydown')
      .filter(ev => ev.keyCode === ESC_KEY),

    insertTodo$: DOM.select('.new-todo').events('keydown')
      .filter(ev => {
        let trimmedVal = String(ev.target.value).trim();
        return ev.keyCode === ENTER_KEY && trimmedVal;
      })
      .map(ev => String(ev.target.value).trim()),

    toggleTodo$: itemActions.toggle$,

    deleteTodo$: itemActions.delete$,

    editTodo$: itemActions.edit$.map(({title}) => ({title})),

    toggleAll$: DOM.select('.toggle-all').events('click'),

    deleteCompleteds$: DOM.select('.clear-completed').events('click')
  };
};
