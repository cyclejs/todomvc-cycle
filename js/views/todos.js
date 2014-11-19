'use strict';
/*global Cycle */

var h = Cycle.h;

function vrenderHeader(todosData) {
	return h('header#header', [
		h('h1', 'todos'),
		h('input#new-todo', {
			type: 'text',
			value: Cycle.vdomPropHook(function (elem) {
				elem.value = todosData.input;
			}),
			attributes: {
				placeholder: 'What needs to be done?'
			},
			autofocus: true,
			name: 'newTodo',
			'ev-keyup': 'newTodoKeyUp$'
		})
	]);
}

function vrenderTodoItem(todoData) {
	var classes = (todoData.completed ? '.completed' : '') +
		(todoData.editing ? '.editing' : '');
	return h('li.todo' + classes, {
		attributes: {'data-todo-id': String(todoData.index)}
	}, [
		h('div.view', [
			h('input.toggle', {
				type: 'checkbox',
				checked: Cycle.vdomPropHook(function (elem) {
					elem.checked = todoData.completed;
				}),
				'ev-change': 'todoToggleClicks$'
			}),
			h('label', {
				'ev-dblclick': 'todoLabelDblClicks$'
			}, todoData.title),
			h('button.destroy', {
				'ev-click': 'todoDestroyClicks$'
			})
		]),
		h('input.edit', {
			type: 'text',
			value: Cycle.vdomPropHook(function (element) {
				element.value = todoData.title;
				if (todoData.editing) {
					element.focus();
					element.selectionStart = element.value.length;
				}
			}),
			'ev-keyup': 'editTodoKeyUp$',
			'ev-blur': 'editTodoBlur$'
		})
	]);
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
		h('ul#todo-list', todosData.list
			.filter(todosData.filterFn)
			.map(vrenderTodoItem)
		)
	])
}

function vrenderFooter(todosData) {
	var amountCompleted = todosData.list.filter(function (todoData) {
		return todoData.completed;
	}).length;
	var amountActive = todosData.list.length - amountCompleted;
	return h('footer#footer', {
		style: {'display': todosData.list.length ? '' : 'none'}
	}, [
		h('span#todo-count', [
			h('strong', String(amountActive)),
			' item' + (amountActive !== 1 ? 's' : '') + ' left'
		]),
		h('ul#filters', [
			h('li', [
				h('a' + (todosData.filter === '' ? '.selected' : ''), {
					attributes: {'href': '#/'}
				}, 'All')
			]),
			h('li', [
				h('a' + (todosData.filter === 'active' ? '.selected' : ''), {
					attributes: {'href': '#/active'}
				}, 'Active')
			]),
			h('li', [
				h('a' + (todosData.filter === 'completed' ? '.selected' : ''), {
					attributes: {'href': '#/completed'}
				}, 'Completed')
			])
		]),
		(amountCompleted > 0 ?
			h('button#clear-completed', {
				'ev-click': 'clearCompletedClicks$'
			}, 'Clear completed (' + amountCompleted + ')')
			: null
		)
	])
}

var TodosView = Cycle.createView(['todos$'], function (model) {
	return {
		events: [
			'newTodoKeyUp$', 'toggleAllClicks$', 'clearCompletedClicks$',
			'todoToggleClicks$', 'todoDestroyClicks$', 'todoLabelDblClicks$',
			'editTodoKeyUp$', 'editTodoBlur$'
		],
		vtree$: model.todos$
			.map(function (todosData) {
				return h('div', [
					vrenderHeader(todosData),
					vrenderMainSection(todosData),
					vrenderFooter(todosData)
				])
			})
	}
});
