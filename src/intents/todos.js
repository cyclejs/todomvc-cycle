'use strict';
import {Rx} from '@cycle/core';
import {ENTER_KEY, ESC_KEY} from '../utils';

export default function intent(domDriver) {
  return {
    changeRoute$: Rx.Observable.fromEvent(window, 'hashchange')
      .map(ev => ev.newURL.match(/\#[^\#]*$/)[0].replace('#', ''))
      .startWith(window.location.hash.replace('#', '')),

    clearInput$: domDriver.get('#new-todo', 'keyup')
      .filter(ev => ev.keyCode === ESC_KEY),

    insertTodo$: domDriver.get('#new-todo', 'keyup')
      .filter(ev => {
        let trimmedVal = String(ev.target.value).trim();
        return ev.keyCode === ENTER_KEY && trimmedVal;
      })
      .map(ev => String(ev.target.value).trim()),

    editTodo$: domDriver.get('.todo-item', 'newContent').map(ev => ev.detail),

    toggleTodo$: domDriver.get('.todo-item', 'toggle').map(ev => ev.detail),

    toggleAll$: domDriver.get('#toggle-all', 'click'),

    deleteTodo$: domDriver.get('.todo-item', 'destroy').map(ev => ev.detail),

    deleteCompleteds$: domDriver.get('#clear-completed', 'click')
  };
};
