'use strict';
/*global Cycle */

var TodosModel = Cycle.defineModel([], function (intent) {
	return {
		todos$: Rx.Observable.just([])
	}
});
