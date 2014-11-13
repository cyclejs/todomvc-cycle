'use strict';

// Observe all todos data and save them to localStorage
TodosModel.todos$.subscribe(function (todosData) {
	console.log('saving.');
	console.dir(todosData);
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
