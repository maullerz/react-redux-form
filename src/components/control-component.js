import actions from '../actions';
import _get from '../utils/get';
import getFieldFromState from '../utils/get-field-from-state';
import createControlClass from './control-component-factory';

const defaultStrategy = {
  get: _get,
  getFieldFromState,
  actions,
};


export {
  createControlClass,
};
export default createControlClass(defaultStrategy);
