'use strict';
/*global Cycle */
var h = Cycle.h;

var TodosView = Cycle.createView(function (Model) {
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
				name: 'newTodo'
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
				checked: allCompleted
			}),
			h('ul#todo-list', todosData.list
				.filter(todosData.filterFn)
				.map(function (todoData) {
					return h('todo-item.todo-item', {
						todoid: todoData.id,
						content: todoData.title,
						completed: todoData.completed
					});
				})
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
				h('button#clear-completed', 'Clear completed (' + amountCompleted + ')')
				: null
			)
		])
	}

	return {
		vtree$: Model.get('todos$')
			.map(function (todosData) {
				return h('div', [
					vrenderHeader(todosData),
					vrenderMainSection(todosData),
					vrenderFooter(todosData)
				])
			})
	}
});
