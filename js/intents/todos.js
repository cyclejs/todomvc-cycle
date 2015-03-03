'use strict';
/*global Cycle */

var TodosIntent = Cycle.createIntent(function (User) {
	function toEmptyString() {
		return '';
	}

	return {
		changeRoute$: Rx.Observable.fromEvent(window, 'hashchange')
			.map(function (event) {
				return event.newURL.match(/\#[^\#]*$/)[0].replace('#', '');
			})
			.startWith(window.location.hash.replace('#', '')),
		clearInput$: User.event$('#new-todo', 'keyup')
			.filter(function (ev) { return ev.keyCode === ESC_KEY; })
			.map(toEmptyString),
		insertTodo$: User.event$('#new-todo', 'keyup')
			.filter(function (ev) {
				var trimmedVal = String(ev.target.value).trim();
				return ev.keyCode === ENTER_KEY && trimmedVal;
			})
			.map(function (ev) {
				return String(ev.target.value).trim();
			}),
		editTodo$: User.event$('.todo-item', 'newContent')
			.map(function (ev) { return ev.data; }),
		toggleTodo$: User.event$('.todo-item', 'toggle')
			.map(function (ev) { return ev.data; }),
		toggleAll$: User.event$('#toggle-all', 'click').map(toEmptyString),
		deleteTodo$: User.event$('.todo-item', 'destroy')
			.map(function (ev) { return ev.data; }),
		deleteCompleteds$: User.event$('#clear-completed', 'click').map(toEmptyString)
	}
});
