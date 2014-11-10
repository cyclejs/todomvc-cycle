'use strict';
/*global Cycle */

var IntentInterface = ['insertTodo$', 'deleteTodo$'];

var TodosModel = Cycle.defineModel(IntentInterface, function (intent) {
	var insertTodoMod$ = intent.insertTodo$
		.map(function (todoTitle) {
			return function (todosData) {
				todosData.list.push({title: todoTitle});
				todosData.input = '';
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
	var modifications$ = insertTodoMod$.merge(deleteTodoMod$);
	return {
		todos$: modifications$
			.startWith({list: [], input: ''})
			.scan(function (todosData, modification) {
				return modification(todosData);
			})
	}
});
