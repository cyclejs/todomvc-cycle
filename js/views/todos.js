'use strict';
/*global Cycle */

var h = Cycle.h;

function vrenderTodoItem(todoData) {
	return h('li', [
		h('div.view', [
			h('input.toggle', {
				type: 'checkbox',
				'ev-click': 'todoToggleClicks$'
			}),
			h('label', todoData.title),
			h('button.destroy', {
				'ev-click': 'todoDestroyClicks$'
			})
		])
	])
}

function Type(fn) {
	this.fn = fn
}
Type.prototype.hook = function () {
	this.fn.apply(this, arguments)
};
function hook(fn) {
	return new Type(fn)
}

var TodosView = Cycle.defineView(['todos$'], function (model) {
	return {
		events: [
			'newTodoKeyUp$', 'toggleAllClicks$',
			'todoToggleClicks$', 'todoDestroyClicks$'
		],
		vtree$: model.todos$
			.map(function (todosData) {
				return h('div', [
					h('header#header', [
						h('h1', 'todos'),
						h('input#new-todo', {
							value: hook(function (elem, prop) {
								elem.value = todosData.input;
							}),
							attributes: {
								placeholder: 'What needs to be done?'
							},
							autofocus: true,
							name: 'newTodo',
							type: 'text',
							'ev-keyup': 'newTodoKeyUp$'
						})
					]),
					h('section#main', [
						h('input#toggle-all', {
							type: 'checkbox',
							'ev-click': 'toggleAllClicks$'
						}),
						h('ul#todo-list', todosData.list.map(vrenderTodoItem))
					])
				])
			})
	}
});
