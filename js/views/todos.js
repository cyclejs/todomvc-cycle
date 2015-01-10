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
			onkeyup: 'newTodoKeyUp$'
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
				onchange: 'todoToggleClicks$'
			}),
			h('label', {
				ondblclick: 'todoLabelDblClicks$'
			}, todoData.title),
			h('button.destroy', {
				onclick: 'todoDestroyClicks$'
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
			onkeyup: 'editTodoKeyUp$',
			onblur: 'editTodoBlur$'
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
			onclick: 'toggleAllClicks$'
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
				onclick: 'clearCompletedClicks$'
			}, 'Clear completed (' + amountCompleted + ')')
			: null
		)
	])
}

var TodosView = Cycle.createView(function (model) {
	return {
		vtree$: model.get('todos$')
			.map(function (todosData) {
				return h('div', [
					vrenderHeader(todosData),
					vrenderMainSection(todosData),
					vrenderFooter(todosData)
				])
			})
	}
});
