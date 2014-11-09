'use strict';
/*global Cycle */

var h = Cycle.h;

var TodosView = Cycle.defineView(['todos$'], function (model) {
	return {
		events: ['newTodoKeyUp$'],
		vtree$: model.todos$
			.map(function (todos) {
				return h('div', [
					h('header#header', [
						h('input#new-todo', {
							attributes: {placeholder: 'What needs to be done?'},
							'ev-keyup': 'newTodoKeyUp$'
						})
					]),
					h('section#main')
				])
			})
	}
});
