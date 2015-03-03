'use strict';
/*global Cycle */

var TodosModel = Cycle.createModel(function (Intent, Initial) {
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

	function searchTodoIndex(todosList, todoid) {
		var top = todosList.length;
		var bottom = 0;
		var pointerId;
		var index;
		while (true) { // binary search
			index = bottom + ((top - bottom) >> 1);
			pointerId = todosList[index].id;
			if (pointerId === todoid) {
				return index;
			} else if (pointerId < todoid) {
				bottom = index;
			} else if (pointerId > todoid) {
				top = index;
			}
		}
	}

	function determineFilter(todosData, route) {
		todosData.filter = route.replace('/', '').trim();
		todosData.filterFn = getFilterFn(route);
		return todosData;
	}

	var route$ = Rx.Observable.just('/').merge(Intent.get('changeRoute$'));

	var clearInputMod$ = Intent.get('clearInput$')
		.map(function () {
			return function (todosData) {
				todosData.input = '';
				return todosData;
			}
		});

	var insertTodoMod$ = Intent.get('insertTodo$')
		.map(function (todoTitle) {
			return function (todosData) {
				var lastId = todosData.list.length > 0 ?
					todosData.list[todosData.list.length - 1].id :
					0;
				todosData.list.push({
					id: lastId + 1,
					title: todoTitle,
					completed: false
				});
				todosData.input = '';
				return todosData;
			};
		});

	var editTodoMod$ = Intent.get('editTodo$')
		.map(function (evdata) {
			return function (todosData) {
				var todoIndex = searchTodoIndex(todosData.list, evdata.id);
				todosData.list[todoIndex].title = evdata.content;
				return todosData;
			}
		});

	var toggleTodoMod$ = Intent.get('toggleTodo$')
		.map(function (todoid) {
			return function (todosData) {
				var todoIndex = searchTodoIndex(todosData.list, todoid);
				var previousCompleted = todosData.list[todoIndex].completed;
				todosData.list[todoIndex].completed = !previousCompleted;
				return todosData;
			}
		});

	var toggleAllMod$ = Intent.get('toggleAll$')
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

	var deleteTodoMod$ = Intent.get('deleteTodo$')
		.map(function (todoid) {
			return function (todosData) {
				var todoIndex = searchTodoIndex(todosData.list, todoid);
				todosData.list.splice(todoIndex, 1);
				return todosData;
			}
		});

	var deleteCompletedsMod$ = Intent.get('deleteCompleteds$')
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
		clearInputMod$, deleteCompletedsMod$, editTodoMod$
	);

	return {
		todos$: modifications$
			.merge(Initial.get('todosData$'))
			.scan(function (todosData, modFn) { return modFn(todosData); })
			.combineLatest(route$, determineFilter)
			.share()
	}
});
