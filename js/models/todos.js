'use strict';
/*global Cycle */

var IntentInterface = ['insertTodo$', 'deleteTodo$', 'toggleTodo$',
	'toggleAll$', 'clearInput$', 'deleteCompleteds$'
];

// The default filter function
function allowAnything() {
	return true;
}

function determineFilterWithRoute(todosData, route) {
	todosData.filter = route.replace('/', '').trim();
	switch (route) {
		case '/active':
			todosData.filterFn = function (todoData) {
				return todoData.completed === false;
			};
			break;
		case '/completed':
			todosData.filterFn = function (todoData) {
				return todoData.completed === true;
			};
			break;
		default:
			todosData.filterFn = allowAnything;
			break;
	}
	return todosData;
}

function determineTodosIndexes(todosData) {
	todosData.list.forEach(function(todoData, index) {
		todoData.index = index;
	});
	return todosData;
}

function applyModificationOnTodosData(todosData, modification) {
	return modification(todosData);
}

var storedTodosData = localStorage.getItem('todos-cycle');

var initialTodosData = storedTodosData ? JSON.parse(storedTodosData) : {
	list: [],
	input: '',
	filter: '',
	filterFn: allowAnything
};

var TodosModel = Cycle.defineModel(IntentInterface, function (intent) {
	var route$ = Rx.Observable.fromEvent(window, 'hashchange')
		.map(function (event) {
			return event.newURL.match(/\#[^\#]*$/)[0].replace('#', '');
		})
		.startWith(window.location.hash.replace('#', ''));
	var insertTodoMod$ = intent.insertTodo$
		.map(function (todoTitle) {
			return function (todosData) {
				todosData.list.push({title: todoTitle, completed: false});
				todosData.input = '';
				return todosData;
			}
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
		clearInputMod$, deleteCompletedsMod$
	);
	return {
		todos$: modifications$
			.startWith(initialTodosData)
			.scan(applyModificationOnTodosData)
			.map(determineTodosIndexes)
			.combineLatest(route$, determineFilterWithRoute)
			.doOnNext(function (todosData) {
				localStorage.setItem('todos-cycle', JSON.stringify(todosData))
			})
	}
});
