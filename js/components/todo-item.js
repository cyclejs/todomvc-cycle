'use strict';
/*global Cycle */

Cycle.registerCustomElement('todo-item', function (User, Properties) {
	var Model = Cycle.createModel(function (Intent, Properties) {
		return {
			id$: Properties.get('todoid$').shareReplay(1),
			content$: Properties.get('content$').startWith(''),
			completed$: Properties.get('completed$').startWith(false),
			editing$: Rx.Observable.merge(
				Intent.get('startEdit$').map(function () { return true; }),
				Intent.get('stopEdit$').map(function () { return false; })
			).startWith(false)
		};
	});

	var View = Cycle.createView(function (Model) {
		return {
			vtree$: Rx.Observable.combineLatest(
				Model.get('id$'),
				Model.get('content$'),
				Model.get('completed$'),
				Model.get('editing$'),
				function (id, content, completed, editing) {
					var classes = (completed ? '.completed' : '') +
						(editing ? '.editing' : '');
					return h('li.todoRoot' + classes, [
						h('div.view', [
							h('input.toggle', {
								type: 'checkbox',
								checked: Cycle.vdomPropHook(function (elem) {
									elem.checked = completed;
								})
							}),
							h('label', content),
							h('button.destroy')
						]),
						h('input.edit', {
							type: 'text',
							value: Cycle.vdomPropHook(function (element) {
								element.value = content;
								if (editing) {
									element.focus();
									element.selectionStart = element.value.length;
								}
							})
						})
					]);
				}
			)
		};
	});

	var Intent = Cycle.createIntent(function (User) {
		function toEmptyString() {
			return '';
		}

		return {
			destroy$: User.event$('.destroy', 'click'),
			toggle$: User.event$('.toggle', 'change'),
			startEdit$: User.event$('label', 'dblclick').map(toEmptyString),
			stopEdit$: User.event$('.edit', 'keyup')
				.filter(function (ev) {
					return ev.keyCode === ESC_KEY || ev.keyCode === ENTER_KEY;
				})
				.merge(User.event$('.edit', 'blur'))
				.map(function (ev) { return ev.currentTarget.value; })
				.share()
		};
	});

	User.inject(View).inject(Model).inject(Intent, Properties)[0].inject(User);

	return {
		destroy$: Intent.get('destroy$')
			.withLatestFrom(Model.get('id$'), function (ev, id) { return id; }),
		toggle$: Intent.get('toggle$')
			.withLatestFrom(Model.get('id$'), function (ev, id) { return id; }),
		newContent$: Intent.get('stopEdit$')
			.withLatestFrom(Model.get('id$'), function (content, id) {
				return {content: content, id: id};
			})
	};
});