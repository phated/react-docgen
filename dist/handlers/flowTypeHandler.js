"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = flowTypeHandler;

var _astTypes = require("ast-types");

var _flowUtilityTypes = require("../utils/flowUtilityTypes");

var _getFlowType = _interopRequireDefault(require("../utils/getFlowType"));

var _getFlowTypeFromReactComponent = _interopRequireWildcard(require("../utils/getFlowTypeFromReactComponent"));

var _getPropertyName = _interopRequireDefault(require("../utils/getPropertyName"));

var _getTSType = _interopRequireDefault(require("../utils/getTSType"));

var _resolveToValue = _interopRequireDefault(require("../utils/resolveToValue"));

var _setPropDescription = _interopRequireDefault(require("../utils/setPropDescription"));

/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */
function setPropDescriptor(documentation, path, typeParams, importer) {
  if (_astTypes.namedTypes.ObjectTypeSpreadProperty.check(path.node)) {
    const argument = (0, _flowUtilityTypes.unwrapUtilityType)(path.get('argument'));

    if (_astTypes.namedTypes.ObjectTypeAnnotation.check(argument.node)) {
      (0, _getFlowTypeFromReactComponent.applyToFlowTypeProperties)(documentation, argument, (propertyPath, innerTypeParams) => {
        setPropDescriptor(documentation, propertyPath, innerTypeParams, importer);
      }, typeParams, importer);
      return;
    }

    const name = argument.get('id').get('name');
    const resolvedPath = (0, _resolveToValue.default)(name, // TODO: Make this configurable with a pragma comment?
    importer);

    if (resolvedPath && _astTypes.namedTypes.TypeAlias.check(resolvedPath.node)) {
      const right = resolvedPath.get('right');
      (0, _getFlowTypeFromReactComponent.applyToFlowTypeProperties)(documentation, right, (propertyPath, innerTypeParams) => {
        setPropDescriptor(documentation, propertyPath, innerTypeParams, importer);
      }, typeParams, importer);
    } else if (!argument.node.typeParameters) {
      documentation.addComposes(name.node.name);
    }
  } else if (_astTypes.namedTypes.ObjectTypeProperty.check(path.node)) {
    const type = (0, _getFlowType.default)(path.get('value'), typeParams, importer);
    const propName = (0, _getPropertyName.default)(path, importer);
    if (!propName) return;
    const propDescriptor = documentation.getPropDescriptor(propName);
    propDescriptor.required = !path.node.optional;
    propDescriptor.flowType = type; // We are doing this here instead of in a different handler
    // to not need to duplicate the logic for checking for
    // imported types that are spread in to props.

    (0, _setPropDescription.default)(documentation, path, importer);
  } else if (_astTypes.namedTypes.TSPropertySignature.check(path.node)) {
    const type = (0, _getTSType.default)(path.get('typeAnnotation'), typeParams, importer);
    const propName = (0, _getPropertyName.default)(path, importer);
    if (!propName) return;
    const propDescriptor = documentation.getPropDescriptor(propName);
    propDescriptor.required = !path.node.optional;
    propDescriptor.tsType = type; // We are doing this here instead of in a different handler
    // to not need to duplicate the logic for checking for
    // imported types that are spread in to props.

    (0, _setPropDescription.default)(documentation, path, importer);
  }
}
/**
 * This handler tries to find flow Type annotated react components and extract
 * its types to the documentation. It also extracts docblock comments which are
 * inlined in the type definition.
 */


function flowTypeHandler(documentation, path, importer) {
  const flowTypesPath = (0, _getFlowTypeFromReactComponent.default)(path, importer);

  if (!flowTypesPath) {
    return;
  }

  (0, _getFlowTypeFromReactComponent.applyToFlowTypeProperties)(documentation, flowTypesPath, (propertyPath, typeParams) => {
    setPropDescriptor(documentation, propertyPath, typeParams, importer);
  }, null, importer);
}