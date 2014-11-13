'use strict';
/*global Cycle */

function getFilterFn(route) {
	switch (route) {
		case '/active':
			return function (task) { return task.completed === false; };
		case '/completed':
			return function (task) { return task.completed === true; };
		default:
			return function () { return true; }; // allow anything
	}
}

function determineTodosIndexes(todosData) {
	todosData.list.forEach(function(todoData, index) {
		todoData.index = index;
	});
	return todosData;
}

function determineFilter(todosData, route) {
	todosData.filter = route.replace('/', '').trim();
	todosData.filterFn = getFilterFn(route);
	return todosData;
}

var IntentInterface = ['insertTodo$', 'deleteTodo$', 'toggleTodo$',
	'toggleAll$', 'clearInput$', 'deleteCompleteds$', 'startEditTodo$',
	'editTodo$', 'doneEditing$', 'changeRoute$'
];

var TodosModel = Cycle.defineModel(IntentInterface, ['todosData$'],
	function (intent, initial) {
	var route$ = Rx.Observable.just('/').merge(intent.changeRoute$);

	var insertTodoMod$ = intent.insertTodo$
		.map(function (todoTitle) {
			return function (todosData) {
				todosData.list.push({
					title: todoTitle,
					completed: false,
					editing: false
				});
				todosData.input = '';
				return todosData;
			};
		});

	var startEditTodoMod$ = intent.startEditTodo$
		.map(function (todoIndex) {
			return function (todosData) {
				todosData.list.forEach(function (todoData, index) {
					todoData.editing = (index === todoIndex);
				});
				return todosData;
			}
		});

	var editTodoMod$ = intent.editTodo$
		.map(function (modObject) {
			return function (todosData) {
				todosData.list[modObject.index].title = modObject.value;
				return todosData;
			};
		});

	var stopEditingMod$ = intent.doneEditing$
		.map(function () {
			return function (todosData) {
				todosData.list.forEach(function (todoData) {
					todoData.editing = false;
				});
				todosData.list = todosData.list.filter(function (todoData) {
					return todoData.title.trim().length > 0;
				});
				return todosData;
			};
		});

	var clearInputMod$ = intent.clearInput$
		.map(function () {
			return function (todosData) {
				todosData.input = '';
				return todosData;
			}
		});

	var toggleAllMod$ = intent.toggleAll$
		.map(function () {
			return function (todosData) {
				var allAreCompleted = todosData.list.reduce(function (x, y) {
					return x && y.completed;
				}, true);
				todosData.list.forEach(function (todoData) {
					todoData.completed = allAreCompleted ? false : true;
				});
				return todosData;
			}
		});

	var toggleTodoMod$ = intent.toggleTodo$
		.map(function (todoIndex) {
			return function (todosData) {
				var previousCompleted = todosData.list[todoIndex].completed;
				todosData.list[todoIndex].completed = !previousCompleted;
				return todosData;
			}
		});

	var deleteTodoMod$ = intent.deleteTodo$
		.map(function (todoIndex) {
			return function (todosData) {
				todosData.list.splice(todoIndex, 1);
				return todosData;
			}
		});

	var deleteCompletedsMod$ = intent.deleteCompleteds$
		.map(function () {
			return function (todosData) {
				todosData.list = todosData.list.filter(function (todoData) {
					return todoData.completed === false;
				});
				return todosData
			}
		});

	var modifications$ = Rx.Observable.merge(
		insertTodoMod$, deleteTodoMod$, toggleTodoMod$, toggleAllMod$,
		clearInputMod$, deleteCompletedsMod$, startEditTodoMod$, editTodoMod$,
		stopEditingMod$
	);

	return {
		todos$: modifications$
			.merge(initial.todosData$)
			.scan(function (todosData, modification) {
				return modification(todosData);
			})
			.map(determineTodosIndexes)
			.combineLatest(route$, determineFilter)
			.publish().refCount()
	}
});
