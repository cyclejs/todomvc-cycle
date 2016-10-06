import sampleCombine from 'xstream/extra/sampleCombine';

export default function viewModel(state$, taskVNodes$) {
  return taskVNodes$.compose(sampleCombine(state$))
    .map(([taskVNodes, state]) => {
      const visibleVNodes = state.list
        .map((task, i) => state.filterFn(task) ? taskVNodes[i] : null)
        .filter(vnode => vnode !== null);

      return {
        ...state,
        taskVNodes: visibleVNodes,
      };
    });
}

