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

var TodosIntent = Cycle.createIntent(function (User) {
	return {
		changeRoute$: Rx.Observable.fromEvent(window, 'hashchange')
			.map(function (event) {
				return event.newURL.match(/\#[^\#]*$/)[0].replace('#', '');
			})
			.startWith(window.location.hash.replace('#', '')),
		insertTodo$: User.event$('#new-todo', 'keyup')
			.filter(function (ev) {
				var trimmedVal = String(ev.target.value).trim();
				return ev.keyCode === ENTER_KEY && trimmedVal;
			})
			.map(function (ev) {
				return String(ev.target.value).trim();
			}),
		deleteTodo$: User.event$('.destroy', 'click').map(getParentTodoId),
		deleteCompleteds$: User.event$('#clear-completed', 'click').map(toEmptyString),
		toggleTodo$: User.event$('.toggle', 'change').map(getParentTodoId),
		toggleAll$: User.event$('#toggle-all', 'click').map(toEmptyString),
		startEditTodo$: User.event$('label', 'dblclick').map(getParentTodoId),
		editTodo$: User.event$('.edit', 'keyup')
			.map(function (ev) {
				return {value: ev.target.value, index: getParentTodoId(ev)};
			}),
		doneEditing$: User.event$('.edit', 'keyup')
			.filter(function (ev) {
				return ev.keyCode === ESC_KEY || ev.keyCode === ENTER_KEY;
			})
			.merge(User.event$('.edit', 'blur'))
			.map(toEmptyString),
		clearInput$: User.event$('#new-todo', 'keyup')
			.filter(function (ev) { return ev.keyCode === ESC_KEY; })
			.map(toEmptyString)
	}
});
