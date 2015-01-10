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
					index: todoData.index
				};
			})
		};
		localStorage.setItem('todos-cycle', JSON.stringify(savedTodosData))
	});
});
