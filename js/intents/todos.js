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
			.filter(function (ev) { return ev.keyCode === ENTER_KEY; })
			.map(function (ev) {
				return String(ev.target.value);
			})
	}
});
