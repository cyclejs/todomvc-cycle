import {Rx} from '@cycle/core';
import {ENTER_KEY, ESC_KEY} from '../utils';

export default function intent(DOM, hashchange) {
  return {
    changeRoute$: hashchange
      .map(ev => ev.newURL.match(/\#[^\#]*$/)[0].replace('#', ''))
      .startWith(window.location.hash.replace('#', '')),

    clearInput$: DOM.get('#new-todo', 'keyup')
      .filter(ev => ev.keyCode === ESC_KEY),

    insertTodo$: DOM.get('#new-todo', 'keyup')
      .filter(ev => {
        let trimmedVal = String(ev.target.value).trim();
        return ev.keyCode === ENTER_KEY && trimmedVal;
      })
      .map(ev => String(ev.target.value).trim()),

    editTodo$: DOM.get('.todo-item', 'newContent').map(ev => ev.detail),

    toggleTodo$: DOM.get('.todo-item', 'toggle').map(ev => ev.detail),

    toggleAll$: DOM.get('#toggle-all', 'click'),

    deleteTodo$: DOM.get('.todo-item', 'destroy').map(ev => ev.detail),

    deleteCompleteds$: DOM.get('#clear-completed', 'click')
  };
};
