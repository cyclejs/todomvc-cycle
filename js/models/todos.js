'use strict';
/*global Cycle */

var IntentInterface = ['insertTodo$'];

var TodosModel = Cycle.defineModel(IntentInterface, function (intent) {
	var insertTodoMod$ = intent.insertTodo$
		.map(function (todoTitle) {
			return function (todosData) {
				todosData.list.push({title: todoTitle});
				todosData.input = '';
				return todosData;
			}
		});
	var modifications$ = insertTodoMod$;
	return {
		todos$: modifications$
			.startWith({list: [], input: ''})
			.scan(function (todosData, modification) {
				return modification(todosData);
			})
	}
});
