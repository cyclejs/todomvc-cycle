'use strict';
/*global Cycle */

var ENTER_KEY = 13;
var ESC_KEY = 27;

function getParentTodo(element) {
	var elementTag = element.tagName.toLowerCase();
	if (elementTag === 'li' && element.classList.contains('todo')) {
		return element;
	} else if (elementTag === 'body') {
		return null;
	} else {
		return getParentTodo(element.parentNode);
	}
}

function getParentTodoId(event) {
	var todoEl = getParentTodo(event.target);
	return Number(todoEl.attributes['data-todo-id'].value);
}

function toEmptyString() {
	return '';
}

var TodosIntent = Cycle.createIntent(function (view) {
	return {
		changeRoute$: Rx.Observable.fromEvent(window, 'hashchange')
			.map(function (event) {
				return event.newURL.match(/\#[^\#]*$/)[0].replace('#', '');
			})
			.startWith(window.location.hash.replace('#', '')),
		insertTodo$: view.get('newTodoKeyUp$')
			.filter(function (ev) {
				var trimmedVal = String(ev.target.value).trim();
				return ev.keyCode === ENTER_KEY && trimmedVal;
			})
			.map(function (ev) {
				return String(ev.target.value).trim();
			}),
		deleteTodo$: view.get('todoDestroyClicks$').map(getParentTodoId),
		deleteCompleteds$: view.get('clearCompletedClicks$').map(toEmptyString),
		toggleTodo$: view.get('todoToggleClicks$').map(getParentTodoId),
		toggleAll$: view.get('toggleAllClicks$').map(toEmptyString),
		startEditTodo$: view.get('todoLabelDblClicks$').map(getParentTodoId),
		editTodo$: view.get('editTodoKeyUp$')
			.map(function (ev) {
				return {value: ev.target.value, index: getParentTodoId(ev)};
			}),
		doneEditing$: view.get('editTodoKeyUp$')
			.filter(function (ev) {
				return ev.keyCode === ESC_KEY || ev.keyCode === ENTER_KEY;
			})
			.merge(view.get('editTodoBlur$'))
			.map(toEmptyString),
		clearInput$: view.get('newTodoKeyUp$')
			.filter(function (ev) { return ev.keyCode === ESC_KEY; })
			.map(toEmptyString)
	}
});
