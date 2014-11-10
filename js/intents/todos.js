'use strict';
/*global Cycle */

var ViewInterface = [
	'newTodoKeyUp$',
	'toggleAllClicks$',
	'todoToggleClicks$',
	'todoDestroyClicks$'
];

var ENTER_KEY = 13;

var TodosIntent = Cycle.defineIntent(ViewInterface, function (view) {
	return {
		insertTodo$: view.newTodoKeyUp$
			.filter(function (ev) {
				var trimmedVal = String(ev.target.value).trim();
				return ev.keyCode === ENTER_KEY && trimmedVal;
			})
			.map(function (ev) {
				return String(ev.target.value).trim();
			}),
		deleteTodo$: view.todoDestroyClicks$
			.map(function (ev) {
				return Number(ev.target.attributes['data-todo-id'].value);
			})
	}
});
