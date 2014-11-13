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
	// TODO replace this with merge objects function
	if (typeof initialTodosData.list === 'undefined') {
		initialTodosData.list = defaultTodosData.list;
	}
	if (typeof initialTodosData.input === 'undefined') {
		initialTodosData.input = defaultTodosData.input;
	}
	if (typeof initialTodosData.filter === 'undefined') {
		initialTodosData.filter = defaultTodosData.filter;
	}
	if (typeof initialTodosData.filterFn === 'undefined') {
		initialTodosData.filterFn = defaultTodosData.filterFn;
	}
	return {
		todosData$: Rx.Observable.just(initialTodosData)
	};
});
