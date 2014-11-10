'use strict';
/*global Cycle */

var h = Cycle.h;

function vrenderHeader(todosData) {
	return h('header#header', [
		h('h1', 'todos'),
		h('input#new-todo', {
			value: Cycle.vdomPropHook(function (elem, prop) {
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
	]);
}

function vrenderTodoItem(todoData, index) {
	var classes = todoData.completed ? '.completed' : '';
	return h('li.todo' + classes, {
		attributes: {'data-todo-id': String(index)}
	}, [
		h('div.view', [
			h('input.toggle', {
				type: 'checkbox',
				checked: todoData.completed,
				'ev-click': 'todoToggleClicks$'
			}),
			h('label', todoData.title),
			h('button.destroy', {
				'ev-click': 'todoDestroyClicks$'
			})
		])
	])
}

function vrenderMainSection(todosData) {
	var allCompleted = todosData.list.reduce(function (x, y) {
		return x && y.completed;
	}, true);
	return h('section#main', {
		style: {'display': todosData.list.length ? '' : 'none'}
	}, [
		h('input#toggle-all', {
			type: 'checkbox',
			checked: allCompleted,
			'ev-click': 'toggleAllClicks$'
		}),
		h('ul#todo-list', todosData.list.map(vrenderTodoItem))
	])
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
					vrenderHeader(todosData),
					vrenderMainSection(todosData)
				])
			})
	}
});
