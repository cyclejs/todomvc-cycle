'use strict';
/*global Cycle */

var InitialTodosModel = Cycle.defineModel(function () {
	var storedTodosData = localStorage.getItem('todos-cycle');
	var defaultTodosData = {
		list: [],
		input: '',
		filter: '',
		filterFn: function () { return true; } // allow anything
	};
	var initialTodosData = storedTodosData ?
		JSON.parse(storedTodosData) :
		defaultTodosData;
	return {
		todosData$: Rx.Observable.just(initialTodosData)
	};
});
