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

var ViewInterface = ['newTodoKeyUp$', 'clearCompletedClicks$', 'editTodoKeyUp$',
	'editTodoBlur$', 'toggleAllClicks$', 'todoToggleClicks$',
	'todoLabelDblClicks$', 'todoDestroyClicks$'
];

var TodosIntent = Cycle.defineIntent(ViewInterface, function (view) {
	return {
		changeRoute$: Rx.Observable.fromEvent(window, 'hashchange')
			.map(function (event) {
				return event.newURL.match(/\#[^\#]*$/)[0].replace('#', '');
			})
			.startWith(window.location.hash.replace('#', '')),
		insertTodo$: view.newTodoKeyUp$
			.filter(function (ev) {
				var trimmedVal = String(ev.target.value).trim();
				return ev.keyCode === ENTER_KEY && trimmedVal;
			})
			.map(function (ev) {
				return String(ev.target.value).trim();
			}),
		deleteTodo$: view.todoDestroyClicks$.map(getParentTodoId),
		deleteCompleteds$: view.clearCompletedClicks$.map(toEmptyString),
		toggleTodo$: view.todoToggleClicks$.map(getParentTodoId),
		toggleAll$: view.toggleAllClicks$.map(toEmptyString),
		startEditTodo$: view.todoLabelDblClicks$.map(getParentTodoId),
		editTodo$: view.editTodoKeyUp$
			.map(function (ev) {
				return {value: ev.target.value, index: getParentTodoId(ev)};
			}),
		doneEditing$: view.editTodoKeyUp$
			.filter(function (ev) {
				return ev.keyCode === ESC_KEY || ev.keyCode === ENTER_KEY;
			})
			.merge(view.editTodoBlur$)
			.map(toEmptyString),
		clearInput$: view.newTodoKeyUp$
			.filter(function (ev) { return ev.keyCode === ESC_KEY; })
			.map(toEmptyString)
	}
});
