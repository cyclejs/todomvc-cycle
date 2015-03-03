'use strict';
/*global Cycle */

var LocalStorageSink = Cycle.createDataFlowSink(function (todosModel) {
	// Observe all todos data and save them to localStorage
	return todosModel.get('todos$').subscribe(function (todosData) {
		var savedTodosData = {
			list: todosData.list.map(function (todoData) {
				return {
					title: todoData.title,
					completed: todoData.completed,
					id: todoData.id
				};
			})
		};
		localStorage.setItem('todos-cycle', JSON.stringify(savedTodosData))
	});
});
