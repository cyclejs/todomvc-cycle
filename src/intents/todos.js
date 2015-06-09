import Cycle from 'cyclejs';
import {ENTER_KEY, ESC_KEY} from '../utils';

export default function intent(interactions) {
  return {
    changeRoute$: Cycle.Rx.Observable.fromEvent(window, 'hashchange')
      .map(ev => ev.newURL.match(/\#[^\#]*$/)[0].replace('#', ''))
      .startWith(window.location.hash.replace('#', '')),

    clearInput$: interactions.get('#new-todo', 'keyup')
      .filter(ev => ev.keyCode === ESC_KEY),

    insertTodo$: interactions.get('#new-todo', 'keyup')
      .filter(ev => {
        let trimmedVal = String(ev.target.value).trim();
        return ev.keyCode === ENTER_KEY && trimmedVal;
      })
      .map(ev => String(ev.target.value).trim()),

    editTodo$: interactions.get('.todo-item', 'newContent').map(ev => ev.data),

    toggleTodo$: interactions.get('.todo-item', 'toggle').map(ev => ev.data),

    toggleAll$: interactions.get('#toggle-all', 'click'),

    deleteTodo$: interactions.get('.todo-item', 'destroy').map(ev => ev.data),

    deleteCompleteds$: interactions.get('#clear-completed', 'click')
  };
};
