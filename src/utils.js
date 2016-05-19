import {Observable} from 'rx'
import raf from 'raf'

class PropertyHook {
  constructor(fn) {
    this.fn = fn;
  }

  hook() {
    this.fn.apply(this, arguments);
  }
}

function propHook(fn) {
  return new PropertyHook(fn);
}

const ENTER_KEY = 13;
const ESC_KEY = 27;

function batchUpdate (dom$) {
  return dom$
    .flatMapLatest(dom => Observable
      .fromEventPattern(
        callback => raf(() => callback(dom)),
        (_, handler) => raf.cancel(handler)
      ).first()
    )
}

export {propHook, batchUpdate, ENTER_KEY, ESC_KEY};
