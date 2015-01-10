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

// Rx's missing golden operator
function withLatest(A$, B$, combineFunc) {
	var hotA$ = A$.publish().refCount();
	return B$
		.map(function (b) {
			return hotA$.map(function (a) { return combineFunc(a, b); });
		})
		.switch();
}

var TodosModel = Cycle.createModel(function (intent, initial) {
	var route$ = Rx.Observable.just('/').merge(intent.get('changeRoute$'));

	var insertTodoMod$ = intent.get('insertTodo$')
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

	var startEditTodoMod$ = intent.get('startEditTodo$')
		.map(function (todoIndex) {
			return function (todosData) {
				todosData.list.forEach(function (todoData, index) {
					todoData.editing = (index === todoIndex);
				});
				return todosData;
			}
		});

	var editTodoMod$ = intent.get('editTodo$')
		.map(function (modObject) {
			return function (todosData) {
				todosData.list[modObject.index].title = modObject.value;
				return todosData;
			};
		});

	var stopEditingMod$ = withLatest(intent.get('doneEditing$'), editTodoMod$,
		function(d, editMod) {
			return function (todosData) {
				todosData.list.forEach(function (todoData) {
					todoData.editing = false;
				});
				todosData.list = todosData.list.filter(function (todoData) {
					return todoData.title.trim().length > 0;
				});
				return editMod(todosData);
			};
		});

	var clearInputMod$ = intent.get('clearInput$')
		.map(function () {
			return function (todosData) {
				todosData.input = '';
				return todosData;
			}
		});

	var toggleAllMod$ = intent.get('toggleAll$')
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

	var toggleTodoMod$ = intent.get('toggleTodo$')
		.map(function (todoIndex) {
			return function (todosData) {
				var previousCompleted = todosData.list[todoIndex].completed;
				todosData.list[todoIndex].completed = !previousCompleted;
				return todosData;
			}
		});

	var deleteTodoMod$ = intent.get('deleteTodo$')
		.map(function (todoIndex) {
			return function (todosData) {
				todosData.list.splice(todoIndex, 1);
				return todosData;
			}
		});

	var deleteCompletedsMod$ = intent.get('deleteCompleteds$')
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
		clearInputMod$, deleteCompletedsMod$, startEditTodoMod$,
		stopEditingMod$
	);

	return {
		todos$: modifications$
			.merge(initial.get('todosData$'))
			.scan(function (todosData, modification) {
				return modification(todosData);
			})
			.map(determineTodosIndexes)
			.combineLatest(route$, determineFilter)
			.publish().refCount()
	}
});
