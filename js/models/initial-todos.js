'use strict';
/*global Cycle */

function merge() {
	var result = {};
	for (var i = 0; i < arguments.length; i++) {
		var object = arguments[i];
		for (var key in object) {
			if (object.hasOwnProperty(key)) {
				result[key] = object[key];
			}
		}
	}
	return result;
}

var InitialTodosModel = Cycle.defineModel(function () {
	var defaultTodosData = {
		list: [],
		input: '',
		filter: '',
		filterFn: function () { return true; } // allow anything
	};
	var storedTodosData = JSON.parse(localStorage.getItem('todos-cycle')) || {};
	var initialTodosData = merge(defaultTodosData, storedTodosData);
	return {
		todosData$: Rx.Observable.just(initialTodosData)
	};
});
