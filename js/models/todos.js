'use strict';
/*global Cycle */

var IntentInterface = ['insertTodo$', 'deleteTodo$', 'toggleTodo$'];

var TodosModel = Cycle.defineModel(IntentInterface, function (intent) {
	var insertTodoMod$ = intent.insertTodo$
		.map(function (todoTitle) {
			return function (todosData) {
				todosData.list.push({title: todoTitle, completed: false});
				todosData.input = '';
				return todosData;
			}
		});
	var toggleTodo$ = intent.toggleTodo$
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
	var modifications$ = Rx.Observable.merge(
		insertTodoMod$, deleteTodoMod$, toggleTodo$
	);
	return {
		todos$: modifications$
			.startWith({list: [], input: ''})
			.scan(function (todosData, modification) {
				return modification(todosData);
			})
	}
});
